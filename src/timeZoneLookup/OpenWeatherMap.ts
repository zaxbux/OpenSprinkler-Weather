import { ConfigurationError } from '@/errors';
import { GeoCoordinates } from '@/types';
import { AbstractTimeZoneLookup, TimeZoneLookupOptions } from './AbstractTimeZoneLookup';

interface OpenWeatherMapOptions extends TimeZoneLookupOptions {
	apiKey: string
}

export class OpenWeatherMap extends AbstractTimeZoneLookup<OpenWeatherMapOptions> {

	public constructor(options: OpenWeatherMapOptions) {
		super(options);
	}

	async getTimeZoneId(coordinates: GeoCoordinates) {
		const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${coordinates[0]}&lon=${coordinates[1]}&exclude=current,minutely,hourly,daily,alerts&appid=${this.options.apiKey}`)

		if (response.status !== 200) {
			throw new Error(`OpenWeatherMap API Error (${response.statusText})`)
		}

		const data = await response.json<{ timezone: string }>()

		return data.timezone
	}
}


export default (env: Env) => {
	const { OWM_API_KEY } = env
	if (!OWM_API_KEY) {
		throw new ConfigurationError(`OWM_API_KEY is undefined`)
	}

	return new OpenWeatherMap({ apiKey: OWM_API_KEY })
}