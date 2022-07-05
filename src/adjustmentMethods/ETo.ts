import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";
import { BaseWateringData, GeoCoordinates } from "@/types";
import { CodedError } from "@/errors";
import { ErrorCode } from '@/constants';
import { calculateETo } from '@/utils/evapotranspiration';

/**
 * Data used to calculate ETo. This data should be taken from a 24 hour time window.
 */
export interface EToData extends BaseWateringData {
	/** The Unix epoch seconds timestamp of the start of this 24 hour time window. */
	periodStartTime: number;
	/** The minimum temperature over the time period (in Fahrenheit). */
	minTemp: number;
	/** The maximum temperature over the time period (in Fahrenheit). */
	maxTemp: number;
	/** The minimum relative humidity over the time period (as a percentage). */
	minHumidity: number;
	/** The maximum relative humidity over the time period (as a percentage). */
	maxHumidity: number;
	/** The solar radiation, accounting for cloud coverage (in kilowatt hours per square meter per day). */
	solarRadiation: number;
	/**
	 * The average wind speed measured at 2 meters over the time period (in miles per hour). A measurement taken at a
	 * different height can be standardized to 2m using the `standardizeWindSpeed` function in EToAdjustmentMethod.
	 */
	windSpeed: number;
}

export interface EToScalingAdjustmentOptions {
	/** The watering site's height above sea level (in feet). */
	elevation?: number;
	/** Baseline potential ETₒ (in inches per day). */
	baseETo?: number;
}

/**
 * Calculates how much watering should be scaled based on weather and adjustment options by comparing the recent
 * potential ETₒ to the baseline potential ETₒ that the watering program was designed for.
 */
export class ETo extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(adjustmentOptions: EToScalingAdjustmentOptions, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse> {
		// Temporarily disabled since OWM forecast data is checking if rain is forecasted for 3 hours in the future.
		/*
		if ( wateringData && wateringData.raining ) {
			return {
				scale: 0,
				rawData: { raining: 1 }
			}
		}
		 */

		// This will throw a CodedError if ETₒ data cannot be retrieved.
		const etoData: EToData = await this.weatherProvider.getEToData({ coordinates });

		let baseETo: number;
		// Default elevation is based on data from https://www.pnas.org/content/95/24/14009.
		let elevation = 600;

		if (adjustmentOptions && "baseETo" in adjustmentOptions && adjustmentOptions.baseETo) {
			baseETo = adjustmentOptions.baseETo
		} else {
			throw new CodedError(ErrorCode.MissingAdjustmentOption);
		}

		if (adjustmentOptions && "elevation" in adjustmentOptions && adjustmentOptions.elevation) {
			elevation = adjustmentOptions.elevation;
		}

		const eto: number = calculateETo(etoData, elevation, coordinates);

		const scale = Math.floor(Math.min(Math.max(0, (eto - etoData.precip) / baseETo * 100), 200));
		return {
			scale: scale,
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
			wateringData: etoData
		}
	}
}
