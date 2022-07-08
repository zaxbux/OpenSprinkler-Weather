import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";
import { GeoCoordinates, WeatherProviderShortID } from "@/types";
import { MissingAdjustmentOptionError } from "@/errors";
import { calculateETo } from '@/utils/evapotranspiration';

export interface EToScalingAdjustmentOptions {
	/** The watering site's height above sea level (in meters). */
	elevation?: number;
	/** Baseline potential ETₒ (in mm per day). */
	baseETo?: number;
}

interface RawData {
	wp: WeatherProviderShortID
	/** Reference potential evapotranspiration */
	eto: number
	/** Solar radiation, kWh/m2/day */
	radiation: number
	/** Daily minimum relative temperature, C */
	minT: number
	/** Daily maximum relative temperature, C */
	maxT: number
	/** Daily minimum relative humidity, % */
	minH: number
	/** Daily maximum relative humidity, % */
	maxH: number
	/** Wind speed, m/s */
	wind: number
	/** Precipitation, mm */
	p: number
}

/**
 * Calculates how much watering should be scaled based on weather and adjustment options by comparing the recent
 * potential ETₒ to the baseline potential ETₒ that the watering program was designed for.
 */
export class ETo extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(adjustmentOptions: EToScalingAdjustmentOptions, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse<RawData>> {
		if (!adjustmentOptions.baseETo) {
			throw new MissingAdjustmentOptionError()
		}

		// Default elevation is based on data from https://www.pnas.org/content/95/24/14009.
		const elevation = adjustmentOptions.elevation || 194

		// This will throw a CodedError if ETₒ data cannot be retrieved.
		const etoData = await this.weatherProvider.getEToData({ coordinates })
		const eto = calculateETo(etoData, elevation, coordinates)
		const scale = Math.floor(Math.min(Math.max(0, (eto - etoData.precip) / adjustmentOptions.baseETo * 100), 200))

		return {
			scale: scale,
			wateringData: etoData,
			rawData: {
				wp: this.weatherProvider.getID(),
				eto: Math.round(eto * 1000) / 1000,
				radiation: Math.round(etoData.solarRadiation * 100) / 100,
				minT: Math.round(etoData.minTemp),
				maxT: Math.round(etoData.maxTemp),
				minH: Math.round(etoData.minHumidity),
				maxH: Math.round(etoData.maxHumidity),
				wind: Math.round(etoData.windSpeed * 10) / 10,
				p: Math.round(etoData.precip * 100) / 100
			},
		}
	}
}
