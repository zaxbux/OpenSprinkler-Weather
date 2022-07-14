import { GeoCoordinates, WeatherProviderShortID, WateringData } from "@/types";
import { AbstractWeatherProvider, EToData, WateringData as WeatherWateringData } from '@/weatherProviders';
import { WateringRestrictions } from './WateringRestrictions';

export interface AdjustmentMethodOptions extends Record<string, any> {}

export interface AbstractAdjustmentMethodOptions {
	/** The WeatherProvider that should be used if the adjustment method needs to obtain any weather data. */
	weatherProvider: AbstractWeatherProvider
	/** The watering restrictions that should be applied, if enabled. */
	wateringRestrictions: WateringRestrictions
}

export abstract class AbstractAdjustmentMethod<T = AdjustmentMethodOptions> {
	protected weatherProvider: AbstractWeatherProvider
	protected wateringRestrictions: WateringRestrictions

	constructor(options: AbstractAdjustmentMethodOptions) {
		this.weatherProvider = options.weatherProvider
		this.wateringRestrictions = options.wateringRestrictions
	}

	public async getAdjustment(adjustmentOptions: T, coordinates: GeoCoordinates): Promise<AdjustmentMethodResponse> {
		const response = await this.calculateWateringScale(adjustmentOptions, coordinates)
		return this.applyRestrictions(coordinates, response)
	}

	/**
	 * Calculates the percentage that should be used to scale watering time.
	 * @param adjustmentOptions The user-specified options for the calculation. No checks will be made to ensure the AdjustmentOptions are the correct type that the function is expecting or to ensure that any of its fields are valid.
	 * @param coordinates The coordinates of the watering site.
	 * @return A Promise that will be resolved with the result of the calculation, or rejected with an error message if the watering scale cannot be calculated.
	 * @throws A CodedError may be thrown if an error occurs while calculating the watering scale.
	 */
	protected abstract calculateWateringScale(
		adjustmentOptions: T,
		coordinates: GeoCoordinates
	): Promise<AdjustmentMethodResponse>

	protected async applyRestrictions(coordinates: GeoCoordinates, adjustmentMethodResponse: AdjustmentMethodResponse): Promise<AdjustmentMethodResponse> {
		if (this.wateringRestrictions.checkRestrictions) {
			let wateringData = adjustmentMethodResponse.wateringData
			// Fetch the watering data if the AdjustmentMethod didn't fetch it and restrictions are being checked.
			if (!wateringData) {
				wateringData = (await this.weatherProvider.getWateringData({ coordinates }))
			}

			const parameters = {
				precip: wateringData.precip || adjustmentMethodResponse.etoData?.precip
			}

			// Check for any user-set restrictions and change the scale to 0 if the criteria is met
			if (this.wateringRestrictions.checkWeatherRestriction(parameters)) {
				adjustmentMethodResponse.scale = 0;
			}
		}

		return adjustmentMethodResponse
	}
}

export interface AdjustmentMethodResponse<R extends Record<string, any> = Record<string, any>> extends Pick<WateringData, 'timezone' | 'scale' | 'rainDelay' | 'rawData'> {
	/**
	 * The data that was used to calculate the watering scale or if no data was used, undefined.
	 */
	wateringData?: Pick<WeatherWateringData, 'temp' | 'humidity' | 'precip' | 'raining'>

	etoData?: EToData

	rawData: R & {
		wp: WeatherProviderShortID | 'Manual'
	}
}