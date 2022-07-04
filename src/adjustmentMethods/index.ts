import ManualAdjustmentMethod from "./ManualAdjustmentMethod";
import ZimmermanAdjustmentMethod from "./ZimmermanAdjustmentMethod";
import RainDelayAdjustmentMethod from "./RainDelayAdjustmentMethod";
import EToAdjustmentMethod from "./EToAdjustmentMethod";
import { AdjustmentMethod } from './AdjustmentMethod';

/** AdjustmentMethods mapped to their numeric IDs. */
const ADJUSTMENT_METHOD: Record<number, AdjustmentMethod> = {
	0: ManualAdjustmentMethod,
	1: ZimmermanAdjustmentMethod,
	2: RainDelayAdjustmentMethod,
	3: EToAdjustmentMethod,
}

export const getAdjustmentMethod = (method: number): AdjustmentMethod => {
	return ADJUSTMENT_METHOD[ method & ~( 1 << 7 ) ]
}