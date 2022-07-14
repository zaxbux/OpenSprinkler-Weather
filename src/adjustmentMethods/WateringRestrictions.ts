import { InsufficientWeatherDataError } from '@/errors'
import { WateringData } from '@/weatherProviders'

interface CaliforniaRestrictionParameters {
	precip?: WateringData['precip']
}

export interface WeatherRestrictionParameters extends CaliforniaRestrictionParameters {}

/**
 * Checks if the weather data meets any of the restrictions set by OpenSprinkler. Restrictions prevent any watering from occurring and are similar to 0% watering level.
 */
export class WateringRestrictions {
	readonly adjustmentMethodValue: number
	readonly checkRestrictions: boolean

	/**
	 *
	 * @param adjustmentMethodValue The adjustment value, which indicates which restrictions should be checked.
	 */
	constructor(adjustmentMethodValue: number) {
		this.adjustmentMethodValue = adjustmentMethodValue
		this.checkRestrictions = ((adjustmentMethodValue >> 7) & 1) > 0
	}

	/**
	 * @param parameters Watering data to use to determine if any restrictions apply.
	 * @return A boolean indicating if the watering level should be set to 0% due to a restriction.
	 */
	public checkWeatherRestriction(parameters: WeatherRestrictionParameters): boolean {
		const restrictions = [
			this.californiaRestriction,
		]

		return restrictions
			.map(restriction => restriction(parameters))
			.reduce((previousValue) => previousValue === true, false)
	}

	/**
	 * California watering restriction prevents watering if precipitation over two days is greater than 0.1" over the past 48 hours.
	 * @param parameters
	 * @returns
	 */
	private californiaRestriction(parameters: WeatherRestrictionParameters) {
		/* @TODO:
		 * Depending on which WeatherProvider is used, this might be checking if rain is forecasted in th next 24 hours rather than checking if it has rained in the past 48 hours.
		 * If the California watering restriction is in use then prevent watering if more then 0.1" (2.54 mm) of rain has accumulated in the past 48 hours
		 */

		if (!parameters.precip) {
			throw new InsufficientWeatherDataError()
		}

		if ((this.adjustmentMethodValue >> 7) & 1) {
			return parameters.precip > 0.254
		}

		return false
	}
}