export function cors(options?: {}) {
	return (request: Request) => new Response(null, {
		status: 204,
		headers: {
			'Content-Length': '0',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			//'Access-Control-Max-Age': '',
		}
	})
}