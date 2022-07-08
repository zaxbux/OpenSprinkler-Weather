import { GeoCoordinates } from "@/types";
import { LocationServiceApiError, NoLocationFoundError } from "@/errors";
import { httpJSONRequest } from '@/http';
import { AbstractGeocoder, GeocoderOptions } from './AbstractGeocoder';

/**
 * Google Maps Geocoder
 *
 * Caching is disabled for this service as Google's TOS prohibit it.
 */
export default class GoogleMaps extends AbstractGeocoder {
	private readonly API_KEY: string;

	public constructor(apiKey: string, options: GeocoderOptions) {
		super(options);
		this.API_KEY = apiKey;
	}

	public async geocodeLocation(location: string): Promise<GeoCoordinates> {
		let data;
		try {
			data = await httpJSONRequest(`https://maps.googleapis.com/maps/api/geocode/json?key=${this.API_KEY}&address=${encodeURIComponent(location)}`);
		} catch (err) {
			// If the request fails, indicate no data was found.
			throw new LocationServiceApiError();
		}

		if (!data.results.length) {
			throw new NoLocationFoundError();
		}

		return [
			data.results[0].geometry.location.lat,
			data.results[0].geometry.location.lng
		];
	}

	protected enableCache() {
		return false
	}
}
