import { GeoCoordinates } from '@/types';

/** Information about the data file parsed from the file header. */
export interface FileMeta {
	version: number;
	/** The width of the image (in pixels). */
	width: number;
	/** The height of the image (in pixels). */
	height: number;
	/** The number of bits used for each pixel. */
	bitDepth: number;
	/** The ETo that a pixel value of 0 represents (in inches/year). */
	minimumETo: number;
	/** The ratio of an increase in pixel value to an increase in ETo (in inches/year). */
	scalingFactor: number;
	/**
	 * The pixel coordinates of the geographic coordinates origin. These coordinates are off-center because the original
	 * image excludes the northernmost 10 degrees and the southernmost 30 degrees.
	 */
	origin: {
		x: number;
		y: number;
	};
}

export abstract class ETo {
	static readonly HEADER_OFFSET = 32
	static readonly MAX_VERSION = 1
	FILE_META?: FileMeta

	constructor() {
		//this.FILE_META = fileMeta
	}

	/**
	 * Retrieves the average daily potential ETo for the specified location.
	 * @param coordinates The location to retrieve the ETo for.
	 * @return A Promise that will be resolved with the average potential ETo (in inches per day), or rejected with an error
	 * (which may include a message and the appropriate HTTP status code to send the user) if the ETo cannot be retrieved.
	 */
	async calculateAverageDailyETo(coordinates: GeoCoordinates): Promise<number> {
		if (!this.FILE_META) {
			throw new EToError(`Baseline ETo is not initialized.`)
		}

		// Convert geographic coordinates into image coordinates.
		const x = Math.floor(this.FILE_META.origin.x + this.FILE_META.width * coordinates[1] / 360);
		// Account for the 30+10 cropped degrees.
		const y = Math.floor(this.FILE_META.origin.y - this.FILE_META.height * coordinates[0] / (180 - 30 - 10));

		// The offset (from the start of the data block) of the relevant pixel.
		const offset = y * this.FILE_META.width + x;

		/* Check if the specified coordinates were invalid or correspond to a part of the map that was cropped. */
		if (offset < 0 || offset > this.FILE_META.width * this.FILE_META.height) {
			throw new EToOutOfBoundsError(`Specified location is out of bounds.`)
		}

		let byte: number;
		try {
			// Skip the 32 byte header.
			byte = await this.getByteAtOffset(offset + ETo.HEADER_OFFSET);
		} catch (err) {
			console.error(`An error occurred while reading the baseline ETo data file for coordinates ${coordinates}:`, err);
			throw new EToError(`An unexpected error occurred while retrieving the baseline ETo for this location.`)
		}

		// The maximum value indicates that no data is available for this point.
		if ((byte === (1 << this.FILE_META.bitDepth) - 1)) {
			throw new EToDataUnavailableError(`ETo data is not available for this location.`)
		}

		return (byte * this.FILE_META.scalingFactor + this.FILE_META.minimumETo) / 365;
	}

	abstract readFileHeader(): Promise<void>

	/**
	 * Returns the byte at the specified offset in the baseline ETo data file.
	 * @param offset The offset from the start of the file (the start of the header, not the start of the data block).
	 * @return A Promise that will be resolved with the unsigned representation of the byte at the specified offset, or
	 * rejected with an Error if an error occurs.
	 */
	abstract getByteAtOffset(offset: number): Promise<number>
}

export class EToError extends Error { }
export class EToOutOfBoundsError extends EToError { }
export class EToDataUnavailableError extends EToError { }