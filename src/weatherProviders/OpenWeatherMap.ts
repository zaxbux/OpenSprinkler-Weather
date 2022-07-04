import { GeoCoordinates, OpenWeatherMap_OneCall_30, WeatherData,  WeatherProviderShortID, ZimmermanWateringData } from "@/types";
import { approximateSolarRadiation, CloudCoverInfo, EToData } from "@/adjustmentMethods/EToAdjustmentMethod";
import moment from "moment";
import { CodedError, ConfigurationError } from "@/errors";
import { httpJSONRequest } from '@/http';
import { ErrorCode } from '@/constants';
import { Env } from '@/bindings';
import { AbstractWeatherProvider } from '.';

const enum Units {
	Standard = 'standard',
	Metric = 'metric',
	Imperial = 'imperial',
}

export class OpenWeatherMap extends AbstractWeatherProvider {
	protected readonly ID = WeatherProviderShortID.OpenWeatherMap
	protected static BASE_URI = 'https://api.openweathermap.org/data/3.0'
	private readonly API_KEY: string;

	public constructor(apiKey: string) {
		super();
		this.API_KEY = apiKey;
	}

	public async getWateringData(parameters: { coordinates: GeoCoordinates }): Promise<ZimmermanWateringData> {
		const { coordinates } = parameters
		// The OWM free API options changed so need to use the new API method

		// Perform the HTTP request to retrieve the weather data
		//let forecast: { hourly: OWM_API_25_Onecall_Response['hourly'] };
		try {

			const { hourly } = await this.callAPI<OpenWeatherMap_OneCall_30.Response>('onecall', coordinates, ['current', 'minutely', 'daily', 'alerts'])

			// The new API call only offers 48 hours of hourly forecast data which is fine because we only use 24 hours
			// just need to translate the data into blocks of 3 hours and then use as normal.
			// Could probably skip this but less chance of changing the output this way
			if (!hourly) {
				throw new CodedError(ErrorCode.MissingWeatherField);
			}

			const forecast = this.get3hForecast(hourly, 24);

			// Indicate watering data could not be retrieved if the forecast data is incomplete.
			if (!forecast || !forecast.hourly) {
				throw new CodedError(ErrorCode.MissingWeatherField);
			}

			let totalTemp = 0,
				totalHumidity = 0,
				totalPrecip = 0;

			const periods = Math.min(forecast.hourly.length, 8);
			for (let index = 0; index < periods; index++) {
				totalTemp += parseFloat(forecast.hourly[index].main.temp);
				totalHumidity += parseInt(forecast.hourly[index].main.humidity);
				totalPrecip += (forecast.hourly[index].rain ? parseFloat(forecast.hourly[index].rain["3h"] || 0) : 0);
			}

			return {
				weatherProvider: this.ID,
				temp: totalTemp / periods,
				humidity: totalHumidity / periods,
				precip: totalPrecip,
				raining: (forecast.hourly[0].rain ? (parseFloat(forecast.hourly[0].rain["3h"] || 0) > 0) : false)
			};

		} catch (err) {
			console.error("Error retrieving weather information from OWM:", err);
			throw new CodedError(ErrorCode.WeatherApiError);
		}
	}


	public async getWeatherData(parameters: { coordinates: GeoCoordinates }): Promise<WeatherData> {
		// The OWM free API options changed so need to use the new API method
		//let current, forecast;
		try {
			const { current, daily } = await this.callAPI<OpenWeatherMap_OneCall_30.Response>('onecall', parameters.coordinates, ['minutely', 'hourly', 'alerts'])

			// Check for required properties
			if (!current || !daily || !current.temp || !current.feels_like || !current.pressure || !current.humidity || !current.wind_speed || !current.wind_deg || !current.weather) {
				throw new Error(`Required parameters missing from weather service API response.`)
			}

			return {
				weatherProvider: this.ID,
				temp: Math.round(current.temp),
				humidity: Math.round(current.humidity),
				wind: Math.round(current.wind_speed),
				description: current.weather[0].description,
				icon: current.weather[0].icon,
				region: null,
				city: null,
				minTemp: Math.round(daily[0].temp.min),
				maxTemp: Math.round(daily[0].temp.max),
				precip: daily[0].rain ?? 0,
				forecast: daily.map(data => ({
					temp_min: Math.round(data.temp.min),
					temp_max: Math.round(data.temp.max),
					date: Math.round(data.dt),
					icon: data.weather[0].icon,
					description: data.weather[0].description,
				}))
			}
		} catch (err) {
			console.error("Error retrieving weather information from OWM:", err);
			throw "An error occurred while retrieving weather information from OWM."
		}
	}

