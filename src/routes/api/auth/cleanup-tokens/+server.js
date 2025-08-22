import { cleanupExpiredTokens } from '$lib/services/tokenService';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAdmin } from '$lib/authMiddleware';
import { sql } from '$lib/database';

/**
 * API endpoint to clean up expired revoked tokens
 * This can be called manually or set up as a cron job
 */
export async function POST({ locals }) {
	requireAdmin(locals);

	try {
		const cleanedCount = await cleanupExpiredTokens();

		return successResponse(
			{
				cleanedTokens: cleanedCount,
				timestamp: new Date().toISOString()
			},
			`Successfully cleaned up ${cleanedCount} expired tokens`
		);
	} catch (error) {
		console.error('Error in cleanup endpoint:', error);
		return errorResponse(500, 'CLEANUP_ERROR', 'Failed to clean up expired tokens', error.message);
	}
}

/**
 * GET endpoint to check how many expired tokens need cleanup
 */
export async function GET({ locals }) {
	requireAdmin(locals);

	try {
		// Import sql here since we need it for the count query
		const result = await sql`
      SELECT COUNT(*) as expired_count 
      FROM revoked_tokens 
      WHERE expiry < NOW()
    `;

		const expiredCount = parseInt(result.rows[0].expired_count);

		return successResponse(
			{
				expiredTokensCount: expiredCount,
				timestamp: new Date().toISOString()
			},
			`Found ${expiredCount} expired tokens ready for cleanup`
		);
	} catch (error) {
		console.error('Error checking expired tokens:', error);
		return errorResponse(500, 'CHECK_ERROR', 'Failed to check expired tokens', error.message);
	}
}
