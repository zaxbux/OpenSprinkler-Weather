import { ErrorCode } from '@/constants';
import { WeatherProviderID } from '@/types';

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

/**
 * The data used to return a response to requests from the web app.
 */
export interface IWeatherData {
	// The following properties are currently used by the web app.

	weatherProvider: WeatherProviderID,
	temp: number
	icon: string
	description: string
	forecast: WeatherForecastDaily[]

	// The following are currently unused.

	humidity: undefined
	wind: undefined
	region: undefined
	city: undefined
	minTemp: undefined // Does not make sense to include in current, should use forecast data instead
	maxTemp: undefined // Does not make sense to include in current, should use forecast data instead
	precip: undefined
}

/**
 * The data used to return a response to requests from the controller/firmware.
 */
export interface IWateringData {
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