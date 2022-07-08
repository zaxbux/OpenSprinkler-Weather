import { ConfigurationError, InsufficientWeatherDataError, MissingWeatherFieldError, WeatherApiError } from "@/errors";
import { httpJSONRequest } from '@/http';
import { GeoCoordinates, OpenWeatherMap_Forecast5, OpenWeatherMap_OneCall_30, WeatherData, WeatherProviderID, WeatherProviderShortID } from "@/types";
import { approximateSolarRadiation, CloudCoverInfo } from '@/utils/solarRadiation';
import moment from "moment-timezone";
import { AbstractWeatherProvider, EToData, WateringData } from '.';

export class OpenWeatherMap extends AbstractWeatherProvider {
	protected readonly ID = WeatherProviderID.OpenWeatherMap
	protected readonly ID_SHORT = WeatherProviderShortID.OpenWeatherMap
	private readonly API_KEY: string;

	public constructor(apiKey: string) {
		super();
		this.API_KEY = apiKey;
	}

	public getID(): WeatherProviderShortID {
		return this.ID_SHORT
	}

	public async getWateringData(parameters: { coordinates: GeoCoordinates }): Promise<WateringData> {
		const { coordinates } = parameters

		// Perform the HTTP request to retrieve the weather data
		try {
			const forecast = await this.fetchForecast(coordinates)

			// Indicate watering data could not be retrieved if the forecast data is incomplete.
			if (!forecast || !forecast.list) {
				throw new MissingWeatherFieldError();
			}

			const periods = Math.min(forecast.list.length, 8)
			const forecastTotals = this.getForecastTotals(forecast.list, periods)

			//const timezone = forecast.city.timezone / 60
			//const  { sunrise, sunset } = getSolarTimes(parameters.coordinates, forecast.city.timezone / 60)

			return {
				weatherProvider: this.ID_SHORT,
				temp: forecastTotals.temp / periods,
				humidity: forecastTotals.humidity / periods,
				precip: forecastTotals.precip,
				raining: (forecast.list[0].rain ? ((forecast.list[0].rain?.['3h'] || 0) > 0) : false),
				timezone: forecast.city.timezone / 60,
				//sunrise,
				//sunset,
				location: coordinates,
			};

		} catch (err) {
			console.error("Error retrieving weather information from OWM:", err);
			throw new WeatherApiError();
		}
	}

	private getForecastTotals(forecast: OpenWeatherMap_Forecast5['list'], periods: number) {
		const totals = {
			temp: 0,
			humidity: 0,
			precip: 0,
		}

		for (let i = 0; i < periods; i++) {
			totals.temp += forecast[i].main.temp
			totals.humidity += forecast[i].main.humidity
			totals.precip += forecast[i].rain?.['3h'] || 0;
		}

		return totals
	}


	public async getWeatherData(parameters: { coordinates: GeoCoordinates, env: Env }): Promise<WeatherData> {
		try {
			const { timezone_offset, current, daily } = await this.fetchOneCall(parameters.coordinates, ['minutely', 'hourly', 'alerts'])

			// Check for required properties
			if (!current || !daily || !current.temp || !current.feels_like || !current.pressure || !current.humidity || !current.wind_speed || !current.wind_deg || !current.weather) {
				throw new Error(`Required parameters missing from weather service API response.`)
			}

			const timezone = timezone_offset / 60
			//const  { sunrise, sunset } = getSolarTimes(parameters.coordinates, timezone)

			return {
				timezone,
				//sunrise,
				//sunset,
				//location: parameters.coordinates,
				//data: {
					weatherProvider: this.ID,
					temp: Math.round(current.temp),
					icon: current.weather[0].icon,
					description: current.weather[0].description,
					humidity: undefined, // Math.round(current.humidity),
					wind: undefined, // Math.round(current.wind_speed),
					region: undefined, // null,
					city: undefined, // null,
					//minTemp: undefined, // Math.round(daily[0].temp.min),
					//maxTemp: undefined, // Math.round(daily[0].temp.max),
					precip: undefined, // daily[0].rain ?? 0,
					forecast: daily.map(data => ({
						temp_min: data.temp.min,
						temp_max: data.temp.max,
						date: Math.round(data.dt),
						icon: data.weather[0].icon,
						description: data.weather[0].description,
					}))
				//}
			}
		} catch (err) {
			console.error("Error retrieving weather information from OWM:", err);
			throw "An error occurred while retrieving weather information from OWM."
		}
	}