	// Uses a rolling window since forecast data from further in the future (i.e. the next full day) would be less accurate.
	async getEToData(parameters: { coordinates: GeoCoordinates }): Promise<EToData> {
		// The OWM API changed what you get on the free subscription so need to adjust the call and translate the data.

		// Perform the HTTP request to retrieve the weather data
		//let forecast: { hourly: OWM_API_25_Onecall_Response['hourly'] };
		//let hourlyForecast: OWM_API_25_Onecall_Response;
		try {
			const { hourly } = await this.callAPI<OpenWeatherMap_OneCall_30.Response>('onecall', parameters.coordinates, ['current', 'minutely', 'daily', 'alerts'])

			// translating the hourly into a 3h forecast again could probably ditch the translation
			// but to be safe just sticking with the 3h translation
			if (!hourly) {
				throw new CodedError(ErrorCode.InsufficientWeatherData);
			}

			const forecast = this.get3hForecast(hourly, 24);


		// Indicate ETo data could not be retrieved if the forecast data is incomplete.
		if (!forecast || !forecast.hourly || forecast.hourly.length < 8) {
			throw new CodedError(ErrorCode.InsufficientWeatherData);
		}

		// Take a sample over 24 hours.
		const samples = forecast.hourly.slice(0, 8);

		const cloudCoverInfo: CloudCoverInfo[] = samples.map((window): CloudCoverInfo => ({
			startTime: moment.unix(window.dt),
			endTime: moment.unix(window.dt).add(3, "hours"),
			cloudCover: window.clouds / 100,
		}))

		let minTemp: number | undefined = undefined,
			maxTemp: number | undefined = undefined;
		let minHumidity: number | undefined = undefined,
			maxHumidity: number | undefined = undefined;
		// Skip hours where measurements don't exist to prevent result from being NaN.
		for (const sample of samples) {
			const temp: number = sample.main.temp;
			if (temp !== undefined) {
				// If minTemp or maxTemp is undefined, these comparisons will yield false.
				minTemp = minTemp! < temp ? minTemp : temp;
				maxTemp = maxTemp! > temp ? maxTemp : temp;
			}

			const humidity: number = sample.main.humidity;
			if (humidity !== undefined) {
				// If minHumidity or maxHumidity is undefined, these comparisons will yield false.
				minHumidity = minHumidity! < humidity ? minHumidity : humidity;
				maxHumidity = maxHumidity! > humidity ? maxHumidity : humidity;
			}
		}

		return {
			weatherProvider: this.ID,
			periodStartTime: samples[0].dt,
			minTemp,
			maxTemp,
			minHumidity,
			maxHumidity,
			solarRadiation: approximateSolarRadiation(cloudCoverInfo, parameters.coordinates),
			// Assume wind speed measurements are taken at 2 meters.
			windSpeed: samples.reduce((sum, window) => sum + (window.wind.speed || 0), 0) / samples.length,
			// OWM always returns precip in mm, so it must be converted.
			precip: samples.reduce((sum, window) => sum + (window.rain ? window.rain["3h"] || 0 : 0), 0)
		};

	} catch (err) {
		console.error("Error retrieving ETo information from OWM:", err);
		throw new CodedError(ErrorCode.WeatherApiError);
	}
	}

	// Expects an array of at least 3 hours of forecast data from the API's onecall method
	// Returns an aggregated object for the first 3 hours of the hourly array, should be equivalent to the
	// 3 hour object from the 5 day forecast
	private getPeriod3hObject(hourly: OpenWeatherMap_OneCall_30.ForecastHourly[]) {

		let period3h = {
			dt: 0,
			main: {
				temp: 0.0,
				feels_like: 0.0,
				temp_min: 0.0,
				temp_max: 0.0,
				pressure: 0,
				sea_level: 0,
				grnd_level: 0,
				humidity: 0,
				temp_kf: 0.0
			},
			weather: [
				{
					id: 0,
					main: "",
					description: "",
					icon: ""
				}
			],
			clouds: {
				all: 0
			},
			wind: {
				speed: 0.0,
				deg: 0,
				gust: 0.0
			},
			visibility: 0,
			pop: 0.0,
			rain: {
				"3h": 0.0
			},
			sys: {
				pod: ""
			},
			dt_txt: ""
		};

		if (hourly && hourly.length > 2 && hourly[2].dt) {

			// Some of the fields aren't available in the new call so not worth trying to do a full translation
			for (let index = 0; index < 3; index++) {
				let hour = hourly[index];

				period3h.main.temp += hour.temp;
				period3h.main.temp_min = period3h.main.temp_min > hour.temp || index == 0 ? hour.temp : period3h.main.temp_min;
				period3h.main.temp_max = period3h.main.temp_max < hour.temp || index == 0 ? hour.temp : period3h.main.temp_max;
				period3h.main.humidity += hour.humidity;
				period3h.wind.speed += hour.wind_speed;
				period3h.rain['3h'] += hour.rain?.['1h'] || 0.0
				period3h.clouds.all += hour.clouds;
			}

			// Defaulting to floor to err on the side of more watering
			period3h.main.temp = period3h.main.temp / 3;
			period3h.main.humidity = Math.floor(period3h.main.humidity / 3);
			period3h.wind.speed = period3h.wind.speed / 3;
			period3h.clouds.all = Math.floor(period3h.clouds.all / 3);

			period3h.dt = hourly[0].dt;
		}

		return period3h;
	}

	// Expects an array of hourly forecast data from the API's onecall method
	// Returns a minimally equivalent object to the previous 5 day forecast API call
	private get3hForecast(hourly: OpenWeatherMap_OneCall_30.ForecastHourly[], hours: number = 24) {
		let results: any[] = []

		if (hourly.length < 3) {
			throw new Error(`Not enough data`)
		}

		for (let i = 0; i < hours; i++) {
			if (i % 3 == 0) {
				results.push(this.getPeriod3hObject(hourly.slice(i)));
			}
		}

		if (results.length > 0) {
			return { hourly: results }
		}

		throw new Error(`No data`)
	}

	private async callAPI<T>(uri: string, coordinates: GeoCoordinates, exclude: string[], units: Units = Units.Metric) {
		const params = new URLSearchParams({
			appid: this.API_KEY,
			lat: String(coordinates[0]),
			lon: String(coordinates[1]),
			units: units,
			...(exclude.length ? { exclude: exclude.join(',') } : {}),
		})
		return await httpJSONRequest<T>(`${OpenWeatherMap.BASE_URI}/${uri}?${params.toString()}`)
	}
}

export default function getWeatherProvider(env: Env): AbstractWeatherProvider {
	if (!env.OWM_API_KEY) {
		throw new ConfigurationError(`OWM_API_KEY is undefined.`)
	}

	return new OpenWeatherMap(env.OWM_API_KEY)
}