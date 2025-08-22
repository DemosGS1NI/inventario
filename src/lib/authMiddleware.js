// src/lib/authMiddleware.js
import { errorResponse } from '$lib/responseUtils';

/**
 * Requires user to be authenticated
 * @param {Object} locals - SvelteKit locals object
 * @returns {Object} user - The authenticated user object
 * @throws {Response} 401 error if not authenticated
 */
export function requireAuth(locals) {
	const userId = locals.user?.userId;

	if (!userId) {
		return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
	}

	return locals.user;
}

/**
 * Requires user to be authenticated and have Admin role
 * @param {Object} locals - SvelteKit locals object
 * @returns {Object} user - The authenticated admin user object
 * @throws {Response} 401 error if not authenticated, 403 if not admin
 */
export function requireAdmin(locals) {
	const user = requireAuth(locals); // This will throw if not authenticated
	if (user.userRole !== 'Admin' && user.userRole !== 'SuperAdmin') {
		return errorResponse(403, 'FORBIDDEN', 'Admin access required');
	}

	return user;
}
