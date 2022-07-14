import { AbstractAdjustmentMethod, AdjustmentMethodResponse } from "./AbstractAdjustmentMethod";

/**
 * Does not change the watering scale.
 */
export class Manual extends AbstractAdjustmentMethod {
	protected async calculateWateringScale(): Promise<AdjustmentMethodResponse> {
		return { rawData: { wp: 'Manual' } }
	}
}

export default Manual