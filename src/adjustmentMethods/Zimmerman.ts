import { AbstractAdjustmentMethod, AdjustmentMethodOptions, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";
import { BaseWateringData, GeoCoordinates } from "@/types";
import { CodedError } from "@/errors";
import { validateValues } from '@/utils';
import { ErrorCode } from '@/constants';

export interface ZimmermanAdjustmentOptions {
	/** Base humidity (as a percentage). */
	bh?: number;
	/** Base temperature (in Fahrenheit). */
	bt?: number;
	/** Base precipitation (in inches). */
	br?: number;
	/** The percentage to weight the humidity factor by. */
	h?: number;
	/** The percentage to weight the temperature factor by. */
	t?: number;
	/** The percentage to weight the precipitation factor by. */
	r?: number;
}

/**
 * Data from a 24 hour window that is used to calculate how watering levels should be scaled. This should ideally use
 * historic data from the past day, but may also use forecasted data for the next day if historical data is not
 * available.
 */
export interface ZimmermanWateringData extends BaseWateringData {
	/** The average temperature over the window (in Celsius). */
	temp: number
	/** The average humidity over the window (as a percentage). */
	humidity: number
	/** A boolean indicating if it is raining at the time that this data was retrieved. */
	raining: boolean
}

/**
 * Calculates how much watering should be scaled based on weather and adjustment options using the Zimmerman method.
 * (https://github.com/rszimm/sprinklers_pi/wiki/Weather-adjustments#formula-for-setting-the-scale)
 */
export class Zimmerman extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(adjustmentOptions: AdjustmentMethodOptions, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse> {
		const wateringData = await this.weatherProvider.getWateringData({ coordinates });

		// Temporarily disabled since OWM forecast data is checking if rain is forecasted for 3 hours in the future.
		/*
		// Don't water if it is currently raining.
		if ( wateringData && wateringData.raining ) {
			return {
				scale: 0,
				rawData: { raining: 1 },
				wateringData: wateringData
			}
		}
		*/

		const rawData = {
			wp: wateringData.weatherProvider,
			h: wateringData ? Math.round(wateringData.data.humidity * 100) / 100 : null,
			p: wateringData ? Math.round(wateringData.data.precip * 100) / 100 : null,
			t: wateringData ? Math.round(wateringData.data.temp * 10) / 10 : null,
			raining: wateringData ? (wateringData.data.raining ? 1 : 0) : null
		};

		// Check to make sure valid data exists for all factors
		if (!validateValues(["temp", "humidity", "precip"], wateringData)) {
			// Default to a scale of 100% if fields are missing.
			throw new CodedError(ErrorCode.MissingWeatherField);
		}

		// Get baseline conditions for 100% water level, if provided
		const humidityBase = adjustmentOptions.bh ?? 30
		const tempBase = adjustmentOptions.bt ?? 70
		const precipitationBase = adjustmentOptions.br ?? 0

		let humidityFactor = (humidityBase - wateringData.data.humidity),
			tempFactor = ((wateringData.data.temp - tempBase) * 4),
			precipFactor = ((precipitationBase - wateringData.data.precip) * 200);

		// Apply adjustment options, if provided, by multiplying the percentage against the factor
		if (adjustmentOptions.h !== undefined) {
			humidityFactor = humidityFactor * (adjustmentOptions.h / 100);
		}

		if (adjustmentOptions.t !== undefined) {
			tempFactor = tempFactor * (adjustmentOptions.t / 100);
		}

		if (adjustmentOptions.r !== undefined) {
			precipFactor = precipFactor * (adjustmentOptions.r / 100);
		}

		return {
			// Apply all of the weather modifying factors and clamp the result between 0 and 200%.
			scale: Math.floor(Math.min(Math.max(0, 100 + humidityFactor + tempFactor + precipFactor), 200)),
			rawData: rawData,
			wateringData: wateringData.data
		}
	}
}