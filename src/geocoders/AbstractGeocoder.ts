import { AbstractGeocoderCache } from '@/cache/geocoder/AbstractGeocoderCache';
import { ErrorCode } from '@/constants';
import { CodedError, NoLocationFoundError } from '@/errors';
import { GeoCoordinates } from '@/types';

export interface GeocoderOptions {
	cache: AbstractGeocoderCache
}

export abstract class AbstractGeocoder {

	private options: GeocoderOptions

	public constructor(options: GeocoderOptions) {
		this.options = options
	}

	/**
	 * Converts a location name to geographic coordinates.
	 *
	 * @param location A location name.
	 * @return The {@link GeoCoordinates} of the specified location.
	 *
	 * @throws {CodedError}
	 */
	protected abstract geocodeLocation(location: string): Promise<GeoCoordinates>;

	/**
	 * Converts a location name to geographic coordinates, first checking the cache and updating it if necessary.
	 * @throws {CodedError}
	 */
	public async getLocation(location: string): Promise<GeoCoordinates> {
		if (this.enableCache() && this.options.cache.has(location)) {
			const coords = await this.options.cache.get(location);
			if (!coords || (coords[0] === 0 && coords[1] === 0)) {
				// Throw an error if there are no results for this location.
				throw new NoLocationFoundError();
			} else {
				return coords;
			}
		}

		try {
			const coords = await this.geocodeLocation(location);
			if (this.enableCache()) {
				this.options.cache.set(location, coords);
			}
			return coords;
		} catch (ex) {
			if (ex instanceof CodedError && ex.errCode === ErrorCode.NoLocationFound) {
				// Store in the cache the fact that this location has no results.
				if (this.enableCache()) {
					this.options.cache.set(location, [0, 0])
				}
			}

			throw ex;
		}
	}

	protected abstract enableCache(): boolean
}