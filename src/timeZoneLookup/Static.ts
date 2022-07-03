import { GeoCoordinates } from '@/types';
import { TimeZoneLookup, ITimeZoneLookupOptions } from '.';

interface StaticTimezoneOptions extends ITimeZoneLookupOptions {
	timeZoneId: string
}

export class StaticTimeZoneLookup extends TimeZoneLookup<StaticTimezoneOptions> {

	public constructor(options: StaticTimezoneOptions) {
		super(options);
	}

	async getTimeZoneId(coordinates: GeoCoordinates) {
		return this.options.timeZoneId
	}
}