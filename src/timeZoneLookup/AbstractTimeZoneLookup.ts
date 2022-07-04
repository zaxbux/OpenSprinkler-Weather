import { GeoCoordinates } from '@/types'

export interface TimeZoneLookupOptions {
	cache?: CacheStorage
}

export abstract class AbstractTimeZoneLookup<T extends TimeZoneLookupOptions = TimeZoneLookupOptions> {
	readonly options: T

	constructor(options: T) {
		this.options = options
	}

	abstract getTimeZoneId(coordinates: GeoCoordinates): Promise<string>
}