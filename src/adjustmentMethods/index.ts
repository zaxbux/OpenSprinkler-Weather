import { InvalidAdjustmentMethodError } from '@/errors';
import { AbstractWeatherProvider } from '@/weatherProviders';
import { AbstractAdjustmentMethod } from './AbstractAdjustmentMethod';
import { WateringRestrictions } from './WateringRestrictions';

/**
 *
 * @param method
 * @param weatherProvider
 * @returns
 *
 * @throws {Error}
 * This exception is thrown if an unknown adjustment method was provided.
 */
export const getAdjustmentMethod = async (method: number, weatherProvider: AbstractWeatherProvider): Promise<AbstractAdjustmentMethod> => {
	// The adjustment method is encoded by the OpenSprinkler firmware and must be parsed. This allows the adjustment method and the restriction type to both be saved in the same byte.
	const id = method & ~( 1 << 7 )
	const wateringRestrictions = new WateringRestrictions(method)

	switch (id) {
		case 0:
			return new (await import('@/adjustmentMethods/Manual')).default({ weatherProvider, wateringRestrictions })
		case 1:
			return new (await import('@/adjustmentMethods/Zimmerman')).default({ weatherProvider, wateringRestrictions })
		case 2:
			return new (await import('@/adjustmentMethods/RainDelay')).default({ weatherProvider, wateringRestrictions })
		case 3:
			return new (await import('@/adjustmentMethods/ETo')).default({ weatherProvider, wateringRestrictions })
	}

	throw new InvalidAdjustmentMethodError()
}