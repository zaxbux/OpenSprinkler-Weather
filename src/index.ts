import { cors } from '@/cors'
import { getBaselineETo } from "@/routes/baselineETo"
import { getWateringData, getWeatherData } from "@/routes/weather"
import { Request as IRequest, RouteHandler, Router } from 'itty-router'
import packageJson from '../package.json'

const router = Router();

// Handle requests to apex. Return 503 status to keep crawlers away.
router.get('/', () => new Response(`${packageJson.description} v${packageJson.version}`, { status: 503 }))

router.routes.push([
	'GET',
	/^\/(?<method>\d+)\/?$/,
	[getWateringData as RouteHandler<IRequest>]
])

// This route is for the GUI
router.options('/weatherData', cors())
router.get('/weatherData', getWeatherData)

// This route is for the GUI
router.options('/baselineETo', cors())
router.get('/baselineETo', getBaselineETo)

// Handle 404
router.get('*', () => {
	return new Response(null, {
		status: 404
	})
})

export default {
	fetch: router.handle
}