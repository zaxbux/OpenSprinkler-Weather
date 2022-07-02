import { GeoCoordinates } from '@/types';

export interface ITimeZoneLookupOptions {
	cache?: CacheStorage
}

export abstract class TimeZoneLookup<T extends ITimeZoneLookupOptions = ITimeZoneLookupOptions> {
	readonly options: T

	constructor(options: T) {
		this.options = options
	}

	abstract getTimeZoneId(coordinates: GeoCoordinates): Promise<string>
}