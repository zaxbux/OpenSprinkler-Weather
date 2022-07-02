import { getParameter, resolveCoordinates } from "@/routes/weather";
import { Env } from '@/bindings';
import { GeoCoordinates } from '@/types';
import CloudflareWorkersETo from '@/baseline-eto/cloudflare';
import { ETo } from '@/baseline-eto';

export const getBaselineETo = async function(req: Request, env: Env): Promise<Response> {
	const url = new URL(req.url)
	const location = getParameter( url.searchParams.get('loc') );

	const etoData: ETo = new CloudflareWorkersETo(env.ETO_BASELINE_BUCKET)

	try {
		await etoData.readFileHeader()
	} catch (err) {
		// Error if the file meta was not read (either the file is still being read or an error occurred and it could not be read).
		console.error(`An error occurred while reading the annual ETo data file header. Baseline ETo endpoint will be unavailable.`, err)
		return new Response(`Baseline ETo calculation is currently unavailable.`, { status: 503 })
	}

	// Attempt to resolve provided location to GPS coordinates.
	let coordinates: GeoCoordinates;
	try {
		coordinates = await resolveCoordinates( location );
	} catch (err) {
		return new Response( `Error: Unable to resolve coordinates for location (${ err })`, { status: 404 })
	}

	let eto: number;
	try {
		eto = await etoData.calculateAverageDailyETo( coordinates );
	} catch ( err ) {
		/* Use a 500 error code if a more appropriate error code is not specified, and prefer the error message over the full error object if a message is defined. */
		return new Response(err instanceof Error ? err.message : String(err), { status: 500 })
	}

	eto = Number.parseFloat(eto.toPrecision(3))

	return new Response(JSON.stringify({
		eto,
	}), { headers: { 'Content-Type': 'application/json' }})
};