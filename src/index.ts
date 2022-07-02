import { Router } from 'itty-router'
import { cors } from '@/cors'
import packageJson from '../package.json'

import { getWeatherData } from "@/routes/weather"
import { getBaselineETo } from "@/routes/baselineETo"

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

const router = Router();

// Handle requests to apex. Return 503 status to keep crawlers away.
router.get('/', () => new Response(`${packageJson.description} v${packageJson.version}`, { status: 503 }))

router.options('/weatherData', cors())
router.get('/weatherData', getWeatherData)

router.options('/baselineETo', cors())
router.get('/baselineETo', getBaselineETo)

// Handle 404
router.get('*', (request) => {
	return new Response(null, {
		status: 404
	})
})

export default {
	fetch: router.handle
}