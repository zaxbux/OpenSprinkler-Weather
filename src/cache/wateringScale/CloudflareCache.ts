import moment from 'moment-timezone';
import { AbstractWateringScaleCache, CachedScale, CachedScaleHash } from './AbstractWateringScaleCache';

export class CloudflareCache extends AbstractWateringScaleCache {
	public async put(
		hash: CachedScaleHash,
		wateringScale: CachedScale
	): Promise<void> {
		// The end of the day in the controller's timezone.
		const expirationDate = moment().tz(await this.options.timeZoneLookup.getTimeZoneId(hash.coordinates)).endOf('day');
		const ttl = expirationDate.diff(moment(), 'seconds');
		const key = this.makeKey(hash);
		await caches.default.put(key, new Response(JSON.stringify(wateringScale), { headers: { 'Cache-Control': `max-age=${ttl}` } }))
	}

	public async get(hash: CachedScaleHash): Promise<CachedScale | undefined> {
		const key = this.makeKey(hash);
		const response = await caches.default.match(key)

		if (response) {
			return await response.json() as CachedScale
		}

		return undefined
	}

	private makeKey(hash: CachedScaleHash): string {
		return `${hash.adjustmentMethodId}?loc=${hash.coordinates.join(',')}&wto=${JSON.stringify(hash.adjustmentOptions)}`
	}
}