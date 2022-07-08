import { GeoCoordinates } from '@/types'
import SunCalc from 'suncalc'

/**
	 * Calculates sunrise/sunset for the specified coordinates.
	 * @param coordinates The coordinates to use to calculate time data.
	 * @param timezoneOffset The UTC timezone offset (in minutes)
	 * @return The TimeData for the specified coordinates.
	 */
export function getSolarTimes(coordinates: GeoCoordinates, timezoneOffset: number) {
	const sunData = SunCalc.getTimes(new Date(), coordinates[0], coordinates[1])

	sunData.sunrise.setUTCMinutes(sunData.sunrise.getUTCMinutes() + timezoneOffset)
	sunData.sunset.setUTCMinutes(sunData.sunset.getUTCMinutes() + timezoneOffset)

	return {
		sunrise: (sunData.sunrise.getUTCHours() * 60 + sunData.sunrise.getUTCMinutes()),
		sunset: (sunData.sunset.getUTCHours() * 60 + sunData.sunset.getUTCMinutes())
	}
}