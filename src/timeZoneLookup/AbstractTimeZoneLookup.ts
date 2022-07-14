import { GeoCoordinates } from '@/types'
import moment from 'moment'

export interface TimeZoneLookupOptions {
	cache?: CacheStorage
}

export abstract class AbstractTimeZoneLookup<T extends TimeZoneLookupOptions = TimeZoneLookupOptions> {
	readonly options: T

	constructor(options: T) {
		this.options = options
	}

	abstract getTimeZoneId(coordinates: GeoCoordinates): Promise<string>

	public async getTimeZoneOffset(coordinates: GeoCoordinates) {
		return moment().tz(await this.getTimeZoneId(coordinates)).utcOffset()
	}
}