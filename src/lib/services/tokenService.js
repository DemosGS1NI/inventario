// src/lib/services/tokenService.js
import { sql } from '$lib/database';
import dotenv from 'dotenv';

// Load environment variables from .env file (for local development)
dotenv.config();

/**
 * Revokes a token by adding it to the blacklist
 * @param {string} jti - The token's unique identifier
 * @param {number} expiry - When the token expires (Unix timestamp in seconds)
 */
export async function revokeToken(jti, expiry) {
	try {
		// Convert Unix timestamp to JavaScript Date
		const expiryDate = new Date(expiry * 1000);

		// Insert the token into the revoked_tokens table
		await sql`
      INSERT INTO revoked_tokens (jti, expiry)
      VALUES (${jti}, ${expiryDate})
      ON CONFLICT (jti) DO NOTHING
    `;

		console.log(`Token ${jti} revoked successfully`);
	} catch (error) {
		console.error('Error revoking token:', error);
		throw error;
	}
}

/**
 * Checks if a token has been revoked
 * @param {string} jti - The token's unique identifier
 * @returns {Promise<boolean>} - Whether the token is revoked
 */
export async function isTokenRevoked(jti) {
	try {
		const result = await sql`
      SELECT 1 FROM revoked_tokens
      WHERE jti = ${jti} AND expiry > NOW()
    `;

		return result.rowCount > 0;
	} catch (error) {
		console.error('Error checking token revocation:', error);
		// In case of database errors, we should be conservative and assume the token is valid
		// This prevents legitimate users from being locked out due to database issues
		return false;
	}
}

/**
 * Cleanup function to remove expired tokens from the blacklist
 * This helps keep the database clean and performant
 * @returns {Promise<number>} - Number of tokens cleaned up
 */
export async function cleanupExpiredTokens() {
	try {
		const result = await sql`
      DELETE FROM revoked_tokens 
      WHERE expiry < NOW()
    `;

		console.log(`Cleaned up ${result.rowCount} expired tokens`);
		return result.rowCount;
	} catch (error) {
		console.error('Error cleaning up expired tokens:', error);
		throw error;
	}
}

/**
 * Revokes all tokens for a specific user (useful for security incidents)
 * @param {number} userId - The user's ID
 */
export async function revokeAllUserTokens(userId) {
	try {
		// This would require storing userId in the revoked_tokens table
		// For now, we'll use the token versioning approach for this functionality
		// We'll implement this in a future step if needed
		console.log(`Revoking all tokens for user ${userId} - not yet implemented`);
	} catch (error) {
		console.error('Error revoking all user tokens:', error);
		throw error;
	}
}
