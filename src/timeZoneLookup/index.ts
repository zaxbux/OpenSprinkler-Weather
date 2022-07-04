import { Env } from '@/bindings';
import { TimeZoneLookupService } from '@/constants';
import { ConfigurationError } from '@/errors';
import { AbstractTimeZoneLookup } from './AbstractTimeZoneLookup';
import { GoogleMaps } from './GoogleMaps';
import { OpenWeatherMap } from './OpenWeatherMap';
import { Static } from './Static';

export const getTimeZoneLookup = async (env: Env): Promise<AbstractTimeZoneLookup> => {
	const { TIMEZONE_LOOKUP } = env
	switch (TIMEZONE_LOOKUP as string) {
		case TimeZoneLookupService.OpenWeatherMap:
			if (!env.OWM_API_KEY) {
				throw new ConfigurationError(`OWM_API_KEY is undefined`)
			}
			return new OpenWeatherMap({ apiKey: env.OWM_API_KEY })
		case TimeZoneLookupService.GoogleMaps:
			if (!env.GOOGLE_MAPS_API_KEY) {
				throw new ConfigurationError(`GOOGLE_MAPS_API_KEY is undefined`)
			}
			return new GoogleMaps({ apiKey: env.GOOGLE_MAPS_API_KEY })
	}

	if (env.TIMEZONE_ID) {
		return new Static({ timeZoneId: env.TIMEZONE_ID })
	}

	throw new Error(`Unknown timezone lookup (${env.TIMEZONE_LOOKUP})`)
}