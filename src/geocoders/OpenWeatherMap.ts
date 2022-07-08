import { GeoCoordinates } from "@/types";
import { LocationServiceApiError, NoLocationFoundError } from "@/errors";
import { httpJSONRequest } from '@/http';
import { AbstractGeocoder, GeocoderOptions } from './AbstractGeocoder';

type OpenWeatherMap_Geocoding_API_Response = {
	name: string
	local_names: Record<string, string>
	lat: number
	lon: number
	country: string
}[]

/**
 * Open Weather Map Geocoder
 */
export default class OpenWeatherMap extends AbstractGeocoder {
	private readonly API_KEY: string;

	public constructor(apiKey: string, options: GeocoderOptions) {
		super(options);
		this.API_KEY = apiKey;
	}

	public async geocodeLocation(location: string): Promise<GeoCoordinates> {
		let data;
		try {
			const limit = 5
			data = await httpJSONRequest<OpenWeatherMap_Geocoding_API_Response>(`http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=${limit}&appid=${this.API_KEY}`);
		} catch (err) {
			// If the request fails, indicate no data was found.
			throw new LocationServiceApiError();
		}

		if (!data.length) {
			throw new NoLocationFoundError();
		}

		return [
			data[0].lat,
			data[0].lon
		];
	}

	protected enableCache() {
		return true
	}
}
