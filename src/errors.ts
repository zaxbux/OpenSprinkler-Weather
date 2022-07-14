import { ErrorCode } from '@/constants';

export interface CodedError {
	readonly errCode: ErrorCode
	/** HTTP status code */
	readonly status: number
}

/** An error with a numeric code that can be used to identify the type of error. */
export abstract class CodedError extends Error implements CodedError {
	public readonly status: number = 500
	public constructor(message?: string, options?: ErrorOptions) {
		super(message, options)
	}
}

export class BadWeatherDataError extends CodedError {
	public readonly errCode = ErrorCode.BadWeatherData
	public readonly status = 503
	message = 'The watering scale could not be calculated due to a problem with the weather information.'
}
export class InsufficientWeatherDataError extends CodedError {
	public readonly errCode = ErrorCode.InsufficientWeatherData
	public readonly status = 503
	message = 'Data for a full 24 hour period was not available.'
}
export class MissingWeatherFieldError extends CodedError {
	public readonly errCode = ErrorCode.MissingWeatherField
	public readonly status = 503
	message = 'A necessary field was missing from weather data returned by the API.'
}
export class WeatherApiError extends CodedError {
	public readonly errCode = ErrorCode.WeatherApiError
	public readonly status = 503
	message = 'An HTTP or parsing error occurred when retrieving weather information.'
}
export class LocationError extends CodedError {
	public readonly errCode = ErrorCode.LocationError
	message = 'The specified location name could not be resolved.'
}
export class LocationServiceApiError extends CodedError {
	public readonly errCode = ErrorCode.LocationServiceApiError
	public readonly status = 503
	message = 'An HTTP or parsing error occurred when resolving the location.'
}
export class NoLocationFoundError extends CodedError {
	public readonly errCode = ErrorCode.NoLocationFound
	public readonly status = 404
	message = 'No matches were found for the specified location name.'
}
export class InvalidLocationFormatError extends CodedError {
	public readonly errCode = ErrorCode.InvalidLocationFormat
	public readonly status = 400
	message = 'The location name was specified in an invalid format.'
}
/** @deprecated */
export class PwsError extends CodedError {
	public readonly errCode = ErrorCode.PwsError
	message = 'An Error related to personal weather stations.'
}
/** @deprecated */
export class InvalidPwsIdError extends CodedError {
	public readonly errCode = ErrorCode.InvalidPwsId
	message = 'The PWS ID did not use the correct format.'
}
/** @deprecated */
export class InvalidPwsApiKeyError extends CodedError {
	public readonly errCode = ErrorCode.InvalidPwsApiKey
	message = 'The PWS API key did not use the correct format.'
}
/** @deprecated */
export class PwsAuthenticationError extends CodedError {
	public readonly errCode = ErrorCode.PwsAuthenticationError
	message = 'The PWS API returned an error because a bad API key was specified.'
}
/** @deprecated */
export class PwsNotSupportedError extends CodedError {
	public readonly errCode = ErrorCode.PwsNotSupported
	message = 'A PWS was specified but the data for the specified AdjustmentMethod cannot be retrieved from a PWS.'
}
/** @deprecated */
export class NoPwsProvidedError extends CodedError {
	public readonly errCode = ErrorCode.NoPwsProvided
	message = 'A PWS is required by the WeatherProvider but was not provided.'
}
export class AdjustmentMethodError extends CodedError {
	public readonly errCode = ErrorCode.AdjustmentMethodError
	message = 'An error related to AdjustmentMethods or watering restrictions.'
}
export class UnsupportedAdjustmentMethodError extends CodedError {
	public readonly errCode = ErrorCode.UnsupportedAdjustmentMethod
	public readonly status = 503
	message = 'The WeatherProvider is incompatible with the specified AdjustmentMethod.'
}
export class InvalidAdjustmentMethodError extends CodedError {
	public readonly errCode = ErrorCode.InvalidAdjustmentMethod
	public readonly status = 400
	message = 'Invalid Adjustment Method ID'
}
export class AdjustmentOptionsError extends CodedError {
	public readonly errCode = ErrorCode.AdjustmentOptionsError
	message = 'An error related to adjustment options (wto).'
}
export class MalformedAdjustmentOptionsError extends CodedError {
	public readonly errCode = ErrorCode.MalformedAdjustmentOptions
	public readonly status = 400
	message = 'The adjustment options could not be parsed.'
}
export class MissingAdjustmentOptionError extends CodedError {
	public readonly errCode = ErrorCode.MissingAdjustmentOption
	public readonly status = 400
	readonly message = 'A required adjustment option was not provided.'
}
export class UnexpectedError extends CodedError {
	public readonly errCode = ErrorCode.UnexpectedError
	public readonly status = 500
	message = 'Unexpected Error'
}

/**
 * Returns a CodedError representing the specified error. This function can be used to ensure that errors caught in try-catch
 * statements have an error code and do not contain any sensitive information in the error message. If `err` is a
 * CodedError, the same object will be returned. If `err` is not a CodedError, it is assumed that the error wasn't
 * properly handled, so a CodedError with a generic message and an "UnexpectedError" code will be returned. This ensures
 * that the user will only be sent errors that were initially raised by the OpenSprinkler weather service and have
 * had any sensitive information (like API keys) removed from the error message.
 * @param err Any error caught in a try-catch statement.
 * @return A CodedError representing the error that was passed to the function.
 */
export function makeCodedError(err: any): CodedError {
	if (err instanceof CodedError) {
		return err;
	} else {
		return new UnexpectedError();
	}
}


export class ConfigurationError extends Error { }