// src/routes/api/auth/applications/+server.js
import { getAvailableApplications, grantAuthorization } from '$lib/services/authorizationService';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';

/**
 * GET - Get available third-party applications
 */
export async function GET({ locals }) {
	try {
		const user = requireAuth(locals);
		const applications = await getAvailableApplications();

		return successResponse({ applications }, `Found ${applications.length} available applications`);
	} catch (error) {
		console.error('Error fetching available applications:', error);
		return errorResponse(
			500,
			'FETCH_ERROR',
			'Failed to fetch available applications',
			error.message
		);
	}
}

/**
 * POST - Grant authorization to an application
 */
export async function POST({ request, locals }) {
	try {
		const user = requireAuth(locals);
		const { applicationId, scopes } = await request.json();

		if (!applicationId) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Application ID is required');
		}

		if (!Array.isArray(scopes) || scopes.length === 0) {
			return errorResponse(400, 'VALIDATION_ERROR', 'At least one scope must be granted');
		}

		const authorization = await grantAuthorization(user.userId, applicationId, scopes);

		return successResponse(
			{
				authorizationId: authorization.id,
				applicationId,
				scopes,
				expiresAt: authorization.expires_at
			},
			'Authorization granted successfully'
		);
	} catch (error) {
		console.error('Error granting authorization:', error);
		return errorResponse(500, 'GRANT_ERROR', 'Failed to grant authorization', error.message);
	}
}
