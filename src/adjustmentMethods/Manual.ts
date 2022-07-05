import { GeoCoordinates } from '@/types';
import { AbstractAdjustmentMethod, AdjustmentMethodOptions, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";

/**
 * Does not change the watering scale (only time data will be returned).
 */
export class Manual extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(adjustmentOptions: AdjustmentMethodOptions, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse> {
		return {
			scale: undefined,
			rawData: {
				wp: "Manual",
			},
			wateringData: undefined
		}
	}
}