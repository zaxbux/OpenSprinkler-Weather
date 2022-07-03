import { WeatherProviderShortID } from '@/types'

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  ETO_BASELINE_BUCKET: R2Bucket;

  // Environment vars
  WEATHER_PROVIDER: WeatherProviderShortID
  PWS: string
  PWS_WEATHER_PROVIDER: string
  GEOCODER: string
  GEOCODER_CACHE: string
  GEOCODER_CACHE_KV: KVNamespace
  OWM_API_KEY: string
  GOOGLE_MAPS_API_KEY: string
  LOCAL_PERSISTENCE: string
  TIMEZONE?: string
  TIMEZONE_LOOKUP: string
  WATERING_SCALE_CACHE: string
}

/* declare global {

} */