import { find } from "geo-tz";
import { GeoCoordinates } from '@/types'
import { TimeZoneLookup } from '.';

export class GeoTzTimeZoneLookup extends TimeZoneLookup {

	async getTimeZoneId(coordinates: GeoCoordinates) {
		// @todo: cache
		return find(coordinates[0], coordinates[1])[0]
	}
}