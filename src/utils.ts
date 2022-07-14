import { REGEX } from './constants';
import { MalformedAdjustmentOptionsError } from './errors';

/**
 * Parses the weather adjustment options (`wto` request parameter).
 *
 * @throws {@link MalformedAdjustmentOptionsError}
 * This exception is thrown if the JSON string could not be parsed.
 */
export function parseWaterAdjustmentOptions(adjustmentOptionsString: string | null): Record<string, any> {
	if (adjustmentOptionsString === null) {
		return {}
	}

	try {
		// Parse data that may be encoded
		adjustmentOptionsString = decodeURIComponent(adjustmentOptionsString.replace(/\\x/g, '%'))

		// Reconstruct JSON string from deformed controller output
		return JSON.parse(`{${adjustmentOptionsString}}`)
	} catch (err) {
		throw new MalformedAdjustmentOptionsError()
	}
}

export function getRemoteAddress(request: Request) {
	let remoteAddress = getParameter(request.headers.get('x-forwarded-for')) || request.headers.get('cf-connecting-ip')!

	// X-Forwarded-For header may contain more than one IP address and therefore
	// the string is split against a comma and the first value is selected
	remoteAddress = remoteAddress.split(",")[0];

	return remoteAddress
}

/**
 * Converts an IP address string to an integer.
 * @param ip The string representation of the IP address.
 * @return The integer representation of the IP address.
 */
export function ipToInt(ip: string): number {
	const split = ip.split(".");
	return ((((((+split[0]) * 256) + (+split[1])) * 256) + (+split[2])) * 256) + (+split[3]);
}

/**
 * Returns a single value for a header/query parameter. If passed a single string, the same string will be returned. If
 * an array of strings is passed, the first value will be returned. If this value is null/undefined, an empty string
 * will be returned instead.
 * @param parameter An array of parameters or a single parameter value.
 * @return The first element in the array of parameter or the single parameter provided.
 */
export function getParameter(parameter: string | string[] | null): string {
	if (Array.isArray(parameter)) {
		parameter = parameter[0];
	}

	// Return an empty string if the parameter is undefined.
	return parameter ?? '';
}

/**
 * Converts a timezone to an offset in minutes or OpenSprinkler encoded format.
 * @param time A time string formatted in ISO-8601 or just the timezone.
 * @param useMinutes Indicates if the returned value should be in minutes of the OpenSprinkler encoded format.
 * @return The offset of the specified timezone in either minutes or OpenSprinkler encoded format (depending on the value of useMinutes).
 */
export function getTimezone(time: number | string, useMinutes: boolean = false): number {

	let hour, minute;

	if (typeof time === "number") {
		hour = Math.floor(time / 60);
		minute = time % 60;
	} else {

		// Match the provided time string against a regex for parsing
		let splitTime = time.match(REGEX.TIME)! || time.match(REGEX.TIMEZONE)!;

		hour = parseInt(splitTime[7] + splitTime[8]);
		minute = parseInt(splitTime[9]);
	}

	if (useMinutes) {
		return (hour * 60) + minute;
	} else {

		// Convert the timezone into the OpenSprinkler encoded format
		minute = (minute / 15 >> 0) / 4;
		hour = hour + (hour >= 0 ? minute : -minute);

		return ((hour + 12) * 4) >> 0;
	}
}

/**
 * Checks if the specified object contains numeric values for each of the specified keys.
 * @param keys A list of keys to validate exist on the specified object.
 * @param obj The object to check.
 * @return A boolean indicating if the object has numeric values for all of the specified keys.
 */
export function validateValues(keys: string[], obj: Record<string, any>): boolean {
	let key: string;

	// Return false if the object is null/undefined.
	if (!obj) {
		return false;
	}

	for (key in keys) {
		if (!keys.hasOwnProperty(key)) {
			continue;
		}

		key = keys[key];

		if (!obj.hasOwnProperty(key) || typeof obj[key] !== "number" || isNaN(obj[key]) || obj[key] === null || obj[key] === -999) {
			return false;
		}
	}

	return true;
}

export function shouldReturnJSON(request: Request) {
	const accept = request.headers.get('Accept')
	if (accept) {
		return accept.split(',').filter(mime => {
			return mime.includes('application/json')
		}).length > 0
	}

	return false
}

/**
 * Encode a dictionary using primitive URL encoding for the OpenSprinkler firmware.
 * @param data
 * @returns
 */
export function encodeWateringDataResponseData(data: Record<string, any>): string {
	// Return the data formatted as a URL query string.
	let encoded = ''
	for (const key in data) {
		// Skip inherited properties.
		if (!data.hasOwnProperty(key)) {
			console.debug(`Encode skip: (${key})`)
			continue
		}

		let value = data[key]
		if (value === undefined) {
			// Skip undefined properties.
			continue
		}

		if (typeof value === 'object') {
			// Convert objects to JSON.
			value = JSON.stringify(value)
		}

		if (typeof value === 'string') {
			// URL encode strings. Since the OS firmware uses a primitive version of query string parsing and decoding, only some characters need to be escaped and only spaces ('+' or '%20') will be decoded.
			value = value.replace(/ /g, '+').replace(/\n/g, '\\n').replace(/&/g, 'AMPERSAND')
		}

		encoded += `&${key}=${value}`
	}

	return encoded
}