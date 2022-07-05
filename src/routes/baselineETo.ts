import { getBaselineEToData } from '@/baselineETo'
import { EToError } from '@/baselineETo/errors'
import { ErrorCode } from '@/constants'
import { CodedError } from '@/errors'
import { getGeocoderProvider, resolveCoordinates } from '@/geocoders'
import { makeErrorResponse, makeResponse } from '@/http'
import { GeoCoordinates } from '@/types'

/**
 * Retrieves the baseline ETₒ value for a specified location.
 */
export const getBaselineETo = async function (req: Request, env: Env): Promise<Response> {
	const baselineEToData = await getBaselineEToData(env)

	try {
		await baselineEToData.readFileHeader()
	} catch (err) {
		// Error if the file meta was not read (either the file is still being read or an error occurred and it could not be read).
		console.error(`An error occurred while reading the annual ETₒ data file header. Baseline ETₒ endpoint will be unavailable.`, err)
		return makeErrorResponse(req, err, 503, `Baseline ETₒ calculation is currently unavailable.`)
	}

	// Attempt to resolve provided location to GPS coordinates.
	let coordinates: GeoCoordinates
	try {
		coordinates = await resolveCoordinates(req, async (location) => (await getGeocoderProvider(env)).getLocation(location))
	} catch (err) {
		if (err instanceof CodedError) {
			// Specific error
			return makeErrorResponse(req, err, err.errCode === ErrorCode.NoLocationFound ? 404 : 500, `Could not resolve coordinates for location.`)
		}

		// Generic error
		return makeErrorResponse(req, `Could not resolve coordinates for location.`, 500)
	}

	try {
		const eto = await baselineEToData.calculateAverageDailyETo(coordinates, 3)
		return makeResponse(req, { eto })
	} catch (err) {
		return makeErrorResponse(req, err, err instanceof EToError ? err.statusCode : 500)
	}
}