import { Env } from '@/bindings';
import { WateringScaleCache } from '@/constants';
import { getTimeZoneLookup } from '@/timeZoneLookup';
import { AbstractWateringScaleCache } from './AbstractWateringScaleCache';
import { CloudflareCache } from './CloudflareCache';



export const getWateringScaleCache = async (env: Env): Promise<AbstractWateringScaleCache> => {
	const { WATERING_SCALE_CACHE } = env
	const timeZoneLookup = await getTimeZoneLookup(env)

	switch (WATERING_SCALE_CACHE as string) {
		case WateringScaleCache.CloudflareCache:
			return new CloudflareCache({ timeZoneLookup })
	}

	throw new Error(`Unknown watering scale cache (${WATERING_SCALE_CACHE})`)
}