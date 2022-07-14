import { ConfigurationError } from '@/errors';
import { GeoCoordinates } from '@/types';
import moment from 'moment';
import { AbstractTimeZoneLookup, TimeZoneLookupOptions } from './AbstractTimeZoneLookup';

namespace GoogleMapsTimeZoneAPI {
	export type TimeZoneStatus = 'OK' | 'INVALID_REQUEST' | 'OVER_DAILY_LIMIT' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR' | 'ZERO_RESULTS'

	export interface TimeZoneResponse {
		status: TimeZoneStatus
		dstOffset?: number
		errorMessage?: string
		rawOffset?: number
		timeZoneId?: string
		timeZoneName?: string
	}
}

interface Options extends TimeZoneLookupOptions {
	apiKey: string
}

export class GoogleMaps extends AbstractTimeZoneLookup<Options> {

	public constructor(options: Options) {
		super(options);
	}

	async getTimeZoneId(coordinates: GeoCoordinates) {
		const timestamp = moment().utc().unix()
		const response = await fetch(`https://maps.googleapis.com/maps/api/timezone/json?location=${coordinates[0]},${coordinates[1]}&timestamp=${timestamp}&key=${this.options.apiKey}`)

		if (response.status !== 200) {
			throw new Error(`Google Maps API Error (${response.statusText})`)
		}

		const data = await response.json<GoogleMapsTimeZoneAPI.TimeZoneResponse>()

		if (data.status !== 'OK') {
			throw new Error(`Google Maps API Error (${data.status})`)
		}

		return data.timeZoneId!
	}
}

export default (env: Env) => {
	if (!env.GOOGLE_MAPS_API_KEY) {
		throw new ConfigurationError(`GOOGLE_MAPS_API_KEY is undefined`)
	}
	return new GoogleMaps({ apiKey: env.GOOGLE_MAPS_API_KEY })
}