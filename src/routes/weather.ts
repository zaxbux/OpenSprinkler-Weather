import SunCalc from "suncalc";
import moment from "moment-timezone";

import { BaseWateringData, GeoCoordinates, PWS, TimeData, WeatherData, WeatherProviderShortID } from "@/types";
//import { WeatherProvider } from "./weatherProviders/WeatherProvider";
import { AdjustmentMethod, AdjustmentMethodResponse, AdjustmentOptions } from "./adjustmentMethods/AdjustmentMethod";
import WateringScaleCache, { CachedScale } from "../WateringScaleCache";
import AdjustmentMethods from '@/routes/adjustmentMethods'
import { CodedError, ErrorCode, makeCodedError } from "@/errors";
//import { Geocoder } from "./geocoders/Geocoder";
import type { Request as IRequest } from 'itty-router';
import { GoogleMapsTimeZoneLookup } from '@/timeZoneLookup/GoogleMaps';
import { CloudflareGeocoderCache } from './geocoders/CloudflareGeocoderCache';
import WUnderground from './geocoders/WUnderground';
import { WeatherProvider } from './weatherProviders/WeatherProvider';
import { Env } from '@/bindings';
import { Geocoder, GeocoderCache } from './geocoders/Geocoder';
import { NullGeocoderCache } from './geocoders/NullGeocoderCache';
import GoogleMaps from './geocoders/GoogleMaps';
import { TimeZoneLookup } from '@/timeZoneLookup';
import { StaticTimeZoneLookup } from '@/timeZoneLookup/Static';

//const WEATHER_PROVIDER: WeatherProvider = new ( import("./weatherProviders/" + ( process.env.WEATHER_PROVIDER || WeatherProviderShortID.OpenWeatherMap ) ).default )();
//const PWS_WEATHER_PROVIDER: WeatherProvider = new ( import("./weatherProviders/" + ( process.env.PWS_WEATHER_PROVIDER || WeatherProviderShortID.WUnderground ) ).default )();
//const GEOCODER: Geocoder = new ( import("./geocoders/" + ( process.env.GEOCODER || "WUnderground" ) ).default )();

const getWeatherProvider = async (env: Env): Promise<WeatherProvider> => {
	switch (env.WEATHER_PROVIDER) {
		case WeatherProviderShortID.OpenWeatherMap:
			return new ((await import('@/routes/weatherProviders/OWM')).default)(env.OWM_API_KEY)
		case WeatherProviderShortID.WUnderground:
			return new ((await import ('@/routes/weatherProviders/WUnderground')).default)()
	}

	throw new Error(`Unknown weather provider (${env.WEATHER_PROVIDER})`)
}

const getPWSWeatherProvider = async (env: Env): Promise<WeatherProvider> => {
	switch (env.PWS_WEATHER_PROVIDER) {
		case WeatherProviderShortID.OpenWeatherMap:
			return new ((await import('@/routes/weatherProviders/OWM')).default)(env.OWM_API_KEY)
		case WeatherProviderShortID.WUnderground:
			return new ((await import ('@/routes/weatherProviders/WUnderground')).default)()
	}

	throw new Error(`Unknown weather provider (${env.PWS_WEATHER_PROVIDER})`)
}

const getGeocoderCache = async (env: Env): Promise<GeocoderCache> => {
	switch (env.GEOCODER_CACHE) {
		case 'Cloudflare':
			return new CloudflareGeocoderCache(env.GEOCODER_CACHE_KV)
	}

	return new NullGeocoderCache()
}

const getGeocoderProvider = async (env: Env): Promise<Geocoder> => {
	const cache = await getGeocoderCache(env)

	switch (env.GEOCODER) {
		case 'WUnderground':
			return new WUnderground({ cache })
		case 'GoogleMaps':
			return new GoogleMaps(env.GOOGLE_MAPS_API_KEY, { cache })
	}

	throw new Error(`Unknown geocoder (${env.GEOCODER})`)
}

const getTimeZoneLookup = async (env: Env): Promise<TimeZoneLookup> => {
	switch (env.TIMEZONE_LOOKUP) {
		case 'GoogleMaps':
			return new GoogleMapsTimeZoneLookup({ apiKey: env.GOOGLE_MAPS_API_KEY })
	}

	if (env.TIMEZONE) {
		return new StaticTimeZoneLookup({ timeZoneId: env.TIMEZONE })
	}

	throw new Error(`Unknown timezone lookup (${env.TIMEZONE_LOOKUP})`)
}

