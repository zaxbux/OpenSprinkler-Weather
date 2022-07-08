/** Geographic coordinates in decimal format: `[ latitude, longitude ]` */
export type GeoCoordinates = readonly [number, number]


/**
 * Required properties for a response to the weatherData endpoint.
 */
export interface WeatherDataResponse {
	weatherProvider: WeatherProviderShortID | WeatherProviderID,
	timezone: number
	sunrise: number
	sunset: number
	temp: number
	icon: string
	description: string
	forecast: WeatherForecastDaily[]
	location: GeoCoordinates
}

/**
 * Required parameters for a response to the wateringData endpoint.
 */
export interface WateringDataResponse {
	errCode: number
	scale?: number
	/** This parameter should not be cached. */
	sunrise?: number
	/** This parameter should not be cached. */
	sunset?: number
	eip?: number
	tz?: number
	rd?: number
	rawData?: Record<string, string | number | object | undefined>
}

// interface TimeData {
// 	/** The UTC offset, in minutes. This uses POSIX offsets, which are the negation of typically used offsets
// 	 * (https://github.com/eggert/tz/blob/2017b/etcetera#L36-L42).
// 	 */
// 	timezone: number;
// 	/** The time of sunrise, in minutes from UTC midnight. */
// 	sunrise: number;
// 	/** The time of sunset, in minutes from UTC midnight. */
// 	sunset: number;
// }

/**
 * Data used to make response for the web app.
 */
export interface WeatherData {
	/** The WeatherProvider that generated this data. */
	weatherProvider: WeatherProviderShortID | WeatherProviderID;
	/** The current temperature (in Celsius). */
	temp: number;
	/** A human-readable description of the weather. */
	description: string;
	/** An icon ID that represents the current weather. This will be used in http://openweathermap.org/img/w/<ICON_ID>.png */
	icon: string;
	/** Daily forecasts */
	forecast: WeatherForecastDaily[]

	// These are used internally, not used by web-app
	timezone: number

	// These properties are not used, yet

	/** The current humidity (as a percentage). */
	humidity?: number;
	/** The current wind speed (in meters per second). */
	wind?: number;
	region?: string;
	city?: string;
	/** The forecasted minimum temperature for the current day (in Celsius). */
	// minTemp?: number; // It does not make sense to have these values here, already in forecast
	/** The forecasted minimum temperature for the current day (in Celsius). */
	// maxTemp?: number; // It does not make sense to have these values here, already in forecast
	/** The forecasted total precipitation for the current day (in millimeters). */
	precip?: number;
}

/** The forecasted weather for a specific day in the future. */
export interface WeatherForecastDaily {
	/** Timestamp of the date of the forecast. (Unix, UTC) */
	date: number
	/** OpenWeatherMap Icon ID {@link https://openweathermap.org/weather-conditions#Icon-list}*/
	icon: string
	/** Human-readable description of the weather. */
	description: string
	/** Forecasted minimum temperature (Celsius). */
	temp_min: number
	/** Forecasted maximum temperature (Celsius). */
	temp_max: number
}

import { ErrorCode } from '@/constants';

/**
 * The data used to return a response to requests from the controller/firmware.
 */
export interface WateringData {
	/**
	 * Error code - `errCode`.
	 */
	errorCode: ErrorCode

	/**
	 * Watering scale - `scale`.
	 *
	 * Value is a percentage in the range [0, 250]
	 */
	scale?: number

	/**
	 * Sunrise time - `sunrise`.
	 *
	 * Value is the number of minutes since 00:00 (UTC)
	 */
	sunrise?: number

	/**
	 * Sunset time - `sunset`.
	 *
	 * Value is the number of minutes since 00:00 (UTC)
	 */
	sunset?: number

	/**
	 * IP Address - `eip`.
	 *
	 * Value is the IPv4 address of where the request originated from.
	 */
	externalIP?: string

	/**
	 * Timezone offset - `tz`.
	 *
	 * Value is the UTC offset in minutes.
	 */
	timezone: number

	/**
	 * Rain delay - `rd`.
	 *
	 * Value is either:
	 * * Number of hours watering should be delayed by.
	 * * `undefined` if watering should not delayed for a specific amount of time (either it should be delayed indefinitely or it should not be delayed at all).
	 *
	 * This property will not stop watering on its own, and the `scale` property should be set to 0 to actually prevent watering.
	 */
	rainDelay?: number

	/**
	 * Raw data - `rawData`. (Not parsed by the firmware)
	 *
	 * Value is the raw data that was used to calculate the watering scale. If no data was used (e.g. an error occurred), this should be undefined.
	 *
	 * This will be sent directly to the OS controller, so each field should be formatted in a way that the controller understands and numbers should be rounded appropriately to remove excessive figures.
	 */
	rawData?: Record<string, any>
}

export const enum WeatherProviderID {
	Mock = "mock",
	Local = "local",
	OpenWeatherMap = "OWM",
}

export const enum WeatherProviderShortID {
	Mock = "mock",
	Local = "local",
	OpenWeatherMap = "OWM",
}

