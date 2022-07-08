import { getAdjustmentMethod } from '@/adjustmentMethods';
import { AdjustmentMethodResponse } from "@/adjustmentMethods/AbstractAdjustmentMethod";
import { getWateringScaleCache } from '@/cache/wateringScale';
import { ErrorCode } from '@/constants';
import { CodedError, InvalidAdjustmentMethodError, makeCodedError, MalformedAdjustmentOptionsError } from "@/errors";
import { getGeocoderProvider, resolveCoordinates } from '@/geocoders';
import { makeResponse, makeErrorResponse } from '@/http';
import { GeoCoordinates, WateringData, WateringDataResponse, WeatherDataResponse } from "@/types";
import { encodeWateringDataResponseData, getRemoteAddress, getTimezone, ipToInt, parseWaterAdjustmentOptions, shouldReturnJSON } from '@/utils';
import { getSolarTimes } from '@/utils/solarTimes';
import { getWeatherProvider } from '@/weatherProviders';
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

	const weatherProvider = await getWeatherProvider(env)
	const adjustmentMethod = getAdjustmentMethod(method, weatherProvider)

	if (!adjustmentMethod) {
		return makeWateringErrorResponse(new InvalidAdjustmentMethodError(), req);
	}

	const adjustmentOptions = parseWaterAdjustmentOptions(url.searchParams.get('wto'))
	const remoteAddress = getRemoteAddress(req)

	if (!adjustmentOptions) {
		// If the JSON is not valid then abort the calculation
		return makeWateringErrorResponse(new MalformedAdjustmentOptionsError(), req)
	}

	// Attempt to resolve provided location to GPS coordinates.
	let coordinates: GeoCoordinates
	try {
		coordinates = await resolveCoordinates(req, async (location) => (await getGeocoderProvider(env)).getLocation(location))
	} catch (err) {
		return makeWateringErrorResponse(makeCodedError(err), req)
	}


	const wateringScaleCache = await getWateringScaleCache(env)
	const cachedScale = wateringScaleCache ? await wateringScaleCache.get({ method, coordinates, adjustmentOptions }) : undefined

	if (cachedScale && weatherProvider.shouldCacheWateringScale()) {
		const { sunrise, sunset } = getSolarTimes(coordinates, cachedScale.timezone)
		// Use the cached data if it exists.
		return makeWateringDataResponse({
			errorCode: ErrorCode.NoError,
			externalIP: remoteAddress,
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

	const { sunrise, sunset } = getSolarTimes(coordinates, adjustmentMethodResponse.timezone)

	const data: WateringData = {
		errorCode: 0,
		externalIP: remoteAddress,
		timezone: adjustmentMethodResponse.timezone,
		sunrise,
		sunset,
		scale: adjustmentMethodResponse.scale,
		rainDelay: adjustmentMethodResponse.rainDelay,
		rawData: adjustmentMethodResponse.rawData,
	}

	// Cache the watering scale if caching is enabled and no error occurred.
	if (wateringScaleCache && weatherProvider.shouldCacheWateringScale()) {
		//const { scale, rainDelay, rawData } = data
		wateringScaleCache!.put({ method, coordinates, adjustmentOptions }, data);
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
		console.error(`An unexpected error occurred:`, error);
	}

	return makeControllerResponse({ errCode }, request);
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
		tz: getTimezone(wateringData.timezone, false),
		rd: wateringData.rainDelay,
		rawData: wateringData.rawData,
	}

	return makeControllerResponse(response as Record<string, any>, request)
}

/**
 * Makes a response that is understood by the firmware.
 * @param data
 * @param request
 * @returns
 */
function makeControllerResponse(data: Record<string, undefined | number | string | object>, request: Request): Response {
	const useJSON = shouldReturnJSON(request)
	const contentType = useJSON ? 'application/json' : 'text/plain'
	const body = useJSON ? JSON.stringify(data) : encodeWateringDataResponseData(data)
	return new Response(body, { headers: { 'Content-Type': contentType } })
}