const getWateringScaleCache = async (env: Env): Promise<WateringScaleCache> => {
	const timeZoneLookup = await getTimeZoneLookup(env)

	switch (env.WATERING_SCALE_CACHE) {
		case 'Cloudflare':
			return new WateringScaleCache({ timeZoneLookup })
	}

	throw new Error(`Unknown watering scale cache (${env.WATERING_SCALE_CACHE})`)
}

// Define regex filters to match against location
const filters = {
	gps: /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
	pws: /^(?:pws|icao|zmw):/,
	//url: /^https?:\/\/([\w\.-]+)(:\d+)?(\/.*)?$/,
	time: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2})(\d{2})/,
	timezone: /^()()()()()()([+-])(\d{2})(\d{2})/
};

/** AdjustmentMethods mapped to their numeric IDs. */
const ADJUSTMENT_METHOD: { [ key: number ] : AdjustmentMethod } = {
	0: AdjustmentMethods.ManualAdjustmentMethod,
	1: AdjustmentMethods.ZimmermanAdjustmentMethod,
	2: AdjustmentMethods.RainDelayAdjustmentMethod,
	3: AdjustmentMethods.EToAdjustmentMethod
};

/**
 * Resolves a location description to geographic coordinates.
 * @param location A partial zip/city/country or a coordinate pair.
 * @return A promise that will be resolved with the coordinates of the best match for the specified location, or
 * rejected with a CodedError if unable to resolve the location.
 */
export async function resolveCoordinates( location: string, env: Env ): Promise< GeoCoordinates > {

	if ( !location ) {
		throw new CodedError( ErrorCode.InvalidLocationFormat );
	}

	if ( filters.pws.test( location ) ) {
		throw new CodedError( ErrorCode.InvalidLocationFormat );
	} else if ( filters.gps.test( location ) ) {
		const split: string[] = location.split( "," );
		return [ parseFloat( split[ 0 ] ), parseFloat( split[ 1 ] ) ];
	} else {
		const geocoder = await getGeocoderProvider(env)
		return geocoder.getLocation( location );
	}
}

/**
 * Makes an HTTP/HTTPS GET request to the specified URL and returns the response body.
 * @param url The URL to fetch.
 * @return A Promise that will be resolved the with response body if the request succeeds, or will be rejected with an
 * error if the request fails or returns a non-200 status code. This error may contain information about the HTTP
 * request or, response including API keys and other sensitive information.
 */
 async function httpRequest( url: string ): Promise< string > {
	const response = await fetch(url)

	if (response.status !== 200 ) {
		throw new Error( `Received ${ response.status } status code for URL '${ url }'.` )
	}

	return response.text()
}

/**
 * Makes an HTTP/HTTPS GET request to the specified URL and parses the JSON response body.
 * @param url The URL to fetch.
 * @return A Promise that will be resolved the with parsed response body if the request succeeds, or will be rejected
 * with an error if the request or JSON parsing fails. This error may contain information about the HTTP request or,
 * response including API keys and other sensitive information.
 */
export async function httpJSONRequest<T = any>(url: string ): Promise<T> {
	try {
		const data: string = await httpRequest(url);
		return JSON.parse(data);
	} catch (err) {
		// Reject the promise if there was an error making the request or parsing the JSON.
		throw err;
	}
}

/**
 * Calculates timezone and sunrise/sunset for the specified coordinates.
 * @param coordinates The coordinates to use to calculate time data.
 * @return The TimeData for the specified coordinates.
 */
async function getTimeData( coordinates: GeoCoordinates, env: Env ): Promise<TimeData> {
	const timeZoneLookup = await getTimeZoneLookup(env)
	const timezone = moment().tz( await timeZoneLookup.getTimeZoneId(coordinates) ).utcOffset();
	const tzOffset: number = getTimezone( timezone, true );

	// Calculate sunrise and sunset since Weather Underground does not provide it
	const sunData = SunCalc.getTimes( new Date(), coordinates[ 0 ], coordinates[ 1 ] );

	sunData.sunrise.setUTCMinutes( sunData.sunrise.getUTCMinutes() + tzOffset );
	sunData.sunset.setUTCMinutes( sunData.sunset.getUTCMinutes() + tzOffset );

	return {
		timezone:	timezone,
		sunrise:	( sunData.sunrise.getUTCHours() * 60 + sunData.sunrise.getUTCMinutes() ),
		sunset:		( sunData.sunset.getUTCHours() * 60 + sunData.sunset.getUTCMinutes() )
	};
}

