import { RouteHandler } from 'itty-router'

const enum HTTP_STATUS {
	OK = 200,
	NO_CONTENT = 204,
	BAD_REQUEST = 400,
	FORBIDDEN = 403,
	METHOD_NOT_ALLOWED = 405,
}

export interface CorsOptions {
	/**
	 * An origin or list of origins that are allowed to access the resource. Set to `*` to allow any origin.
	 */
	origin: '*' | string | string[] | RegExp | ((origin: string, ...args: any) => Promise<boolean | string | string[]>)
	/**
	 *
	 */
	methods: string | string[]
}

const DEFAULTS: CorsOptions = {
	origin: '*',
	methods: ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}

async function isOriginAllowed(allowed: CorsOptions['origin'] | boolean, args: any, origin: string) {
	if (typeof allowed === 'boolean') {
		return allowed
	}

	if (allowed instanceof RegExp) {
		return allowed.test(origin)
	}

	if (typeof allowed === 'function') {
		const result = await  allowed(origin, ...args)
		if (!Array.isArray(result) && typeof result !== 'string') {
			return result
		}

		allowed = result
	}

	if (!Array.isArray(allowed)) {
		if (allowed === '*') {
			return true
		}
		allowed = [allowed]
	}

	return allowed.includes(origin)
}

export function cors(next?: Function, options?: CorsOptions): RouteHandler<Request> {
	return async (request: Request, ...args: any) => {
		options = Object.assign({}, DEFAULTS, options || {})
		if (!Array.isArray(options.methods)) {
			options.methods = [options.methods]
		}

		if (next && request.method !== 'OPTIONS') {
			if (!options.methods.includes(request.method)) {
				// Return 405 Method Not Allowed for non-OPTIONS request methods that are not allowed
				return new Response(null, { status: HTTP_STATUS.METHOD_NOT_ALLOWED, headers: { 'Allow': options.methods.join(',') } })
			}

			return next(request, ...args)
		}

		const response = new Response(null, { status: HTTP_STATUS.NO_CONTENT })

		const origin = request.headers.get('Origin') ?? ''
		const allowedOrigin = typeof options.origin === 'function' ? await options.origin(origin, ...args) : options.origin

		console.debug(allowedOrigin)

		//if (allowedOrigin !== '*') {
			if (origin === '') {
				return new Response(null, { status: HTTP_STATUS.BAD_REQUEST })
			}

			if (await isOriginAllowed(allowedOrigin, args, origin)) {
				response.headers.set('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : origin)

				if (allowedOrigin !== '*') {
					// When sending an explicit `Access-Control-Allow-Origin` header, we should set the `Vary` header
					response.headers.set('Vary', 'Origin')
				}
			} else {
				// Reject the preflight request
				return new Response(null, { status: HTTP_STATUS.FORBIDDEN })
			}
		//}

		response.headers.set('Access-Control-Allow-Methods', options.methods.join(','))

		// When using a `Content-Type` of `application/json`, the header must be included in `Access-Control-Allow-Headers`
		response.headers.set('Access-Control-Allow-Headers', ['Accept', 'Content-Type'].join(','))

		return response
	}
}