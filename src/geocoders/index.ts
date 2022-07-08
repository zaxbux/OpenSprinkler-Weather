import { getGeocoderCache } from '@/cache/geocoder';
import { GeocoderService, REGEX } from '@/constants';
import { ConfigurationError, InvalidLocationFormatError } from '@/errors';
import { GeoCoordinates } from '@/types';
import { AbstractGeocoder } from './AbstractGeocoder';
import GoogleMaps from './GoogleMaps';
import OpenWeatherMap from './OpenWeatherMap';

type RawLocation = Request | URL | URLSearchParams | string | null
type GeocoderFn = (location: string) => Promise<GeoCoordinates>

/**
 * Resolves a location description to geographic coordinates.
 * @param location A partial zip/city/country or a coordinate pair.
 * @return A promise that will be resolved with the coordinates of the best match for the specified location, or
 * rejected with a CodedError if unable to resolve the location.
 * @throws {CodedError}
 */
export async function resolveCoordinates(location: RawLocation, geocoder: GeocoderFn): Promise<GeoCoordinates> {
	if (location instanceof Request) {
		location = new URL(location.url)
	}

	if (location instanceof URL) {
		location = location.searchParams
	}

	if (location instanceof URLSearchParams) {
		location = location.get('loc')
	}

	if (!location) {
		throw new InvalidLocationFormatError()
	}

	// Convert coordinates string to tuple
	if (REGEX.GPS.test(location)) {
		const [lat, lon] = location.split(",")
		return Object.freeze([parseFloat(lat), parseFloat(lon)]) as readonly [number, number]
	}

	// Fetch coordinates from geocoding service
	return geocoder(location)
}

/**
 * Return an instance of the configured Geocoder Provider.
 * @param env
 * @returns
 * @throws {ConfigurationError}
 */
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