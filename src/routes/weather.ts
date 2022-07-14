import { getAdjustmentMethod } from '@/adjustmentMethods';
import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "@/adjustmentMethods/AbstractAdjustmentMethod";
import { getWateringScaleCache } from '@/cache/wateringScale';
import { ErrorCode } from '@/constants';
import { CodedError, makeCodedError } from "@/errors";
import { getGeocoderProvider, resolveCoordinates } from '@/geocoders';
import { makeErrorResponse, makeResponse } from '@/http';
import { getTimeZoneLookup } from '@/timeZoneLookup';
import { GeoCoordinates, WateringData, WateringDataResponse, WeatherDataResponse } from "@/types";
import { encodeWateringDataResponseData, getRemoteAddress, getTimezone, ipToInt, parseWaterAdjustmentOptions, shouldReturnJSON } from '@/utils';
import { getSolarTimes } from '@/utils/solarTimes';
import { AbstractWeatherProvider, getWeatherProvider } from '@/weatherProviders';
import type { Request as IRequest } from 'itty-router';

/**
 * API handler for weather data requests from the controller GUI.
 * @param req
 * @param env
 * @returns
 */
export const getWeatherData = async function (req: Request, env: Env): Promise<Response> {
	let coordinates: GeoCoordinates
	try {
		coordinates = await resolveCoordinates(req, async (location) => (await getGeocoderProvider(env)).getLocation(location))
	} catch (err) {
		return makeErrorResponse(req, err, 400, `Unable to resolve location (${err})`)
	}

	// Continue with the weather request
	try {
		const weatherProvider = await getWeatherProvider(env)
		const weatherData = await weatherProvider.getWeatherData({ coordinates, env })

		const { sunrise, sunset } = getSolarTimes(coordinates, weatherData.timezone)

		// @todo: caching headers
		const response: WeatherDataResponse = {
			//timezone: weatherData.timezone,
			sunrise,
			sunset,
			...weatherData,
			location: [coordinates[0], coordinates[1]],
		}

		return makeResponse(req, response)
	} catch (err) {
		return makeErrorResponse(req, err, 400)
	}
}

/**
 * API Handler for adjustment method requests from the controller firmware.
 * The `method` request parameter represents the encoded adjustment method and watering restriction.
 * @param req
 * @returns
 */
export const getWateringData = async function (req: Request & { params: NonNullable<IRequest['params']> }, env: Env): Promise<Response> {
	const method = Number(req.params.method)
	const url = new URL(req.url)
	//const firmwareVersion = url.searchParams.get('fwv') ?? '' // @todo: Change response format based on firmware version

	let weatherProvider: AbstractWeatherProvider
	let adjustmentMethod: AbstractAdjustmentMethod
	let adjustmentOptions: Record<string, any>
	let coordinates: GeoCoordinates
	try {
		weatherProvider = await getWeatherProvider(env)
		adjustmentMethod = await getAdjustmentMethod(method, weatherProvider)
		adjustmentOptions = parseWaterAdjustmentOptions(url.searchParams.get('wto'))
		coordinates = await resolveCoordinates(req, async (location) => (await getGeocoderProvider(env)).getLocation(location))
	} catch (err) {
		return makeWateringErrorResponse(makeCodedError(err), req)
	}

	const wateringScaleCache = await getWateringScaleCache(env)
	const cachedScale = wateringScaleCache ? await wateringScaleCache.get({ method, coordinates, adjustmentOptions }) : undefined

	if (cachedScale && weatherProvider.shouldCacheWateringScale()) {
		const { sunrise, sunset } = cachedScale.timezone ? getSolarTimes(coordinates, cachedScale.timezone) : { sunrise: undefined, sunset: undefined }
		// Use the cached data if it exists.
		return makeWateringDataResponse({
			errorCode: ErrorCode.NoError,
			externalIP: getRemoteAddress(req),
			sunrise,
			sunset,
			...cachedScale,
		}, req)
	}

	// Calculate the watering scale if it wasn't found in the cache.
	let adjustmentMethodResponse: AdjustmentMethodResponse
	try {
		adjustmentMethodResponse = await adjustmentMethod.getAdjustment(adjustmentOptions, coordinates)
	} catch (err) {
		return makeWateringErrorResponse(makeCodedError(err), req);
	}

	// Use the timezone returned by the Weather Service (if it supports that), or query the timezone database.
	let timezone = adjustmentMethodResponse.timezone
	if (!timezone) {
		const timeZoneLookup = await getTimeZoneLookup(env)
		timezone = await timeZoneLookup.getTimeZoneOffset(coordinates)
	}

	const { sunrise, sunset } = adjustmentMethodResponse.timezone ? getSolarTimes(coordinates, timezone) : { sunrise: undefined, sunset: undefined }

	const data: WateringData = {
		errorCode: 0,
		externalIP: getRemoteAddress(req),
		timezone,
		sunrise,
		sunset,
		scale: adjustmentMethodResponse.scale,
		rainDelay: adjustmentMethodResponse.rainDelay,
		rawData: adjustmentMethodResponse.rawData,
	}

	// Cache the watering scale if caching is enabled and no error occurred.
	if (wateringScaleCache && weatherProvider.shouldCacheWateringScale()) {
		wateringScaleCache.put({ method, coordinates, adjustmentOptions }, data)
	}

	return makeWateringDataResponse(data, req)
}

/**
 * Sends a response to a watering scale request with an error code.
 * @param error The error code to send in the response body.
 * @param request The original request object.
 */
function makeWateringErrorResponse(error: CodedError, request: Request) {
	const { errCode } = error
	if (errCode === ErrorCode.UnexpectedError) {
		console.error(`An unexpected error occurred:`, error)
	}

	return makeControllerResponse(error, request)
}

/**
 * Sends a response to a request from the controller with data that the firmware will use to alter watering.
 *
 * @param wateringData The watering data.
 * @param request The original request object.
 */
function makeWateringDataResponse(wateringData: WateringData, request: Request) {
	// Object consisting only of parameters that the firmware will parse.
	const response: WateringDataResponse = {
		errCode: wateringData.errorCode,
		scale: wateringData.scale,
		sunrise: wateringData.sunrise,
		sunset: wateringData.sunset,
		eip: wateringData.externalIP ? ipToInt(wateringData.externalIP) : undefined,
		tz: wateringData.timezone ? getTimezone(wateringData.timezone, false) : undefined,
		rd: wateringData.rainDelay,
		rawData: wateringData.rawData,
	}

	return makeControllerResponse(response, request)
}

/**
 * Makes a response that is understood by the firmware.
 * @param bodyInit
 * @param request
 * @returns
 */
function makeControllerResponse(bodyInit: WateringDataResponse | CodedError, request: Request, init: ResponseInit = {}) {
	const useJSON = shouldReturnJSON(request)
	const contentType = useJSON ? 'application/json' : 'text/plain'

	let body: string
	if (bodyInit instanceof CodedError) {
		const { errCode, status, message } = bodyInit
		init.status = status
		body = useJSON ? JSON.stringify({ errCode, message }) : encodeWateringDataResponseData(bodyInit)
	} else {
		body = useJSON ? JSON.stringify(bodyInit) : encodeWateringDataResponseData(bodyInit)
	}

	return new Response(body, { ...init, headers: { 'Content-Type': contentType } })
}