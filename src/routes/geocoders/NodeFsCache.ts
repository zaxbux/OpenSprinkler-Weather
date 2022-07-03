import * as fs from 'fs';
import { GeoCoordinates } from '@/types';
import { GeocoderCache } from './Geocoder';

export class NodeFsGeocoderCache extends GeocoderCache {
	private static cacheFile: string = __dirname + "/../../../geocoderCache.json";

	private cache: Map<string, GeoCoordinates>;

	constructor() {
		super()

		// Load the cache from disk.
		if ( fs.existsSync( NodeFsGeocoderCache.cacheFile ) ) {
			this.cache = new Map( JSON.parse( fs.readFileSync( NodeFsGeocoderCache.cacheFile, "utf-8" ) ) );
		} else {
			this.cache = new Map();
		}

		// Write the cache to disk every 5 minutes.
		setInterval( () => {
			this.saveCache();
		}, 5 * 60 * 1000 );
	}

	public async has(key: string) {
		return this.cache.has(key)
	}

	public async get(key: string) {
		return this.cache.get(key)
	}

	public async set(key: string, value: GeoCoordinates) {

	}

	private saveCache(): void {
		fs.writeFileSync( NodeFsGeocoderCache.cacheFile, JSON.stringify( Array.from( this.cache.entries() ) ) );
	}
}