import { TimeZoneLookupService } from '@/constants';
import { ConfigurationError } from '@/errors';
import { AbstractTimeZoneLookup } from './AbstractTimeZoneLookup';
import { Static } from './Static';

/**
 * @returns An instance of the configured Time Zone Lookup Provider.
 *
 * @throws {@link ConfigurationError}
 * This exception is thrown if the configuration is invalid.
 */
export const getTimeZoneLookup = async (env: Env): Promise<AbstractTimeZoneLookup> => {
	const { TIMEZONE_LOOKUP } = env
	switch (TIMEZONE_LOOKUP as string) {
		case TimeZoneLookupService.GeoTZ:
			return (await import('@/timeZoneLookup/geoTz')).default(env)
		case TimeZoneLookupService.OpenWeatherMap:
			return (await import('@/timeZoneLookup/OpenWeatherMap')).default(env)
		case TimeZoneLookupService.GoogleMaps:
			return (await import('@/timeZoneLookup/GoogleMaps')).default(env)
	}

	if (env.TIMEZONE_ID) {
		return new Static({ timeZoneId: env.TIMEZONE_ID })
	}

	throw new ConfigurationError(`Unknown timezone lookup (${env.TIMEZONE_LOOKUP})`)
}