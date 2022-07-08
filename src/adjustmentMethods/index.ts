import { AbstractWeatherProvider, WateringData } from '@/weatherProviders';
import { AbstractAdjustmentMethod } from './AbstractAdjustmentMethod';
import { ETo } from "./ETo";
import { Manual } from "./Manual";
import { RainDelay } from "./RainDelay";
import { WateringRestrictions } from './WateringRestrictions';
import { Zimmerman } from "./Zimmerman";

export interface AdjustmentMethodWateringData extends Partial<WateringData> {}

/**
 *
 * @param method
 * @param weatherProvider
 * @returns
 *
 * @throws {Error}
 * This exception is thrown if an unknown adjustment method was provided.
 */
export const getAdjustmentMethod = (method: number, weatherProvider: AbstractWeatherProvider): AbstractAdjustmentMethod => {
	// The adjustment method is encoded by the OpenSprinkler firmware and must be parsed. This allows the adjustment method and the restriction type to both be saved in the same byte.
	const id = method & ~( 1 << 7 )
	const wateringRestrictions = new WateringRestrictions(method)

	switch (id) {
		case 0:
			return new Manual({ weatherProvider, wateringRestrictions })
		case 1:
			return new Zimmerman({ weatherProvider, wateringRestrictions })
		case 2:
			return new RainDelay({ weatherProvider, wateringRestrictions })
		case 3:
			return new ETo({ weatherProvider, wateringRestrictions })
	}

	throw new Error(`Unknown adjustment method ID: ${id}`)
}