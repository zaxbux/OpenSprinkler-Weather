import { EToData } from "@/adjustmentMethods/ETo"
import { ZimmermanWateringData } from '@/adjustmentMethods/Zimmerman'
import { WeatherProvider } from '@/constants'
import { GeoCoordinates, TimeData, WeatherProviderShortID } from "@/types"
import { IWeatherData } from './types'

export interface WateringData {
	weatherProvider: WeatherProviderShortID
	timezone: number
	sunrise: number
	sunset: number
	data: ZimmermanWateringData
	location: GeoCoordinates
}

export interface WeatherData {
	timezone: number
	sunrise: number
	sunset: number
	data: IWeatherData
	location: GeoCoordinates
}

export abstract class AbstractWeatherProvider {
	public abstract getID(): string
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
	 * Calculates timezone and sunrise/sunset for the specified coordinates.
	 * @param coordinates The coordinates to use to calculate time data.
	 * @return The TimeData for the specified coordinates.
	 */
	public abstract getTimeData(coordinates: GeoCoordinates, env: Env): Promise<TimeData>

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