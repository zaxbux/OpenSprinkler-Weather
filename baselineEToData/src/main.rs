use tracing::{event, Level};

use bincode::{config, Decode, Encode};
use byteorder::{NativeEndian, ReadBytesExt};
use clap::Parser;
use std::clone::Clone;
use std::{
    fs::{remove_file, rename, File},
    io::{Read, Seek, SeekFrom, Write},
    path::Path,
    time::Instant,
};

const VERSION: u8 = 1;
const BIT_DEPTH: usize = 8;
const MOD16A3_PET_MAX: u16 = 0xFFF8;

const IMAGE_WIDTH: usize = 43200;
const IMAGE_HEIGHT: usize = 16800;
const MASK_WIDTH: usize = 10800;
const MASK_HEIGHT: usize = 5400;

const HEADER_SIZE: usize = 32;

const CROPPED_TOP_PIXELS: usize = MASK_WIDTH * MASK_HEIGHT * 10 / 180;

struct FileMeta {
    /// Minimum pixel value
    min: u32,
    /// Maximum pixel value
    max: u32,
}

struct PixelStats {
    filled: u64,
    unfilled: u64,
    water: u64,
}

#[derive(Encode, Decode, PartialEq, Debug)]
struct Header {
    version: u8,
    width: u32,
    height: u32,
    bit_depth: u8,
    minimum_eto: f32,
    scaling_factor: f32,
    reserved: [u8; 15],
}

#[derive(Parser)]
struct CliArgs {
    /// Minimum pixel value
    #[clap(long = "min", requires = "max", takes_value = true)]
    min: Option<u32>,

    /// Maximum pixel value
    #[clap(long = "max", requires = "min", takes_value = true)]
    max: Option<u32>,

    /// The path to the MOD16A3 file to read
    #[clap(
        parse(from_os_str),
        short = 'e',
        long = "mod16",
        default_value = "MOD16A3_PET_2000_to_2013_mean.bin"
    )]
    mod16: std::path::PathBuf,

    /// The path to the file to read

    #[clap(
        parse(from_os_str),
        short = 'i',
        long = "input",
        default_value = "Baseline_ETo_Data_Reduced.bin"
    )]
    input: std::path::PathBuf,

    /// The path to the file to read
    #[clap(
        parse(from_os_str),
        short = 'o',
        long = "output",
        default_value = "Baseline_ETo_Data.bin"
    )]
    output: std::path::PathBuf,

    /// The path to the file to read
    #[clap(
        parse(from_os_str),
        short = 'm',
        long = "mask",
        default_value = "Ocean_Mask.bin"
    )]
    mask: std::path::PathBuf,

    /// Number of passes
    #[clap(short = 'n', long = "passes", default_value = "20")]
    passes: u8,

    /// Clean files before starting
    #[clap(long = "clean", takes_value = false)]
    clean: bool,
}

fn write_header(file: &mut File, meta: &FileMeta) -> usize {
    let header = Header {
        version: VERSION,
        width: IMAGE_WIDTH as u32,
        height: IMAGE_HEIGHT as u32,
        bit_depth: BIT_DEPTH as u8,
        minimum_eto: (meta.min as f32) * 0.1,
        scaling_factor: get_scale(meta) * 0.1,
        reserved: [0u8; 15],
    };

    return bincode::encode_into_std_write(
        &header,
        file,
        config::standard()
            .with_big_endian()
            .with_limit::<HEADER_SIZE>(),
    )
    .unwrap();
}

fn get_scale(meta: &FileMeta) -> f32 {
    return (meta.max - meta.min + 1) as f32 / 256.0;
}