export namespace OpenWeatherMap_OneCall_30 {
	export interface CurrentWeather {
		/**  Current time, Unix, UTC */
		dt: number
		/**  Sunrise time, Unix, UTC */
		sunrise: number
		/**  Sunset time, Unix, UTC */
		sunset: number
		/**  Temperature. Units - default: kelvin, metric: Celsius, imperial: Fahrenheit. How to change units used */
		temp: number
		/**  Temperature. This temperature parameter accounts for the human perception of weather. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit.  */
		feels_like: number
		/**  Atmospheric pressure on the sea level, hPa */
		pressure: number
		/**  Humidity, % */
		humidity: number
		/**  Atmospheric temperature (varying according to pressure and humidity) below which water droplets begin to condense and dew can form. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit. */
		dew_point: number
		/**  Cloudiness, % */
		clouds: number
		/**  Current UV index */
		uvi: number
		/**  Average visibility, metres. The maximum value of the visibility is 10km */
		visibility: number
		/**  Wind speed. Wind speed. Units – default: metre/sec, metric: metre/sec, imperial: miles/hour. How to change units used */
		wind_speed: number
		/**  Wind gust. Units – default: metre/sec, metric: metre/sec, imperial: miles/hour. How to change units used */
		wind_gust?: number
		/**  Wind direction, degrees (meteorological) */
		wind_deg: number
		/**   */
		rain?: {
			/**  Rain volume for last hour, mm */
			'1h'?: number
		}
		snow?: {
			/**  Snow volume for last hour, mm */
			'1h'?: number
		}

		weather: Weather[]

	}

	export interface Weather {
		/**  Weather condition id */
		id: number
		/**  Group of weather parameters (Rain, Snow, Extreme etc.) */
		main: string
		/**  Weather condition within the group (full list of weather conditions). */
		description: string
		/**  Weather icon id. How to get icons */
		icon: string
	}

	export interface Alert {
		/**  Name of the alert source. Please read here the full list of alert sources */
		sender_name: string
		/**  Alert event name */
		event: string
		/**  Date and time of the start of the alert, Unix, UTC */
		start: number
		/**  Date and time of the end of the alert, Unix, UTC */
		end: number
		/**  Description of the alert */
		description: string
		/**  Type of severe weather */
		tags: string[]
	}

	export interface ForecastDaily {
		/**  Time of the forecasted data, Unix, UTC */
		dt: number
		/**  Sunrise time, Unix, UTC */
		sunrise: number
		/**  Sunset time, Unix, UTC */
		sunset: number
		/**  The time of when the moon rises for this day, Unix, UTC */
		moonrise: number
		/**  The time of when the moon sets for this day, Unix, UTC */
		moonset: number
		/**  Moon phase. 0: number and 1: number are 'new moon', 0.25: number is 'first quarter moon', 0.5: number is 'full moon' and 0.75: number is 'last quarter moon'. The periods in between are called 'waxing crescent', 'waxing gibous', 'waning gibous', and 'waning crescent', respectively. */
		moon_phase: number
		/**  Units – default: kelvin, metric: Celsius, imperial: Fahrenheit. How to change units used */
		temp:
		{
			/**  Morning temperature. */
			morn: number
			/**  Day temperature. */
			day: number
			/**  Evening temperature. */
			eve: number
			/**  Night temperature. */
			night: number
			/**  Min daily temperature. */
			min: number
			/**  Max daily temperature. */
			max: number
		}

		/**  This accounts for the human perception of weather. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit. How to change units used */
		feels_like:
		{
			/**  Morning temperature. */
			morn: number
			/**  Day temperature. */
			day: number
			/**  Evening temperature. */
			eve: number
			/**  Night temperature.  */
			night: number
		}

		/**  Atmospheric pressure on the sea level, hPa */
		pressure: number
		/**  Humidity, % */
		humidity: number
		/**  Atmospheric temperature (varying according to pressure and humidity) below which water droplets begin to condense and dew can form. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit. */
		dew_point: number
		/**  Wind speed. Units – default: metre/sec, metric: metre/sec, imperial: miles/hour. How to change units used */
		wind_speed: number
		/**  Wind gust. Units – default: metre/sec, metric: metre/sec, imperial: miles/hour. How to change units used */
		wind_gust?: number
		/**  Wind direction, degrees (meteorological) */
		wind_deg: number
		/**  Cloudiness, % */
		clouds: number
		/**  The maximum value of UV index for the day */
		uvi: number
		/**  Probability of precipitation. The values of the parameter vary between 0 and 1, where 0 is equal to 0%, 1 is equal to 100% */
		pop: number
		/**  Precipitation volume, mm */
		rain?: number
		/**  Snow volume, mm */
		snow?: number
		weather: Weather[]
	}

