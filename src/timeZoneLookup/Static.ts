import { GeoCoordinates } from '@/types';
import { AbstractTimeZoneLookup, TimeZoneLookupOptions } from './AbstractTimeZoneLookup';

interface Options extends TimeZoneLookupOptions {
	timeZoneId: string
}

export class Static extends AbstractTimeZoneLookup<Options> {

	public constructor(options: Options) {
		super(options);
	}

	async getTimeZoneId(coordinates: GeoCoordinates) {
		return this.options.timeZoneId
	}
}