fn find_pixel_range(path: &Path) -> Result<FileMeta, Box<dyn std::error::Error>> {
    let mut buf = [0u16; IMAGE_WIDTH];
    let mut reader = File::open(path)?;
    let mut min_value: u16 = 0xFFFF;
    let mut max_value: u16 = 0x0000;

    for y in 0..IMAGE_HEIGHT {
        if y % 1000 == 0 {
            println!("Finding pixel range on row {}...", y)
        }

        reader.read_u16_into::<NativeEndian>(&mut buf)?;

        for x in 0..IMAGE_WIDTH / 2 {
            let pixel = buf[x];

            if pixel > MOD16A3_PET_MAX {
                continue;
            }

            min_value = std::cmp::min(pixel, min_value);
            max_value = std::cmp::max(pixel, max_value);
        }
    }

    let meta = FileMeta {
        min: min_value as u32,
        max: max_value as u32,
    };

    println!(
        "Found pixel range [{}, {}] with scaling factor {}",
        meta.min,
        meta.max,
        get_scale(&meta)
    );

    Ok(meta)
}

fn reduce_bit_depth(
    input: &Path,
    output: &Path,
    meta: &FileMeta,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut reader = File::open(input)?;
    let mut reader_buf = [0u16; IMAGE_WIDTH];

    let mut writer = File::create(output).expect("Failed to open output file for writing");
    let mut writer_buf = [0u8; IMAGE_WIDTH];

    let mut total_bytes = write_header(&mut writer, meta);

    for y in 0..IMAGE_HEIGHT {
        if y % 1000 == 0 {
            println!("Reducing bit depth on row {}...", y)
        }

        reader.read_u16_into::<NativeEndian>(&mut reader_buf)?;

        for x in 0..IMAGE_WIDTH {
            let pixel = reader_buf[x];
            let pixel_reduced: u8 = if pixel > MOD16A3_PET_MAX {
                0xFF
            } else {
                ((pixel - meta.min as u16) as f32 / get_scale(&meta)) as u8
            };

            writer_buf[x] = pixel_reduced;
        }

        total_bytes += writer.write(&writer_buf).expect("Error writing pixel.");
    }

    event!(Level::DEBUG, "Wrote {} bytes", total_bytes);

    Ok(())
}

fn check_neighbor_bounds(x: i64, y: i64) -> bool {
    return x < 0 || x >= IMAGE_WIDTH as i64 || y < 0 || y >= IMAGE_HEIGHT as i64;
}

