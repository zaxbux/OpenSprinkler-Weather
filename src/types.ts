/** Geographic coordinates. The 1st element is the latitude, and the 2nd element is the longitude. */
export type GeoCoordinates = [number, number];

export interface TimeData {
	/** The UTC offset, in minutes. This uses POSIX offsets, which are the negation of typically used offsets
	 * (https://github.com/eggert/tz/blob/2017b/etcetera#L36-L42).
	 */
	timezone: number;
	/** The time of sunrise, in minutes from UTC midnight. */
	sunrise: number;
	/** The time of sunset, in minutes from UTC midnight. */
	sunset: number;
}

export interface WeatherData {
	/** The WeatherProvider that generated this data. */
	weatherProvider: WeatherProviderShortID | WeatherProviderID;
	/** The current temperature (in Celsius). */
	temp: number;
	/** The current humidity (as a percentage). */
	humidity: number;
	/** The current wind speed (in meters per second). */
	wind: number;
	/** A human-readable description of the weather. */
	description: string;
	/** An icon ID that represents the current weather. This will be used in http://openweathermap.org/img/w/<ICON_ID>.png */
	icon: string;
	region: string;
	city: string;
	/** The forecasted minimum temperature for the current day (in Celsius). */
	minTemp: number;
	/** The forecasted minimum temperature for the current day (in Celsius). */
	maxTemp: number;
	/** The forecasted total precipitation for the current day (in millimeters). */
	precip: number;
	forecast: WeatherDataForecast[]
}

/** The forecasted weather for a specific day in the future. */
export interface WeatherDataForecast {
	/** The forecasted minimum temperature for this day (in Celsius). */
	temp_min: number;
	/** The forecasted maximum temperature for this day (in Celsius). */
	temp_max: number;
	/** The timestamp of the day this forecast is for (in Unix epoch seconds). */
	date: number;
	/** An icon ID that represents the weather at this forecast window. This will be used in http://openweathermap.org/img/w/<ICON_ID>.png */
	icon: string;
	/** A human-readable description of the weather. */
	description: string;
}

export interface BaseWateringData {
	/** The WeatherProvider that generated this data. */
	weatherProvider: WeatherProviderShortID;
	/** The total precipitation over the window (in millimeters). */
	precip: number;
}

/**
 * Data from a 24 hour window that is used to calculate how watering levels should be scaled. This should ideally use
 * historic data from the past day, but may also use forecasted data for the next day if historical data is not
 * available.
 */
export interface ZimmermanWateringData extends BaseWateringData {
	/** The average temperature over the window (in Celsius). */
	temp: number;
	/** The average humidity over the window (as a percentage). */
	humidity: number;
	/** A boolean indicating if it is raining at the time that this data was retrieved. */
	raining: boolean;
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