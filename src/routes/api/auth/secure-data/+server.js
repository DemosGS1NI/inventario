import { successResponse, errorResponse } from '$lib/responseUtils';

export async function GET({ locals }) {
	// Check if user is authenticated
	if (!locals.user) {
		return errorResponse(401, 'UNAUTHORIZED', 'You are not authorized to access this resource.');
	}

	// Return authorized response with user details
	return successResponse({ userId: locals.user.id }, 'Authorized access');
}
