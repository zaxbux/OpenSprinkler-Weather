import { Env } from '@/bindings'
import type { AbstractGeocoderCache } from './AbstractGeocoderCache'
import { CloudflareKV } from './CloudflareKV'
import { NullStore } from './NullStore'



export const getGeocoderCache = async (env: Env): Promise<AbstractGeocoderCache> => {
	switch (env.GEOCODER_CACHE) {
		case 'CloudflareKV':
			return new CloudflareKV(env.GEOCODER_CACHE_KV)
	}

	return new NullStore()
}