import { ErrorCode } from '@/constants';

/** An error with a numeric code that can be used to identify the type of error. */
export class CodedError extends Error {
	public readonly errCode: ErrorCode;

	public constructor( errCode: ErrorCode, message?: string ) {
		super( message );
		// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
		Object.setPrototypeOf( this, CodedError.prototype );
		this.errCode = errCode;
	}
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
export function makeCodedError( err: any ): CodedError {
	if ( err instanceof CodedError ) {
		return err;
	} else {
		return new CodedError( ErrorCode.UnexpectedError );
	}
}


export class ConfigurationError extends Error {}