	export interface ForecastHourly {
		/**  Time of the forecasted data, Unix, UTC */
		dt: number
		/**  Temperature. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit. How to change units used */
		temp: number
		/**  Temperature. This accounts for the human perception of weather. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit.  */
		feels_like: number
		/**  Atmospheric pressure on the sea level, hPa */
		pressure: number
		/**  Humidity, % */
		humidity: number
		/**  Atmospheric temperature (varying according to pressure and humidity) below which water droplets begin to condense and dew can form. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit. */
		dew_point: number
		/**  UV index */
		uvi: number
		/**  Cloudiness, % */
		clouds: number
		/**  Average visibility, metres. The maximum value of the visibility is 10km */
		visibility: number
		/**  Wind speed. Units – default: metre/sec, metric: metre/sec, imperial: miles/hour.How to change units used */
		wind_speed: number
		/**  Wind gust. Units – default: metre/sec, metric: metre/sec, imperial: miles/hour. How to change units used */
		wind_gust?: number
		/**  Wind direction, degrees (meteorological) */
		wind_deg: number
		/**  Probability of precipitation. The values of the parameter vary between 0 and 1, where 0 is equal to 0%, 1 is equal to 100% */
		pop: number
		/**   */
		rain?: {
			/** Rain volume for last hour, mm */
			'1h'?: number
		}
		/**   */
		snow?: {
			/** Snow volume for last hour, mm */
			'1h'?: number
		}

		weather: Weather[]
	}

	export interface ForecastMinutely {
		/**  Time of the forecasted data, unix, UTC */
		dt: number
		/**  Precipitation volume, mm */
		precipitation: number
	}

	export interface Response {
		/**  Geographical coordinates of the location (latitude) */
		lat: number

		/**  Geographical coordinates of the location (longitude) */
		lon: number

		/**  Timezone name for the requested location */
		timezone: string

		/**  Shift in seconds from UTC */
		timezone_offset: number

		/**  Current weather data API response */
		current?: CurrentWeather
		/**  Minute forecast weather data API response */
		minutely?: ForecastMinutely[]
		/**  Hourly forecast weather data API response */
		hourly?: ForecastHourly[]

		/**  Daily forecast weather data API response */
		daily?: ForecastDaily[]

		/**  National weather alerts data from major national weather warning systems */
		alerts?: Alert[]
	}
}

export interface OpenWeatherMap_Forecast5 {
	/** Internal parameter */
	//cod: number
	/** Internal parameter */
	//message: number
	/** A number of timestamps returned in the API response */
	cnt: number
	list: {
		/** Time of data forecasted, unix, UTC */
		dt: number
		main: {
			/** Temperature. Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit. */
			temp: number
			/** This temperature parameter accounts for the human perception of weather. Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit. */
			feels_like: number
			/** Minimum temperature at the moment of calculation. This is minimal forecasted temperature (within large megalopolises and urban areas), use this parameter optionally. Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit. */
			temp_min: number
			/** Maximum temperature at the moment of calculation. This is maximal forecasted temperature (within large megalopolises and urban areas), use this parameter optionally. Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit. */
			temp_max: number
			/** Atmospheric pressure on the sea level by default, hPa */
			pressure: number
			/** Atmospheric pressure on the sea level, hPa */
			sea_level: number
			/** Atmospheric pressure on the ground level, hPa */
			grnd_level: number
			/** Humidity, % */
			humidity: number
			/** Internal parameter */
			temp_kf: number
		}

		weather: {
			/** Weather condition id */
			id: number
			/** Group of weather parameters (Rain, Snow, Extreme etc.) */
			main: string
			/** Weather condition within the group. You can get the output in your language. */
			description: string
			/** Weather icon id */
			icon: string
		}
		clouds: {
			/** Cloudiness, % */
			all: number
		}
		wind: {
			/** Wind speed. Unit Default: meter/sec, Metric: meter/sec, Imperial: miles/hour. */
			speed: number
			/** Wind direction, degrees (meteorological) */
			deg: number
			/** Wind gust. Unit Default: meter/sec, Metric: meter/sec, Imperial: miles/hour */
			gust: number
		}
		/** Average visibility, metres. The maximum value of the visibility is 10km */
		visibility: number
		/** Probability of precipitation. The values of the parameter vary between 0 and 1, where 0 is equal to 0%, 1 is equal to 100% */
		pop: number
		rain?: {
			/** Rain volume for last 3 hours, mm */
			'3h': number
		}
		snow?: {
			/** Snow volume for last 3 hours */
			'3h': number
		}
		sys: {
			/** Part of the day (n - night, d - day) */
			pod: number
		}
		/** Time of data forecasted, ISO, UTC */
		dt_txt: string
	}[]
	city: {
		/** City ID */
		id: number
		/** City name */
		name: string
		coord: {
			/** City geo location, latitude */
			lat: number
			/** City geo location, longitude */
			lon: number
		}
		/** Country code (GB, JP etc.) */
		country: string
		/** population  */
		population: number
		/** Shift in seconds from UTC */
		timezone: number
		/** Sunrise time, Unix, UTC */
		sunrise: number
		/** Sunset time, Unix, UTC */
		sunset: number
	}
}