	async getEToData(parameters: { coordinates: GeoCoordinates }): Promise<EToData> {
		// Uses a rolling window since forecast data from further in the future (i.e. the next full day) would be less accurate.

		let forecast: OpenWeatherMap_Forecast5
		try {
			forecast = await this.fetchForecast(parameters.coordinates)

			// Indicate ETₒ data could not be retrieved if the forecast data is incomplete.
			if (!forecast || !forecast.list || forecast.list.length < 8) {
				throw new InsufficientWeatherDataError();
			}
		} catch (err) {
			console.error("Error retrieving ETₒ information from OWM:", err);
			throw new WeatherApiError();
		}

		// Take a sample over 24 hours.
		const samples = forecast.list.slice(0, 8);

		let minTemp: number = samples[0].main.temp,
			maxTemp: number = samples[0].main.temp;
		let minHumidity: number = samples[0].main.humidity,
			maxHumidity: number = samples[0].main.humidity;

		// Skip hours where measurements don't exist to prevent result from being NaN.
		for (const sample of samples) {
			const temp = sample.main.temp;
			if (temp !== undefined) {
				minTemp = Math.min(temp, minTemp)
				maxTemp = Math.max(temp, maxTemp)
			}

			const humidity = sample.main.humidity;
			if (humidity !== undefined) {
				minHumidity = Math.min(humidity, minHumidity)
				maxHumidity = Math.max(humidity, maxHumidity)
			}
		}

		return {
			periodStartTime: samples[0].dt,
			minTemp,
			maxTemp,
			minHumidity,
			maxHumidity,
			solarRadiation: approximateSolarRadiation(this.getCloudCoverInfo(samples), parameters.coordinates),
			// Assume wind speed measurements are taken at 2 meters.
			windSpeed: samples.reduce((sum, window) => sum + (window.wind.speed || 0), 0) / samples.length,
			precip: samples.reduce((sum, window) => sum + (window.rain?.['3h'] || 0), 0)
		};
	}

	private getCloudCoverInfo(samples: OpenWeatherMap_Forecast5['list']) {
		return samples.map((window): CloudCoverInfo => ({
			startTime: moment.unix(window.dt),
			endTime: moment.unix(window.dt).add(3, 'hours'),
			cloudCover: window.clouds.all / 100,
		}))
	}

	private async fetchOneCall(coordinates: GeoCoordinates, exclude: string[]) {
		const params = new URLSearchParams({
			appid: this.API_KEY,
			lat: String(coordinates[0]),
			lon: String(coordinates[1]),
			units: 'metric',
			...(exclude.length ? { exclude: exclude.join(',') } : {}),
		})
		return await httpJSONRequest<OpenWeatherMap_OneCall_30.Response>(`https://api.openweathermap.org/data/3.0/onecall?${params.toString()}`)
	}

	private async fetchForecast(coordinates: GeoCoordinates) {
		const params = new URLSearchParams({
			appid: this.API_KEY,
			lat: String(coordinates[0]),
			lon: String(coordinates[1]),
			units: 'metric',
		})
		return await httpJSONRequest<OpenWeatherMap_Forecast5>(`https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`)
	}
}

export default function getWeatherProvider(env: Env): AbstractWeatherProvider {
	if (!env.OWM_API_KEY) {
		throw new ConfigurationError(`OWM_API_KEY is undefined.`)
	}

	return new OpenWeatherMap(env.OWM_API_KEY)
}