import { AdjustmentOptions } from '@/adjustmentMethods/AdjustmentMethod';
import { AbstractTimeZoneLookup } from '@/timeZoneLookup/AbstractTimeZoneLookup';
import { GeoCoordinates } from '@/types';

export interface CachedScale {
	scale: number;
	rawData: object;
	rainDelay: number;
}

export interface CachedScaleHash {
	/** The ID of the AdjustmentMethod used to calculate this watering scale. This value should have the appropriate bits set for any restrictions that were used. */
	adjustmentMethodId: number
	/** The coordinates the watering scale was calculated for. */
	coordinates: GeoCoordinates
	/** Any user-specified adjustment options that were used when calculating the watering scale. */
	adjustmentOptions: AdjustmentOptions
}

export interface WateringScaleCacheOptions {
	timeZoneLookup: AbstractTimeZoneLookup
}

export abstract class AbstractWateringScaleCache<O extends WateringScaleCacheOptions = WateringScaleCacheOptions> {
	readonly options: O

	constructor(options: O) {
		this.options = options
	}
	/**
	 * Stores the results of a watering scale calculation.
	 *
	 * The scale will be cached until the end of the day in the local timezone of the specified coordinates.
	 * If a scale has already been cached for the specified calculation parameters, this method will have no effect.
	 * @param hash The parameters to used to key the result.
	 * @param wateringScale The results of the watering scale calculation.
	 */
	public abstract put(hash: CachedScaleHash, wateringScale: CachedScale): Promise<void>

	/**
	 * Retrieves a cached scale that was previously calculated with the given parameters.
	 * @param hash The parameters to used to key the result.
	 * @return The cached result of the watering scale calculation, or undefined if no values were cached.
	 */
	public abstract get(hash: CachedScaleHash): Promise<CachedScale | undefined>
}