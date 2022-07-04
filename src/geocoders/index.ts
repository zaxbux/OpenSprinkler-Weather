import { Env } from '@/bindings';
import { getGeocoderCache } from '@/cache/geocoder';
import { ErrorCode, GeocoderService, REGEX } from '@/constants';
import { CodedError, ConfigurationError } from '@/errors';
import { GeoCoordinates } from '@/types';
import { AbstractGeocoder } from './AbstractGeocoder';
import GoogleMaps from './GoogleMaps';
import OpenWeatherMap from './OpenWeatherMap';

/**
 * Resolves a location description to geographic coordinates.
 * @param location A partial zip/city/country or a coordinate pair.
 * @return A promise that will be resolved with the coordinates of the best match for the specified location, or
 * rejected with a CodedError if unable to resolve the location.
 * @throws {CodedError}
 */
export async function resolveCoordinates(location: string | null, geocoder: (location: string) => Promise<GeoCoordinates>): Promise<GeoCoordinates> {

	if (!location) {
		throw new CodedError(ErrorCode.InvalidLocationFormat)
	}

	if (REGEX.GPS.test(location)) {
		const [lat, lon] = location.split(",")
		return [parseFloat(lat), parseFloat(lon)]
	} else {
		return geocoder(location)
	}
}

export const getGeocoderProvider = async (env: Env): Promise<AbstractGeocoder> => {
	const { GEOCODER } = env
	const cache = await getGeocoderCache(env)

	switch (GEOCODER as string) {
		case GeocoderService.OpenWeatherMap:
			if (!env.OWM_API_KEY) {
				throw new ConfigurationError(`OWM_API_KEY is undefined`)
			}
			return new OpenWeatherMap(env.OWM_API_KEY, { cache })
		case GeocoderService.GoogleMaps:
			if (!env.GOOGLE_MAPS_API_KEY) {
				throw new ConfigurationError(`GOOGLE_MAPS_API_KEY is undefined`)
			}
			return new GoogleMaps(env.GOOGLE_MAPS_API_KEY, { cache })
	}

	throw new Error(`Unknown geocoder (${env.GEOCODER})`)
}