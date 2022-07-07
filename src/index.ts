import { cors } from '@/cors'
import { getBaselineETo } from "@/routes/baselineETo"
import { getWateringData, getWeatherData } from "@/routes/weather"
import { Request as IRequest, RouteHandler, Router } from 'itty-router'
import packageJson from '../package.json'

const router = Router();

// Handle requests to apex. Return 501 status to keep crawlers away.
router.get('/', () => new Response(`${packageJson.description} v${packageJson.version}\n<${packageJson.repository}>`, { status: 501, headers: { 'Content-Type': 'text/plain' } }))

router.routes.push([
	'GET',
	/^\/(?<method>\d+)\/?$/,
	[getWateringData as RouteHandler<IRequest>]
])

const origin = async (origin: string, env: Env) => (env.CORS_ORIGINS?.split(',') || '*')

// This route is for the GUI
router.all('/weatherData', cors(getWeatherData, { origin, methods: ['GET'] }))

// This route is for the GUI
router.all('/baselineETo', cors(getBaselineETo, { origin, methods: ['GET'] }))

// Handle 404
router.all('*', () => {
	return new Response(null, {
		status: 404
	})
})

export default {
	fetch: router.handle
}