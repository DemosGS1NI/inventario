// src/routes/api/auth/cleanup-authorizations/+server.js
import { cleanupExpiredAuthorizations } from '$lib/services/authorizationService';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAdmin } from '$lib/authMiddleware';
import { sql } from '$lib/database';

/**
 * POST endpoint to clean up expired authorizations
 * This can be called manually or set up as a cron job
 */
export async function POST({ locals }) {
	requireAdmin(locals);

	try {
		const cleanedCount = await cleanupExpiredAuthorizations();

		return successResponse(
			{
				cleanedAuthorizations: cleanedCount,
				timestamp: new Date().toISOString()
			},
			`Successfully cleaned up ${cleanedCount} expired authorizations`
		);
	} catch (error) {
		console.error('Error in authorization cleanup endpoint:', error);
		return errorResponse(
			500,
			'CLEANUP_ERROR',
			'Failed to clean up expired authorizations',
			error.message
		);
	}
}

/**
 * GET endpoint to check how many expired authorizations need cleanup
 */
export async function GET({ locals }) {
	requireAdmin(locals);

	try {
		const result = await sql`
			SELECT COUNT(*) as expired_count 
			FROM user_authorizations 
			WHERE expires_at < NOW() AND is_active = true
		`;

		const expiredCount = parseInt(result.rows[0].expired_count);

		return successResponse(
			{
				expiredAuthorizationsCount: expiredCount,
				timestamp: new Date().toISOString()
			},
			`Found ${expiredCount} expired authorizations ready for cleanup`
		);
	} catch (error) {
		console.error('Error checking expired authorizations:', error);
		return errorResponse(
			500,
			'CHECK_ERROR',
			'Failed to check expired authorizations',
			error.message
		);
	}
}
