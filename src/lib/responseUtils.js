import { json } from '@sveltejs/kit';

export function successResponse(data = {}, message = 'Success', options = {}) {
	const { headers = {} } = options;
	return json(
		{
			status: 'success',
			data,
			message
		},
		{ status: 200, headers }
	);
}

export function errorResponse(
	code = 400,
	errorCode = 'ERROR',
	message = 'An error occurred',
	details = null
) {
	const validCode = Math.max(200, Math.min(code, 599));
	return json(
		{
			status: 'error',
			error: {
				code: errorCode,
				message,
				...(details && { details })
			}
		},
		{ status: validCode }
	);
}
