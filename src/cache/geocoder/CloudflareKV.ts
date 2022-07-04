import { GeoCoordinates } from '@/types';
import { AbstractGeocoderCache } from './AbstractGeocoderCache';

export class CloudflareKV extends AbstractGeocoderCache {
	private kv: KVNamespace;

	constructor(kv: KVNamespace) {
		super()

		this.kv = kv
	}

	public async has(key: string) {
		return await this.kv.get(key) !== null
	}

	public async get(key: string) {
		return (await this.kv.get(key, 'json') as GeoCoordinates) ?? undefined
	}

	public async set(key: string, value: GeoCoordinates) {
		await this.kv.put(key, JSON.stringify(value), { expirationTtl: 86400 })
	}
}