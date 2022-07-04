import { find } from "geo-tz";
import { GeoCoordinates } from '@/types'
import { AbstractTimeZoneLookup } from './AbstractTimeZoneLookup';

export class GeoTzTimeZoneLookup extends AbstractTimeZoneLookup {

	async getTimeZoneId(coordinates: GeoCoordinates) {
		// @todo: cache
		return find(coordinates[0], coordinates[1])[0]
	}
}