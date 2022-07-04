import { GeoCoordinates, PWS, WeatherData, WeatherProviderShortID, ZimmermanWateringData } from "@/types"
import { EToData } from "@/adjustmentMethods/EToAdjustmentMethod"
import type { Env } from '@/bindings'
import { WeatherProvider } from '@/constants'

export abstract class AbstractWeatherProvider {
	/**
	 * Retrieves weather data necessary for Zimmerman watering level calculations.
	 * @param parameters.coordinates The coordinates to retrieve the watering data for.
	 * @param parameters.pws The PWS to retrieve the weather from, or undefined if a PWS should not be used. If the implementation
	 * of this method does not have PWS support, this parameter may be ignored and coordinates may be used instead.
	 * @return A Promise that will be resolved with the ZimmermanWateringData if it is successfully retrieved,
	 * or rejected with a CodedError if an error occurs while retrieving the {@link ZimmermanWateringData} (or the WeatherProvider
	 * does not support this method).
	 * @throws {CodedError}
	 */
	abstract getWateringData(parameters: { coordinates: GeoCoordinates, pws?: PWS }): Promise<ZimmermanWateringData>

	/**
	 * Retrieves the current weather data for usage in the mobile app.
	 * @param parameters.coordinates The coordinates to retrieve the weather for
	 * @return A Promise that will be resolved with the WeatherData if it is successfully retrieved,
	 * or rejected with an error message if an error occurs while retrieving the WeatherData or the WeatherProvider does
	 * not support this method.
	 */
	abstract getWeatherData(parameters: { coordinates: GeoCoordinates }): Promise<WeatherData>

	/**
	 * Retrieves the data necessary for calculating potential ETo.
	 * @param parameters.coordinates The coordinates to retrieve the data for.
	 * @return A Promise that will be resolved with the {@link EToData} if it is successfully retrieved, or rejected with a
	 * CodedError if an error occurs while retrieving the EToData (or the WeatherProvider does not support this method).
	 */
	abstract getEToData(parameters: { coordinates: GeoCoordinates }): Promise<EToData>

	/**
	 * Returns a boolean indicating if watering scales calculated using data from this WeatherProvider should be cached
	 * until the end of the day in timezone the data was for.
	 * @return a boolean indicating if watering scales calculated using data from this WeatherProvider should be cached.
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