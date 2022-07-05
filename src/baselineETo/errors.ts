export class EToError extends Error {
	statusCode: number

	constructor(message?: string, options?: ErrorOptions & { statusCode: number}) {
		super(message, options)
		this.statusCode = options?.statusCode || 500
	}
}
export class EToOutOfBoundsError extends EToError {}
export class EToDataUnavailableError extends EToError {}