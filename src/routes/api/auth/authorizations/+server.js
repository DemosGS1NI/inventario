// src/routes/api/auth/authorizations/+server.js
import {
	getUserAuthorizations,
	revokeAuthorization,
	getAuthorizationStats
} from '$lib/services/authorizationService';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';

/**
 * GET - Get user's third-party authorizations
 */
export async function GET({ locals, url }) {
	try {
		const user = requireAuth(locals);
		const includeStats = url.searchParams.get('stats') === 'true';

		const authorizations = await getUserAuthorizations(user.userId);

		const response = { authorizations };

		if (includeStats) {
			response.stats = await getAuthorizationStats(user.userId);
		}

		return successResponse(response, `Found ${authorizations.length} authorized applications`);
	} catch (error) {
		console.error('Error fetching user authorizations:', error);
		return errorResponse(500, 'FETCH_ERROR', 'Failed to fetch user authorizations', error.message);
	}
}

/**
 * DELETE - Revoke a specific authorization
 */
export async function DELETE({ request, locals }) {
	try {
		const user = requireAuth(locals);
		const { authorizationId } = await request.json();

		if (!authorizationId) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Authorization ID is required');
		}

		const success = await revokeAuthorization(user.userId, authorizationId);

		if (!success) {
			return errorResponse(404, 'NOT_FOUND', 'Authorization not found or already revoked');
		}

		return successResponse(
			{ authorizationId, revoked: true },
			'Authorization successfully revoked'
		);
	} catch (error) {
		console.error('Error revoking authorization:', error);
		return errorResponse(500, 'REVOKE_ERROR', 'Failed to revoke authorization', error.message);
	}
}