/**
 * Checks if the weather data meets any of the restrictions set by OpenSprinkler. Restrictions prevent any watering
 * from occurring and are similar to 0% watering level. Known restrictions are:
 *
 * - California watering restriction prevents watering if precipitation over two days is greater than 0.1" over the past
 * 48 hours.
 * @param adjustmentValue The adjustment value, which indicates which restrictions should be checked.
 * @param weather Watering data to use to determine if any restrictions apply.
 * @return A boolean indicating if the watering level should be set to 0% due to a restriction.
 */
function checkWeatherRestriction( adjustmentValue: number, weather: BaseWateringData ): boolean {

	const californiaRestriction = ( adjustmentValue >> 7 ) & 1;

	if ( californiaRestriction ) {

		// TODO depending on which WeatherProvider is used, this might be checking if rain is forecasted in th next 24
		// 	hours rather than checking if it has rained in the past 48 hours.
		// If the California watering restriction is in use then prevent watering
		// if more then 0.1" of rain has accumulated in the past 48 hours
		if ( weather.precip > 0.1 ) {
			return true;
		}
	}

	return false;
}

export const getWeatherData = async function( req: Request, env: Env ): Promise<Response> {
	const url = new URL(req.url)
	const location: string = getParameter(url.searchParams.get('loc'));

	let coordinates: GeoCoordinates;
	try {
		coordinates = await resolveCoordinates( location, env );
	} catch (err) {
		return new Response(`Error: Unable to resolve location (${err})`, { status: 400 })
	}

	// Continue with the weather request
	const timeData = await getTimeData( coordinates, env );
	let weatherData: WeatherData;
	try {
		const weatherProvider = await getWeatherProvider(env)
		weatherData = await weatherProvider.getWeatherData( coordinates );
	} catch ( err ) {
		return new Response(`Error: ${err}`, { status: 400 })
	}

	return new Response(JSON.stringify({
		...timeData,
		...weatherData,
		location: coordinates
	}), {
		headers: {
			'Content-Type': 'application/json'
		}
	})
};

function getRemoteAddress(request: Request) {
	let remoteAddress = getParameter(request.headers.get('x-forwarded-for')) || request.headers.get('cf-connecting-ip')!

	// X-Forwarded-For header may contain more than one IP address and therefore
	// the string is split against a comma and the first value is selected
	remoteAddress = remoteAddress.split( "," )[ 0 ];

	return remoteAddress
}

/**
 * API Handler for adjustment method requests from the controller firmware.
 * The `method` request parameter represents the encoded adjustment method and watering restriction.
 * @param req
 * @returns
 */
