import { GeoCoordinates } from "@/types";
import { CodedError, ErrorCode } from "@/errors";

export abstract class GeocoderCache {
	public abstract has(key: string): Promise<boolean>
	public abstract get(key: string): Promise<GeoCoordinates | undefined>
	public abstract set(key: string, value: GeoCoordinates): Promise<void>
}

export interface GeocoderOptions {
	cache: GeocoderCache
}

export abstract class Geocoder {

	private options: GeocoderOptions

	public constructor(options: GeocoderOptions) {
		this.options = options
	}

	/**
	 * Converts a location name to geographic coordinates.
	 * @param location A location name.
	 * @return A Promise that will be resolved with the GeoCoordinates of the specified location, or rejected with a
	 * CodedError.
	 */
	protected abstract geocodeLocation(location: string): Promise<GeoCoordinates>;

	/**
	 * Converts a location name to geographic coordinates, first checking the cache and updating it if necessary.
	 */
	public async getLocation(location: string): Promise<GeoCoordinates> {
		if (this.enableCache() && this.options.cache.has(location)) {
			const coords = await this.options.cache.get(location);
			if (!coords || (coords[0] === 0 && coords[1] === 0)) {
				// Throw an error if there are no results for this location.
				throw new CodedError(ErrorCode.NoLocationFound);
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