fn fill_missing_pixels(
    pass: u8,
    meta: &FileMeta,
    input: &Path,
    output: &Path,
    mask: &Path,
) -> Result<PixelStats, Box<dyn std::error::Error>> {
    let file_size = input.metadata()?.len();
    let expected_size = IMAGE_WIDTH * IMAGE_HEIGHT + HEADER_SIZE;
    if file_size != expected_size as u64 {
        println!(
            "Size of input ({}) does not match expected ({}).",
            file_size, expected_size
        );
        panic!();
    }
    let mut reader_input = File::open(input).expect("Error opening input.");

    // Skip header
    reader_input.seek(SeekFrom::Start(HEADER_SIZE as u64))?;

    let mut writer = File::create(output)?;
    let mut writer_buf = [0u8; IMAGE_WIDTH];

    // Write output header
    write_header(&mut writer, meta);

    let mut reader_mask = File::open(mask)?;
    let mut reader_mask_buf = [0u8; MASK_WIDTH];

    let mut rows = [[0u8; IMAGE_WIDTH]; 5];

    // Read the first two rows into the last indices of the temporary row
    for i in 3..=4 {
        reader_input.read_exact(&mut rows[i])?;
    }

    let mut statistics = PixelStats {
        filled: 0,
        unfilled: 0,
        water: 0,
    };

    for y in 0..IMAGE_HEIGHT {
        if y % 1000 == 0 {
            println!("Interpolating missing pixels; pass {}, row {}...", pass+1, y);
        }

        // Read a row from the mask
        let reader_mask_offset = y / (IMAGE_WIDTH / MASK_WIDTH) * MASK_WIDTH + CROPPED_TOP_PIXELS;
        reader_mask
            .seek(SeekFrom::Start(reader_mask_offset as u64))
            .expect("Error seeking on mask file");
        reader_mask
            .read_exact(&mut reader_mask_buf)
            .expect("Error reading mask file");

        // Shift rows
        for i in 1..5 {
            rows[i - 1] = rows[i];
        }

        // Read the nest row (if it exists)
        if y < IMAGE_HEIGHT - 2 {
            reader_input
                .read_exact(&mut rows[4])
                .expect("Error reading input file");
        }

        // Interpolate
        for x in 0..IMAGE_WIDTH {
            let mut pixel = rows[2][x];
            let mask_x = x / (IMAGE_WIDTH / MASK_WIDTH);

            if reader_mask_buf[mask_x] > 128 {
                if pixel == 0xFF {
                    let mut total_weight: i64 = 0;
                    let mut total_neighbor: i64 = 0;

                    for i in -2..=2 {
                        for j in -2..=2 {
                            let neighbor_x: i64 = x as i64 + i;
                            let neighbor_y: i64 = y as i64 + j;

                            if check_neighbor_bounds(neighbor_x, neighbor_y) {
                                continue;
                            }

                            let neighbour_pixel = rows[(2 + j) as usize][neighbor_x as usize];

                            if neighbour_pixel == 0xFF {
                                continue;
                            }

                            let weight = 5 - (i.abs() + j.abs()) as i64;
                            total_neighbor += weight * (neighbour_pixel as i64);
                            total_weight += weight;
                        }
                    }

                    if total_weight > 11 {
                        pixel = (total_neighbor / total_weight) as u8;
                        statistics.filled += 1;
                    } else {
                        statistics.unfilled += 1;
                    }
                }
            } else {
                statistics.water += 1;
            }

            writer_buf[x] = pixel;
        }

        writer
            .write(&writer_buf)
            .expect("Error writing output file.");
    }

    Ok(statistics)
}

fn main() {
    let args: CliArgs = CliArgs::parse();

    if args.clean {
        println!("Cleaning...");
        if remove_file(&args.input).is_ok() {
            println!("Removed input file {}", args.input.display());
        }
        if remove_file(&args.output).is_ok() {
            println!("Removed output file {}", args.output.display());
        }
    }

    let meta = if args.min.is_some() && args.min.is_some() {
        FileMeta {
            min: args.min.unwrap(),
            max: args.max.unwrap(),
        }
    } else {
        find_pixel_range(&args.mod16).unwrap()
    };

    if args.input.exists() {
        println!(
            "Input file \"{} exists, skipping bit depth reduction\"",
            args.input.to_str().unwrap()
        );
    } else {
        reduce_bit_depth(&args.mod16, &args.input, &meta).expect("Error reducing bit depth");
    }

    if args.passes > 0 {
        let mut stats_first_run = PixelStats {
            filled: 0,
            unfilled: 0,
            water: 0,
        };

        let mut statistics = PixelStats {
            filled: 0,
            unfilled: 0,
            water: 0,
        };

        for pass in 0..args.passes {
            let now = Instant::now();
            statistics =
                fill_missing_pixels(pass, &meta, &args.input, &args.output, &args.mask).unwrap();

            if pass == 0 {
                stats_first_run.filled = statistics.filled;
                stats_first_run.unfilled = statistics.unfilled;
                stats_first_run.water = statistics.water;
            }

            println!(
                "Finished pass {} in {} seconds. Filled: {}; Unfilled: {}; Water: {};",
                pass + 1,
                now.elapsed().as_secs(),
                statistics.filled,
                statistics.unfilled,
                statistics.water
            );

            if pass < args.passes - 1 {
                remove_file(&args.input).expect("Could not remove file");
                rename(&args.output, &args.input).expect("Could not rename file");
            }
        }

        println!(
            "Δ filled: {}; Δ unfilled: {}, Δ water: {}",
            stats_first_run.filled - statistics.filled,
            stats_first_run.unfilled - statistics.unfilled,
            stats_first_run.water - statistics.water
        );
    }
}
