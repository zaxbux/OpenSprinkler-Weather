import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";

export interface ManualRawData {
	wp: 'Manual'
}

/**
 * Does not change the watering scale (only time data will be returned).
 */
export class Manual extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(): Promise<AdjustmentMethodResponse<ManualRawData>> {
		return {
			scale: undefined,
			wateringData: undefined,
			rawData: {
				wp: "Manual",
			},
		}
	}
}