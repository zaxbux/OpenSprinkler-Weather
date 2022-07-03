import { GeoCoordinates } from '@/types';
import { GeocoderCache } from './Geocoder';

export class NullGeocoderCache extends GeocoderCache {
	public async has(key: string) {
		return false
	}

	public async get(key: string) {
		return undefined
	}

	public async set(key: string, value: GeoCoordinates) {
		return
	}
}