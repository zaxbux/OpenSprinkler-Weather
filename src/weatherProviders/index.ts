import { WeatherProvider } from '@/constants'
import { GeoCoordinates, WeatherData, WeatherProviderShortID } from "@/types"

/**
 * Data used to calculate ETo. This data should be taken from a 24 hour time window.
 */
 export interface EToData {
	/** The Unix epoch seconds timestamp of the start of this 24 hour time window. */
	periodStartTime: number;
	/** The minimum temperature over the time period (in Celsius). */
	minTemp: number;
	/** The maximum temperature over the time period (in Celsius). */
	maxTemp: number;
	/** The minimum relative humidity over the time period (as a percentage). */
	minHumidity: number;
	/** The maximum relative humidity over the time period (as a percentage). */
	maxHumidity: number;
	/** The solar radiation, accounting for cloud coverage (in kilowatt hours per square meter per day). */
	solarRadiation: number;
	/**
	 * The average wind speed measured at 2 meters over the time period (in meters per second). A measurement taken at a
	 * different height can be standardized to 2m using the `standardizeWindSpeed` function in EToAdjustmentMethod.
	 */
	windSpeed: number;

	/** The total precipitation over the window (in millimeters). */
	precip: number;
}

/**
 * Data from a 24 hour window that is used to calculate how watering levels should be scaled. This should ideally use
 * historic data from the past day, but may also use forecasted data for the next day if historical data is not
 * available.
 */
export interface ZimmermanWateringData {
	/** The average temperature over the window (in Celsius). */
	temp: number
	/** The average humidity over the window (as a percentage). */
	humidity: number
	/** A boolean indicating if it is raining at the time that this data was retrieved. */
	raining: boolean
}

export interface WateringData extends ZimmermanWateringData {
	weatherProvider: WeatherProviderShortID
	/** UTC Time Zone offset (in minutes) */
	timezone: number
	/** The total precipitation over the window (in millimeters). */
	precip: number;
	location: GeoCoordinates
}

export abstract class AbstractWeatherProvider {
	public abstract getID(): WeatherProviderShortID
	/**
	 * Retrieves weather data necessary for Zimmerman watering level calculations.
	 * @param parameters.coordinates The coordinates to retrieve the watering data for.
	 * @return A Promise that will be resolved with the ZimmermanWateringData if it is successfully retrieved, or rejected with a CodedError if an error occurs while retrieving the {@link ZimmermanWateringData} (or the WeatherProvider does not support this method).
	 * @throws {CodedError}
	 */
	public abstract getWateringData(parameters: { coordinates: GeoCoordinates }): Promise<WateringData>

	/**
	 * Retrieves the current weather data for usage in the mobile app.
	 * @param parameters.coordinates The coordinates to retrieve the weather for
	 * @return A Promise that will be resolved with the WeatherData if it is successfully retrieved,
	 * or rejected with an error message if an error occurs while retrieving the WeatherData or the WeatherProvider does
	 * not support this method.
	 */
	public abstract getWeatherData(parameters: { coordinates: GeoCoordinates, [key: string]: any }): Promise<WeatherData>

	/**
	 * Retrieves the data necessary for calculating potential ETo.
	 * @param parameters.coordinates The coordinates to retrieve the data for.
	 * @return A Promise that will be resolved with the {@link EToData} if it is successfully retrieved, or rejected with a
	 * CodedError if an error occurs while retrieving the EToData (or the WeatherProvider does not support this method).
	 */
	public abstract getEToData(parameters: { coordinates: GeoCoordinates }): Promise<EToData>

	/**
	 * Indicates if a watering scale calculated using data from this WeatherProvider should be cached.
	 * The watering scale will be cached until the end of the day in timezone the data was for.
	 */
	public shouldCacheWateringScale(): boolean {
		return false
	}
}

export const getWeatherProvider = async (env: Env): Promise<AbstractWeatherProvider> => {
	const { WEATHER_PROVIDER } = env
	switch (WEATHER_PROVIDER as string) {
		case WeatherProvider.OpenWeatherMap:
			return (await import('@/weatherProviders/OpenWeatherMap')).default(env)
	}

	throw new Error(`Unknown weather provider (${WEATHER_PROVIDER})`)
}