//import NodeCache from "node-cache";
import { GeoCoordinates, PWS } from "@/types";
import { AdjustmentOptions } from "@/routes/adjustmentMethods/AdjustmentMethod";
import moment from "moment-timezone";
import { TimeZoneLookup } from './timeZoneLookup';

export interface CachedScale {
	scale: number;
	rawData: object;
	rainDelay: number;
}

interface WateringScaleCacheOptions {
	timeZoneLookup: TimeZoneLookup
}

export default class WateringScaleCache {
	readonly options: WateringScaleCacheOptions

	constructor(options: WateringScaleCacheOptions) {
		this.options = options
	}
	/**
	 * Stores the results of a watering scale calculation.
	 *
	 * The scale will be cached until the end of the day in the local timezone of the specified coordinates.
	 * If a scale has already been cached for the specified calculation parameters, this method will have no effect.
	 * @param adjustmentMethodId The ID of the AdjustmentMethod used to calculate this watering scale. This value should
	 * have the appropriate bits set for any restrictions that were used.
	 * @param coordinates The coordinates the watering scale was calculated for.
	 * @param pws The PWS used to calculate the watering scale, or undefined if one was not used.
	 * @param adjustmentOptions Any user-specified adjustment options that were used when calculating the watering scale.
	 * @param wateringScale The results of the watering scale calculation.
	 */
	public async storeWateringScale(
		adjustmentMethodId: number,
		coordinates: GeoCoordinates,
		pws: PWS | undefined,
		adjustmentOptions: AdjustmentOptions,
		wateringScale: CachedScale
	): Promise<void> {
		// The end of the day in the controller's timezone.
		const expirationDate = moment().tz(await this.options.timeZoneLookup.getTimeZoneId(coordinates)).endOf("day");
		const ttl = expirationDate.diff(moment(), 'seconds');
		const key = this.makeKey(adjustmentMethodId, coordinates, pws, adjustmentOptions);
		await caches.default.put(key, new Response(JSON.stringify(wateringScale), { headers: { 'Cache-Control': `max-age=${ttl}` } }))
	}

	/**
	 * Retrieves a cached scale that was previously calculated with the given parameters.
	 * @param adjustmentMethodId The ID of the AdjustmentMethod used to calculate this watering scale. This value should
	 * have the appropriate bits set for any restrictions that were used.
	 * @param coordinates The coordinates the watering scale was calculated for.
	 * @param pws The PWS used to calculate the watering scale, or undefined if one was not used.
	 * @param adjustmentOptions Any user-specified adjustment options that were used when calculating the watering scale.
	 * @return The cached result of the watering scale calculation, or undefined if no values were cached.
	 */
	public async getWateringScale(
		adjustmentMethodId: number,
		coordinates: GeoCoordinates,
		pws: PWS | undefined,
		adjustmentOptions: AdjustmentOptions
	): Promise<CachedScale | undefined> {
		const key = this.makeKey(adjustmentMethodId, coordinates, pws, adjustmentOptions);
		const response = await caches.default.match(key)

		if (response) {
			return await response?.json() as CachedScale
		}

		return undefined
	}

	private makeKey(
		adjustmentMethodId: number,
		coordinates: GeoCoordinates,
		pws: PWS | undefined,
		adjustmentOptions: AdjustmentOptions
	): string {
		return `${adjustmentMethodId}?loc=${coordinates.join(",")}&pws=${pws ? pws.id : ''}&wto=${JSON.stringify(adjustmentOptions)}`
	}
}
