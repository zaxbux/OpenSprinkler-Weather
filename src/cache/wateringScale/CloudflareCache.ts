import moment from 'moment-timezone'
import { AbstractWateringScaleCache, CachedWateringScale, CachedWateringScaleHashParameters } from './AbstractWateringScaleCache'

export class CloudflareCache extends AbstractWateringScaleCache {
	public async put(
		hash: CachedWateringScaleHashParameters,
		wateringScale: CachedWateringScale
	): Promise<void> {
		// The end of the day in the controller's timezone.
		const expirationDate = moment().tz(await this.options.timeZoneLookup.getTimeZoneId(hash.coordinates)).endOf('day')
		const ttl = expirationDate.diff(moment(), 'seconds')
		await caches.default.put(this.makeKey(hash), new Response(JSON.stringify(wateringScale), { headers: { 'Cache-Control': `max-age=${ttl}` } }))
	}

	public async get(hash: CachedWateringScaleHashParameters): Promise<CachedWateringScale | undefined> {
		const response = await caches.default.match(this.makeKey(hash))

		if (!response) {
			return undefined
		}

		return await response.json() as CachedWateringScale
	}

	private makeKey(hash: CachedWateringScaleHashParameters): string {
		return `${hash.method}?loc=${hash.coordinates.join(',')}&wto=${JSON.stringify(hash.adjustmentOptions)}`
	}
}