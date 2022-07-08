import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";

/**
 * Does not change the watering scale (only time data will be returned).
 */
export class Manual extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(): Promise<AdjustmentMethodResponse> {
		return {
			scale: undefined,
			wateringData: undefined,
			timezone: undefined,
			rawData: {
				wp: 'Manual',
			},
		}
	}
}