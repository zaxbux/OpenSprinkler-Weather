import { GeoCoordinates } from '@/types';
import { EToError, EToOutOfBoundsError, EToDataUnavailableError } from './errors';

/** Information about the data file parsed from the file header. */
export interface FileMeta {
	version: number;
	/** The width of the image (in pixels). */
	width: number;
	/** The height of the image (in pixels). */
	height: number;
	/** The number of bits used for each pixel. */
	bitDepth: number;
	/** The ETₒ that a pixel value of 0 represents (in inches/year). */
	minimumETo: number;
	/** The ratio of an increase in pixel value to an increase in ETₒ (in inches/year). */
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

/**
 * Retrieves the baseline reference evapotranspiration (ETₒ) data file and calculates the daily potential ETₒ for a specified location.
 *
 * The {@link AbstractBaselineETo.readFileHeader} method must be called to load the file metadata before calling {@link AbstractBaselineETo.calculateAverageDailyETo}.
 *
 * @abstract
 */
export abstract class AbstractBaselineETo {
	static readonly HEADER_OFFSET = 32
	static readonly MAX_VERSION = 1
	protected fileMetadata?: FileMeta

	/**
	 * Retrieves the average daily potential ETₒ for the specified location.
	 *
	 * @param coordinates Coordinates of the location to retrieve the ETₒ for.
	 * @param precision Number of significant digits.
	 * @return The average potential ETₒ (in inches per day).
	 *
	 * @throws {@link EToError}
	 * This exception is thrown if there was an unexpected error retrieving the ETₒ. An HTTP status of `503` will inform the client to try again later.
	 *
	 * @throws {@link EToDataUnavailableError}
	 * This exception is thrown if the ETₒ is not available for the specified coordinates. An HTTP status of `500` will inform the client that this is a server issue.
	 *
	 * @throws {@link EToOutOfBoundsError}
	 * This exception is thrown if the specified coordinates are out-of-bounds. An HTTP status of `400` will inform the client to try different coordinates.
	 */
	async calculateAverageDailyETo(coordinates: GeoCoordinates, precision?: number): Promise<number> {
		if (!this.fileMetadata) {
			throw new EToError(`Baseline ETₒ is not initialized.`, { statusCode: 503 })
		}

		// Convert geographic coordinates into image coordinates.
		const x = Math.floor(this.fileMetadata.origin.x + this.fileMetadata.width * coordinates[1] / 360);
		// Account for the 30 + 10 cropped degrees.
		const y = Math.floor(this.fileMetadata.origin.y - this.fileMetadata.height * coordinates[0] / (180 - 30 - 10));

		// The offset (from the start of the data block) of the relevant pixel.
		const offset = y * this.fileMetadata.width + x;

		/* Check if the specified coordinates were invalid or correspond to a part of the map that was cropped. */
		if (offset < 0 || offset > this.fileMetadata.width * this.fileMetadata.height) {
			throw new EToOutOfBoundsError(`Specified location is out of bounds.`, { statusCode: 400 })
		}

		let byte: number;
		try {
			byte = await this.getByteAtOffset(offset, true);
		} catch (err) {
			console.error(`An unexpected error occurred while reading the baseline ETₒ data file for coordinates ${coordinates}:`, err);
			throw new EToError(`An unexpected error occurred while retrieving the baseline ETₒ for this location.`, { statusCode: 503 })
		}

		// The maximum value indicates that no data is available for this point.
		if ((byte === (1 << this.fileMetadata.bitDepth) - 1)) {
			throw new EToDataUnavailableError(`ETₒ data is not available for this location.`, { statusCode: 500 })
		}

		const eto = (byte * this.fileMetadata.scalingFactor + this.fileMetadata.minimumETo) / 365
		return precision ? Number.parseFloat(eto.toPrecision(precision)) : eto
	}

	/**
	 * Retrieves metadata about the Baseline Reference Evapotranspiration (ETₒ).
	 *
	 * @throws {@link EToError}
	 * This exception is thrown if there was some error parsing the data file. An HTTP status of `500` will inform the client that this a server issue.
	 *
	 * @throws {@link EToDataUnavailableError}
	 * This exception is thrown if the data file could not be retrieved. An HTTP status of `503` will inform the client to try again later.
	 */
	abstract readFileHeader(): Promise<void>

	/**
	 * Returns the byte at the specified offset in the baseline ETₒ data file.
	 *
	 * @param offset The offset from the start of the file.
	 * @param relative If the specified offset is relative to the start of the header.
	 * @return The unsigned representation of the byte at the specified offset.
	 *
	 * @throws {@link EToError}
	 * This exception is thrown if there was an unexpected error.
	 */
	abstract getByteAtOffset(offset: number, relative: boolean): Promise<number>
}