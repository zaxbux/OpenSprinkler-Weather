/**
 * Makes an HTTP/HTTPS GET request to the specified URL and returns the response body.
 * @param url The URL to fetch.
 * @return A Promise that will be resolved the with response body if the request succeeds, or will be rejected with an
 * error if the request fails or returns a non-200 status code. This error may contain information about the HTTP
 * request or, response including API keys and other sensitive information.
 */
async function httpRequest(url: string): Promise<string> {
	const response = await fetch(url)

	if (response.status !== 200) {
		throw new Error(`Received ${response.status} status code for URL '${url}'.`)
	}

	return response.text()
}

/**
 * Makes an HTTP/HTTPS GET request to the specified URL and parses the JSON response body.
 * @param url The URL to fetch.
 * @return A Promise that will be resolved the with parsed response body if the request succeeds, or will be rejected
 * with an error if the request or JSON parsing fails. This error may contain information about the HTTP request or,
 * response including API keys and other sensitive information.
 */
export async function httpJSONRequest<T = any>(url: string): Promise<T> {
	try {
		const data: string = await httpRequest(url);
		return JSON.parse(data);
	} catch (err) {
		// Reject the promise if there was an error making the request or parsing the JSON.
		throw err;
	}
}