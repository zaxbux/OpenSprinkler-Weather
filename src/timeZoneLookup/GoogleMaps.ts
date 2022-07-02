import { GeoCoordinates } from '@/types';
import moment from 'moment';
import { TimeZoneLookup, ITimeZoneLookupOptions } from '.';

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

interface GoogleMapsTimezoneOptions extends ITimeZoneLookupOptions {
	apiKey: string
}

export class GoogleMapsTimeZoneLookup extends TimeZoneLookup<GoogleMapsTimezoneOptions> {

	public constructor(options: GoogleMapsTimezoneOptions) {
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