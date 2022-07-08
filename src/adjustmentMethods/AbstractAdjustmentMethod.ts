import { GeoCoordinates, WateringData, WeatherProviderShortID } from "@/types";
import { AbstractWeatherProvider } from '@/weatherProviders';
import { AdjustmentMethodWateringData } from '.';
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
			let wateringData = adjustmentMethodResponse.wateringData;
			// Fetch the watering data if the AdjustmentMethod didn't fetch it and restrictions are being checked.
			if (!wateringData) {
				wateringData = (await this.weatherProvider.getWateringData({ coordinates }));
			}

			// Check for any user-set restrictions and change the scale to 0 if the criteria is met
			if (this.wateringRestrictions.checkWeatherRestriction(wateringData)) {
				adjustmentMethodResponse.scale = 0;
			}
		}

		return adjustmentMethodResponse
	}
}

// export interface AdjustmentMethodResponse {
// 	/**
// 	 * The percentage that should be used to scale the watering level. This should be an integer between 0-200 (inclusive),
// 	 * or undefined if the watering level should not be changed.
// 	 */
// 	scale: number | undefined;
// 	/**
// 	 * The raw data that was used to calculate the watering scale. This will be sent directly to the OS controller, so
// 	 * each field should be formatted in a way that the controller understands and numbers should be rounded
// 	 * appropriately to remove excessive figures. If no data was used (e.g. an error occurred), this should be undefined.
// 	 */
// 	rawData?: Record<string, any>;
// 	/**
// 	 * How long watering should be delayed for (in hours) due to rain, or undefined if watering should not be delayed
// 	 * for a specific amount of time (either it should be delayed indefinitely or it should not be delayed at all). This
// 	 * property will not stop watering on its own, and the `scale` property should be set to 0 to actually prevent
// 	 * watering.
// 	 */
// 	rainDelay?: number;
// 	/** The data that was used to calculate the watering scale, or undefined if no data was used. */
// 	wateringData: BaseWateringData | undefined;
// }

export interface AdjustmentMethodResponse<R extends Record<string, any> = Record<string, any>> extends Pick<WateringData, 'timezone' | 'scale' | 'rainDelay' | 'rawData'> {
	/**
	 * The data that was used to calculate the watering scale or if no data was used, undefined.
	 */
	wateringData?: AdjustmentMethodWateringData

	rawData: R & {
		wp: WeatherProviderShortID | 'Manual'
	}
}