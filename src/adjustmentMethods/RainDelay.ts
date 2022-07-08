import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod"
import { GeoCoordinates, WeatherProviderShortID } from "@/types"

export interface RainDelayAdjustmentOptions {
	/** Rain delay to use (hours) */
	d?: number
}

interface IRawData {
	wp: WeatherProviderShortID
	raining: number
}

/**
 * Only delays watering if it is currently raining and does not adjust the watering scale.
 */
export class RainDelay extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(adjustmentOptions: RainDelayAdjustmentOptions, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse<IRawData>> {
		const wateringData = (await this.weatherProvider.getWateringData({ coordinates }))
		const raining = wateringData && wateringData.raining
		const d = adjustmentOptions.hasOwnProperty("d") ? adjustmentOptions.d : 24

		return {
			scale: undefined,
			rainDelay: raining ? d : undefined,
			wateringData,
			rawData: {
				wp: this.weatherProvider.getID(),
				raining: raining ? 1 : 0,
			},
		}
	}
}