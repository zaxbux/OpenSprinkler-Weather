import { AdjustmentMethod, AdjustmentMethodResponse } from "./AdjustmentMethod";
import { GeoCoordinates, ZimmermanWateringData } from "@/types";
import { AbstractWeatherProvider } from '@/weatherProviders';


/**
 * Only delays watering if it is currently raining and does not adjust the watering scale.
 */
async function calculateRainDelayWateringScale(
	adjustmentOptions: RainDelayAdjustmentOptions,
	coordinates: GeoCoordinates,
	weatherProvider: AbstractWeatherProvider,
): Promise< AdjustmentMethodResponse > {
	const wateringData: ZimmermanWateringData = await weatherProvider.getWateringData({ coordinates });
	const raining = wateringData && wateringData.raining;
	const d = adjustmentOptions.hasOwnProperty( "d" ) ? adjustmentOptions.d : 24;
	return {
		scale: undefined,
		rawData: {
			wp: wateringData.weatherProvider,
			raining: raining ? 1 : 0,
			},
		rainDelay: raining ? d : undefined,
		wateringData: wateringData
	}
}

export interface RainDelayAdjustmentOptions {
	/** The rain delay to use (in hours). */
	d?: number;
}


const RainDelayAdjustmentMethod: AdjustmentMethod = {
	calculateWateringScale: calculateRainDelayWateringScale
};
export default RainDelayAdjustmentMethod;
