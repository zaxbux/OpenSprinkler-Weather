import { BaselineEToStorage, GeocoderService, GeocoderCache, TimeZoneLookupService, WateringScaleCache, WeatherProvider } from '@/constants';

declare global {
	export interface Env {
		CORS_ORIGINS?: string

		/* Baseline ETₒ */
		BASELINE_ETO: BaselineEToStorage
		BASELINE_ETO_R2_BUCKET: R2Bucket
		BASELINE_ETO_R2_PATH?: string

		/* Weather */
		WEATHER_PROVIDER: WeatherProvider

		/* Geocoder */
		GEOCODER: GeocoderService
		GEOCODER_CACHE: GeocoderCache
		GEOCODER_CACHE_KV: KVNamespace

		/* Timezone */
		TIMEZONE_ID?: string
		TIMEZONE_LOOKUP: TimeZoneLookupService

		/* Caching */
		WATERING_SCALE_CACHE: WateringScaleCache

		/* API Keys */
		OWM_API_KEY?: string
		GOOGLE_MAPS_API_KEY?: string
	}
}