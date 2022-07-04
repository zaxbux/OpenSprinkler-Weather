import { GeoCoordinates, PWS, WeatherData, WeatherProviderShortID, ZimmermanWateringData } from "@/types";
import { CodedError } from "@/errors";
import { ErrorCode } from '@/constants';
import { AbstractWeatherProvider } from '.';
import { httpJSONRequest } from '@/http';
import { EToData } from '@/adjustmentMethods/EToAdjustmentMethod';

const enum Units {
	English = 'e',
	Metric = 'm',
	Hybrid = 'h',
}

interface WUnderground_PWS_Response {
	observations: {
		epoch: number | null
		humidityAvg: number | null
		humidityHigh: number | null
		humidityLow: number | null
		lat: number | null
		lon: number | null
		obsTimeLocal: string | null
		obsTimeUtc: string | null
		solarRadiationHigh: number | null
		stationID: string
		tz: string | null
		uvHigh: number | null
		winddirAvg: number | null
		metric: {
			/** Celsius */
			dewptAvg: number | null
			/** Celsius */
			dewptHigh: number | null
			/** Celsius */
			dewptLow: number | null
			/** Celsius */
			heatindexAvg: number | null
			/** Celsius */
			heatindexHigh: number | null
			/** Celsius */
			heatindexLow: number | null
			/** mm */
			precipRate: number | null
			/** mm */
			precipTotal: number | null
			/** mb */
			pressureMax: number | null
			/** mb */
			pressureMin: number | null
			/** mb */
			pressureTrend: number | null
			qcStatus: number
			/** Celsius */
			tempAvg: number | null
			/** Celsius */
			tempHigh: number | null
			/** Celsius */
			tempLow: number | null
			/** Celsius */
			windchillAvg: number | null
			/** Celsius */
			windchillHigh: number | null
			/** Celsius */
			windchillLow: number | null
			/** km/h */
			windgustAvg: number | null
			/** km/h */
			windgustHigh: number | null
			/** km/h */
			windgustLow: number | null
			/** km/h */
			windspeedAvg: number | null
			/** km/h */
			windspeedHigh: number | null
			/** km/h */
			windspeedLow: number | null
		}
	}[]
}

/**
 * @deprecated
 */
export default class WUnderground extends AbstractWeatherProvider {

	async getWateringData(parameters: { coordinates: GeoCoordinates, pws: PWS | undefined} ): Promise<ZimmermanWateringData> {
		if (!parameters.pws) {
			throw new CodedError(ErrorCode.NoPwsProvided);
		}

		let data;
		try {
			data = await httpJSONRequest<WUnderground_PWS_Response>(`https://api.weather.com/v2/pws/observations/hourly/7day?stationId=${parameters.pws.id}&format=json&units=${Units.Metric}&apiKey=${parameters.pws.apiKey}`);
		} catch (err) {
			console.error("Error retrieving weather information from WUnderground:", err);
			throw new CodedError(ErrorCode.WeatherApiError);
		}

		// Take the 24 most recent observations.
		const samples = data.observations.slice(-24);

		// Fail if not enough data is available.
		if (samples.length !== 24) {
			throw new CodedError(ErrorCode.InsufficientWeatherData);
		}

		const totals = { temp: 0, humidity: 0, precip: 0 };
		let lastPrecip = samples[0].metric.precipTotal!;
		for (const sample of samples) {
			totals.temp += sample.metric.tempAvg!;
			totals.humidity += sample.humidityAvg!;
			totals.precip += (sample.metric.precipTotal! - lastPrecip > 0) ? sample.metric.precipTotal! - lastPrecip : 0;
			lastPrecip = sample.metric.precipTotal!
		}

		return {
			weatherProvider: WeatherProviderShortID.WUnderground,
			temp: totals.temp / samples.length,
			humidity: totals.humidity / samples.length,
			precip: totals.precip,
			raining: samples[samples.length - 1].metric.precipRate! > 0
		}
	}

	async getWeatherData(parameters: { coordinates: GeoCoordinates }): Promise<WeatherData> {
		throw new Error(`Not implemented`)
	}
	async getEToData(parameters: { coordinates: GeoCoordinates }): Promise<EToData> {
		throw new Error(`Not implemented`)
	}
}