export const getWateringData = async function(req: Request & { params: NonNullable<IRequest['params']> }, env: Env): Promise<Response> {
	// The adjustment method is encoded by the OpenSprinkler firmware and must be
	// parsed. This allows the adjustment method and the restriction type to both
	// be saved in the same byte.
	const method = Number(req.params.method)
	const url = new URL(req.url)
	const adjustmentMethod: AdjustmentMethod	= ADJUSTMENT_METHOD[ method & ~( 1 << 7 ) ],
		checkRestrictions: boolean			= ( ( method >> 7 ) & 1 ) > 0
	let adjustmentOptionsString: string		= getParameter(url.searchParams.get('wto'))
	const location: string | GeoCoordinates	= getParameter(url.searchParams.get('loc')),
		outputFormat: string				= getParameter(url.searchParams.get('format'))
	let adjustmentOptions: AdjustmentOptions;
	const remoteAddress = getRemoteAddress(req)



	if ( !adjustmentMethod ) {
		return sendWateringError(new CodedError( ErrorCode.InvalidAdjustmentMethod ));
	}

	// Parse weather adjustment options
	try {

		// Parse data that may be encoded
		adjustmentOptionsString = decodeURIComponent( adjustmentOptionsString.replace( /\\x/g, "%" ) );

		// Reconstruct JSON string from deformed controller output
		adjustmentOptions = JSON.parse( "{" + adjustmentOptionsString + "}" );
	} catch ( err ) {
		// If the JSON is not valid then abort the calculation
		return sendWateringError( new CodedError( ErrorCode.MalformedAdjustmentOptions ), adjustmentMethod != AdjustmentMethods.ManualAdjustmentMethod );
	}

	// Attempt to resolve provided location to GPS coordinates.
	let coordinates: GeoCoordinates;
	try {
		coordinates = await resolveCoordinates( location, env );
	} catch ( err ) {
		return sendWateringError( makeCodedError( err ), adjustmentMethod != AdjustmentMethods.ManualAdjustmentMethod );
	}

	let timeData = await getTimeData( coordinates, env );

	// Parse the PWS information.
	let pws: PWS | undefined = undefined;
	if ( adjustmentOptions.pws && adjustmentOptions.key ) {

		const idMatch = adjustmentOptions.pws.match( /^[a-zA-Z\d]+$/ );
		const pwsId = idMatch ? idMatch[ 0 ] : undefined;
		const keyMatch = adjustmentOptions.key.match( /^[a-f\d]{32}$/ );
		const apiKey = keyMatch ? keyMatch[ 0 ] : undefined;

		// Make sure that the PWS ID and API key look valid.
		if ( !pwsId ) {
			return sendWateringError( new CodedError( ErrorCode.InvalidPwsId ), adjustmentMethod != AdjustmentMethods.ManualAdjustmentMethod );
		}
		if ( !apiKey ) {
			return sendWateringError( new CodedError( ErrorCode.InvalidPwsApiKey ), adjustmentMethod != AdjustmentMethods.ManualAdjustmentMethod );
		}

		pws = { id: pwsId, apiKey: apiKey };
	}

	const weatherProvider = pws ? await getPWSWeatherProvider(env) : await getWeatherProvider(env);

	const data: {
		scale:		number | undefined,
		rd:		number | undefined,
		tz:			number,
		sunrise:	number,
		sunset:		number,
		eip:		number,
		rawData:	Record<string, any>,
		errCode:	0
	} = {
		scale:		undefined,
		rd:			undefined,
		tz:			getTimezone( timeData.timezone, undefined ),
		sunrise:	timeData.sunrise,
		sunset:		timeData.sunset,
		eip:		ipToInt( remoteAddress ),
		rawData:	{},
		errCode:	0
	};

	let cache: WateringScaleCache;
	let cachedScale: CachedScale | undefined;
	if ( weatherProvider.shouldCacheWateringScale() ) {
		cache = await getWateringScaleCache(env)
		cachedScale = await cache.getWateringScale( method, coordinates, pws, adjustmentOptions );
	}

	if ( cachedScale ) {
		// Use the cached data if it exists.
		data.scale = cachedScale.scale;
		data.rawData = cachedScale.rawData;
		data.rd = cachedScale.rainDelay;
	} else {
		// Calculate the watering scale if it wasn't found in the cache.
		let adjustmentMethodResponse: AdjustmentMethodResponse;
		try {
			adjustmentMethodResponse = await adjustmentMethod.calculateWateringScale(
				adjustmentOptions, coordinates, weatherProvider, pws
			);
		} catch ( err ) {
			return sendWateringError( makeCodedError( err ), adjustmentMethod != AdjustmentMethods.ManualAdjustmentMethod );
		}

		data.scale = adjustmentMethodResponse.scale;
		data.rd = adjustmentMethodResponse.rainDelay;
		data.rawData = adjustmentMethodResponse.rawData!;

		if ( checkRestrictions ) {
			let wateringData = adjustmentMethodResponse.wateringData;
			// Fetch the watering data if the AdjustmentMethod didn't fetch it and restrictions are being checked.
			if (!wateringData) {
				try {
					wateringData = await weatherProvider.getWateringData( coordinates );
				} catch ( err ) {
					return sendWateringError( makeCodedError( err ), adjustmentMethod != AdjustmentMethods.ManualAdjustmentMethod );
				}
			}

			// Check for any user-set restrictions and change the scale to 0 if the criteria is met
			if ( checkWeatherRestriction( method, wateringData ) ) {
				data.scale = 0;
			}
		}

		// Cache the watering scale if caching is enabled and no error occurred.
		if ( weatherProvider.shouldCacheWateringScale() ) {
			cache!.storeWateringScale( method, coordinates, pws, adjustmentOptions, {
				scale: data.scale!,
				rawData: data.rawData,
				rainDelay: data.rd!,
			} );
		}
	}

	return sendWateringData( data, outputFormat === "json" );
};

/**
 * Sends a response to a watering scale request with an error code.
 * @param res The Express Response object to send the response through.
 * @param error The error code to send in the response body.
 * @param resetScale Indicates if the `scale` field in the response should be set to 100. If this parameter is set to false,
 * the field will be omitted. Newer firmware versions may ignore the value of this field since they will detect an error
 * occurred, but older firmware versions will still update the watering scale accordingly.
 * @param useJson Indicates if the response body should use a JSON format instead of a format similar to URL query strings.
 */
