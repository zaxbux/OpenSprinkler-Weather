import { GeoCoordinates } from '@/types';
import { AbstractGeocoderCache } from './AbstractGeocoderCache';

export class NullStore extends AbstractGeocoderCache {
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