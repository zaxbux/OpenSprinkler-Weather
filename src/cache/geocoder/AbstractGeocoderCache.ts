import { GeoCoordinates } from '@/types';

export abstract class AbstractGeocoderCache {
	public abstract has(key: string): Promise<boolean>
	public abstract get(key: string): Promise<GeoCoordinates | undefined>
	public abstract set(key: string, value: GeoCoordinates): Promise<void>
}