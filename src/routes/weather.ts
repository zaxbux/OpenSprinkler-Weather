import { getAdjustmentMethod } from '@/adjustmentMethods';
import { AdjustmentMethod, AdjustmentMethodResponse, AdjustmentOptions } from "@/adjustmentMethods/AdjustmentMethod";
import ManualAdjustmentMethod from '@/adjustmentMethods/ManualAdjustmentMethod';
import { Env } from '@/bindings';
import { getWateringScaleCache } from '@/cache/wateringScale';
import { AbstractWateringScaleCache, CachedScale } from '@/cache/wateringScale/AbstractWateringScaleCache';
import { ErrorCode } from '@/constants';
import { CodedError, makeCodedError } from "@/errors";
import { getGeocoderProvider, resolveCoordinates } from '@/geocoders';
import { getTimeZoneLookup } from '@/timeZoneLookup';
import { GeoCoordinates, PWS, TimeData, WeatherData } from "@/types";
import { checkWeatherRestriction, getParameter, getRemoteAddress, getTimezone, ipToInt } from '@/utils';
import { getWeatherProvider } from '@/weatherProviders';
import type { Request as IRequest } from 'itty-router';
import moment from "moment-timezone";
import SunCalc from "suncalc";

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
 * API handler for weather data requests from the controller GUI.
 * @param req
 * @param env
 * @returns
 */
export const getWeatherData = async function( req: Request, env: Env ): Promise<Response> {
	const url = new URL(req.url)
	const location: string = getParameter(url.searchParams.get('loc'));

	let coordinates: GeoCoordinates;
	try {
		coordinates = await resolveCoordinates( location, async (location) => {
			const geocoder = await getGeocoderProvider(env)
			return geocoder.getLocation(location);
		});
	} catch (err) {
		return new Response(`Error: Unable to resolve location (${err})`, { status: 400 })
	}

	// Continue with the weather request
	const timeData = await getTimeData( coordinates, env );
	let weatherData: WeatherData;
	try {
		const weatherProvider = await getWeatherProvider(env)
		weatherData = await weatherProvider.getWeatherData( { coordinates } );
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
	const adjustmentMethod: AdjustmentMethod	= getAdjustmentMethod(method),
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
		return sendWateringError( new CodedError( ErrorCode.MalformedAdjustmentOptions ), adjustmentMethod != ManualAdjustmentMethod );
	}

	// Attempt to resolve provided location to GPS coordinates.
	let coordinates: GeoCoordinates;
	try {
		coordinates = await resolveCoordinates( location, async (location) => {
			const geocoder = await getGeocoderProvider(env)
			return geocoder.getLocation(location);
		})
	} catch ( err ) {
		return sendWateringError( makeCodedError( err ), adjustmentMethod != ManualAdjustmentMethod );
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
			return sendWateringError( new CodedError( ErrorCode.InvalidPwsId ), adjustmentMethod != ManualAdjustmentMethod );
		}
		if ( !apiKey ) {
			return sendWateringError( new CodedError( ErrorCode.InvalidPwsApiKey ), adjustmentMethod != ManualAdjustmentMethod );
		}

		pws = { id: pwsId, apiKey: apiKey };
	}

	const weatherProvider = /*pws ? await getPWSWeatherProvider(env) :*/ await getWeatherProvider(env);

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

	let cache: AbstractWateringScaleCache;
	let cachedScale: CachedScale | undefined;
	if ( weatherProvider.shouldCacheWateringScale() ) {
		cache = await getWateringScaleCache(env)
		cachedScale = await cache.get({ adjustmentMethodId: method, coordinates, adjustmentOptions });
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
			return sendWateringError( makeCodedError( err ), adjustmentMethod != ManualAdjustmentMethod );
		}

		data.scale = adjustmentMethodResponse.scale;
		data.rd = adjustmentMethodResponse.rainDelay;
		data.rawData = adjustmentMethodResponse.rawData!;

		if ( checkRestrictions ) {
			let wateringData = adjustmentMethodResponse.wateringData;
			// Fetch the watering data if the AdjustmentMethod didn't fetch it and restrictions are being checked.
			if (!wateringData) {
				try {
					wateringData = await weatherProvider.getWateringData({ coordinates });
				} catch ( err ) {
					return sendWateringError( makeCodedError( err ), adjustmentMethod != ManualAdjustmentMethod );
				}
			}

			// Check for any user-set restrictions and change the scale to 0 if the criteria is met
			if ( checkWeatherRestriction( method, wateringData ) ) {
				data.scale = 0;
			}
		}

		// Cache the watering scale if caching is enabled and no error occurred.
		if ( weatherProvider.shouldCacheWateringScale() ) {
			cache!.put({ adjustmentMethodId: method, coordinates, adjustmentOptions}, {
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