function sendWateringError( error: CodedError, resetScale: boolean = true, useJson: boolean = false ) {
	if ( error.errCode === ErrorCode.UnexpectedError ) {
		console.error( `An unexpected error occurred:`, error );
	}

	return sendWateringData({ errCode: error.errCode, scale: resetScale ? 100 : undefined });
}

/**
 * Sends a response to an HTTP request with a 200 status code.
 * @param data An object containing key/value pairs that should be formatted in the response body.
 * @param useJson Indicates if the response body should use a JSON format instead of a format similar to URL query strings.
 */
function sendWateringData( data: Record<string, any>, useJson: boolean = false ) {
	if ( useJson ) {
		return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }})
	} else {
		// Return the data formatted as a URL query string.
		let formatted = "";
		for ( const key in data ) {
			// Skip inherited properties.
			if ( !data.hasOwnProperty( key ) ) {
				continue;
			}

			let value = data[ key ];
			switch ( typeof value ) {
				case "undefined":
					// Skip undefined properties.
					continue;
				case "object":
					// Convert objects to JSON.
					value = JSON.stringify( value );
				// Fallthrough.
				case "string":
					/* URL encode strings. Since the OS firmware uses a primitive version of query string parsing and
					decoding, only some characters need to be escaped and only spaces ("+" or "%20") will be decoded. */
					value = value.replace( / /g, "+" ).replace( /\n/g, "\\n" ).replace( /&/g, "AMPERSAND" );
					break;
			}

			formatted += `&${ key }=${ value }`;
		}
		return new Response(formatted)
	}
}



/**
 * Checks if the specified object contains numeric values for each of the specified keys.
 * @param keys A list of keys to validate exist on the specified object.
 * @param obj The object to check.
 * @return A boolean indicating if the object has numeric values for all of the specified keys.
 */
export function validateValues( keys: string[], obj: Record<string, any> ): boolean {
	let key: string;

	// Return false if the object is null/undefined.
	if ( !obj ) {
		return false;
	}

	for ( key in keys ) {
		if ( !keys.hasOwnProperty( key ) ) {
			continue;
		}

		key = keys[ key ];

		if ( !obj.hasOwnProperty( key ) || typeof obj[ key ] !== "number" || isNaN( obj[ key ] ) || obj[ key ] === null || obj[ key ] === -999 ) {
			return false;
		}
	}

	return true;
}

/**
 * Converts a timezone to an offset in minutes or OpenSprinkler encoded format.
 * @param time A time string formatted in ISO-8601 or just the timezone.
 * @param useMinutes Indicates if the returned value should be in minutes of the OpenSprinkler encoded format.
 * @return The offset of the specified timezone in either minutes or OpenSprinkler encoded format (depending on the
 * value of useMinutes).
 */
function getTimezone( time: number | string, useMinutes: boolean = false ): number {

	let hour, minute;

	if ( typeof time === "number" ) {
		hour = Math.floor( time / 60 );
		minute = time % 60;
	} else {

		// Match the provided time string against a regex for parsing
		let splitTime = time.match( filters.time )! || time.match( filters.timezone )!;

		hour = parseInt( splitTime[ 7 ] + splitTime[ 8 ] );
		minute = parseInt( splitTime[ 9 ] );
	}

	if ( useMinutes ) {
		return ( hour * 60 ) + minute;
	} else {

		// Convert the timezone into the OpenSprinkler encoded format
		minute = ( minute / 15 >> 0 ) / 4;
		hour = hour + ( hour >= 0 ? minute : -minute );

		return ( ( hour + 12 ) * 4 ) >> 0;
	}
}

/**
 * Converts an IP address string to an integer.
 * @param ip The string representation of the IP address.
 * @return The integer representation of the IP address.
 */
function ipToInt( ip: string ): number {
    const split = ip.split( "." );
    return ( ( ( ( ( ( +split[ 0 ] ) * 256 ) + ( +split[ 1 ] ) ) * 256 ) + ( +split[ 2 ] ) ) * 256 ) + ( +split[ 3 ] );
}

/**
 * Returns a single value for a header/query parameter. If passed a single string, the same string will be returned. If
 * an array of strings is passed, the first value will be returned. If this value is null/undefined, an empty string
 * will be returned instead.
 * @param parameter An array of parameters or a single parameter value.
 * @return The first element in the array of parameter or the single parameter provided.
 */
export function getParameter( parameter: string | string[] | null): string {
	if ( Array.isArray( parameter ) ) {
		parameter = parameter[0];
	}

	// Return an empty string if the parameter is undefined.
	return parameter ?? '';
}
