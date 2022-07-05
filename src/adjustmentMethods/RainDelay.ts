import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod"
import { GeoCoordinates } from "@/types"

export interface RainDelayAdjustmentOptions {
	/** Rain delay to use (hours) */
	d?: number
}

/**
 * Only delays watering if it is currently raining and does not adjust the watering scale.
 */
export class RainDelay extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(adjustmentOptions: RainDelayAdjustmentOptions, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse> {
		const wateringData = (await this.weatherProvider.getWateringData({ coordinates })).data
		const raining = wateringData && wateringData.raining
		const d = adjustmentOptions.hasOwnProperty("d") ? adjustmentOptions.d : 24

		return {
			scale: undefined,
			rawData: {
				wp: this.weatherProvider.getID(),
				raining: raining ? 1 : 0,
			},
			rainDelay: raining ? d : undefined,
			wateringData: wateringData
		}
	}
}