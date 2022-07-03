import { GeoCoordinates } from "@/types";
import { CodedError, ErrorCode } from "@/errors";
import { httpJSONRequest } from "../weather";
import { Geocoder, GeocoderOptions } from "./Geocoder";

/**
 * Google Maps Geocoder
 *
 * Caching is disabled for this service as Google's TOS prohibit it.
 */
export default class GoogleMaps extends Geocoder {
	private readonly API_KEY: string;

	public constructor(apiKey: string, options: GeocoderOptions) {
		super(options);
		this.API_KEY = apiKey;
		if (!this.API_KEY) {
			throw "GOOGLE_MAPS_API_KEY environment variable is not defined.";
		}
	}

	public async geocodeLocation(location: string): Promise<GeoCoordinates> {
		let data;
		try {
			data = await httpJSONRequest(`https://maps.googleapis.com/maps/api/geocode/json?key=${this.API_KEY}&address=${encodeURIComponent(location)}`);
		} catch (err) {
			// If the request fails, indicate no data was found.
			throw new CodedError(ErrorCode.LocationServiceApiError);
		}

		if (!data.results.length) {
			throw new CodedError(ErrorCode.NoLocationFound);
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
