export const enum WeatherProvider {
	//Mock = "mock",
	//Local = "local",
	OpenWeatherMap = "OpenWeatherMap",
	//WUnderground = "WUnderground",
}

export const enum BaselineEToStorage {
	CloudflareR2 = 'CloudflareR2',
}

export const enum GeocoderService {
	OpenWeatherMap = 'OpenWeatherMap',
	GoogleMaps = 'GoogleMaps',
	WUnderground = 'WUnderground',
}

export const enum GeocoderCache {
	NullStore = 'NullStore',
	CloudflareKV = 'CloudflareKV',
}

export const enum TimeZoneLookupService {
	OpenWeatherMap = 'OpenWeatherMap',
	GoogleMaps = 'GoogleMaps',
}

export const enum WateringScaleCache {
	CloudflareCache = 'CloudflareCache',
}

// Define regex filters to match against location
export const REGEX = {
	GPS: /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
	PWS: /^(?:pws|icao|zmw):/,
	TIME: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2})(\d{2})/,
	TIMEZONE: /^()()()()()()([+-])(\d{2})(\d{2})/
}

export enum ErrorCode {
	/** No error occurred. This code should be included with all successful responses because the firmware expects some
	 * code to be present.
	 */
	NoError = 0,

	/** The watering scale could not be calculated due to a problem with the weather information. */
	BadWeatherData = 1,
	/** Data for a full 24 hour period was not available. */
	InsufficientWeatherData = 10,
	/** A necessary field was missing from weather data returned by the API. */
	MissingWeatherField = 11,
	/** An HTTP or parsing error occurred when retrieving weather information. */
	WeatherApiError = 12,

	/** The specified location name could not be resolved. */
	LocationError = 2,
	/** An HTTP or parsing error occurred when resolving the location. */
	LocationServiceApiError = 20,
	/** No matches were found for the specified location name. */
	NoLocationFound = 21,
	/** The location name was specified in an invalid format (e.g. a PWS ID). */
	InvalidLocationFormat = 22,

	/** An Error related to personal weather stations. */
	PwsError = 3,
	/** The PWS ID did not use the correct format. */
	InvalidPwsId = 30,
	/** The PWS API key did not use the correct format. */
	InvalidPwsApiKey = 31,
	// TODO use this error code.
	/** The PWS API returned an error because a bad API key was specified. */
	PwsAuthenticationError = 32,
	/** A PWS was specified but the data for the specified AdjustmentMethod cannot be retrieved from a PWS. */
	PwsNotSupported = 33,
	/** A PWS is required by the WeatherProvider but was not provided. */
	NoPwsProvided = 34,

	/** An error related to AdjustmentMethods or watering restrictions. */
	AdjustmentMethodError = 4,
	/** The WeatherProvider is incompatible with the specified AdjustmentMethod. */
	UnsupportedAdjustmentMethod = 40,
	/** An invalid AdjustmentMethod ID was specified. */
	InvalidAdjustmentMethod = 41,

	/** An error related to adjustment options (wto). */
	AdjustmentOptionsError = 5,
	/** The adjustment options could not be parsed. */
	MalformedAdjustmentOptions = 50,
	/** A required adjustment option was not provided. */
	MissingAdjustmentOption = 51,

	/** An error was not properly handled and assigned a more specific error code. */
	UnexpectedError = 99
}