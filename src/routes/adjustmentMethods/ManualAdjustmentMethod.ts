import { AdjustmentMethod, AdjustmentMethodResponse } from "./AdjustmentMethod";


/**
 * Does not change the watering scale (only time data will be returned).
 */
async function calculateManualWateringScale( ): Promise< AdjustmentMethodResponse > {
	return {
		scale: undefined,
		rawData: {
			wp: "Manual",
		},
		wateringData: undefined
	}
}


const ManualAdjustmentMethod: AdjustmentMethod = {
	calculateWateringScale: calculateManualWateringScale
};
export default ManualAdjustmentMethod;
