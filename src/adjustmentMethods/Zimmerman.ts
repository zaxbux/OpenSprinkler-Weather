import { AbstractAdjustmentMethod, AdjustmentMethodOptions, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";
import { GeoCoordinates, WeatherProviderShortID } from "@/types";

export interface ZimmermanAdjustmentOptions extends AdjustmentMethodOptions {
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

interface IRawData {
	wp: WeatherProviderShortID
	/** Humidity */
	h: number | null
	/** Precipitation */
	p: number | null
	/** Temperature */
	t: number | null
	/** Currently raining */
	raining: number | null
}

/**
 * Calculates how much watering should be scaled based on weather and adjustment options using the Zimmerman method.
 * (https://github.com/rszimm/sprinklers_pi/wiki/Weather-adjustments#formula-for-setting-the-scale)
 */
export class Zimmerman extends AbstractAdjustmentMethod<ZimmermanAdjustmentOptions> {
	protected async calculateWateringScale(adjustmentOptions: ZimmermanAdjustmentOptions, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse<IRawData>> {
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

		// Check to make sure valid data exists for all factors
		// if (!validateValues(["temp", "humidity", "precip"], wateringData)) {
		// 	throw new CodedError(ErrorCode.MissingWeatherField);
		// }

		const rawData = {
			wp: this.weatherProvider.getID(),
			h: wateringData ? Math.round(wateringData.humidity * 100) / 100 : null,
			p: wateringData ? Math.round(wateringData.precip * 100) / 100 : null,
			t: wateringData ? Math.round(wateringData.temp * 10) / 10 : null,
			raining: wateringData ? (wateringData.raining ? 1 : 0) : null
		}



		// Get baseline conditions for 100% water level, if provided
		const humidityBase = adjustmentOptions.bh ?? 30
		const tempBase = adjustmentOptions.bt ?? 70
		const precipitationBase = adjustmentOptions.br ?? 0

		let humidityFactor = (humidityBase - wateringData.humidity),
			tempFactor = ((wateringData.temp - tempBase) * 4),
			precipFactor = ((precipitationBase - wateringData.precip) * 200);

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

		const scale = Math.floor(Math.min(Math.max(0, 100 + humidityFactor + tempFactor + precipFactor), 200))

		return {
			// Apply all of the weather modifying factors and clamp the result between 0 and 200%.
			scale,
			rawData,
			wateringData: {
				temp: wateringData.temp,
				humidity: wateringData.humidity,
				raining: wateringData.raining,
			},
		}
	}
}