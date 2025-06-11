import { successResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';

export async function GET({ locals }) {
	const user = requireAuth(locals);

	// Return authorized response with user details
	return successResponse({ userId: user.userId }, 'Authorized access');
}