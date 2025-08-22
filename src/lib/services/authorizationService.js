// src/lib/services/authorizationService.js
import { sql } from '$lib/database';
import crypto from 'crypto';

/**
 * Service for managing third-party application authorizations
 */

/**
 * Get all third-party applications that a user has authorized
 * @param {number} userId - The user's ID
 * @returns {Promise<Array>} - Array of authorized applications with details
 */
export async function getUserAuthorizations(userId) {
	try {
		const result = await sql`
			SELECT 
				ua.id,
				ua.scopes,
				ua.granted_at,
				ua.last_used_at,
				ua.expires_at,
				ua.is_active,
				tpa.name as app_name,
				tpa.description as app_description,
				tpa.website_url,
				tpa.logo_url,
				tpa.id as application_id
			FROM user_authorizations ua
			JOIN third_party_applications tpa ON ua.application_id = tpa.id
			WHERE ua.user_id = ${userId} AND ua.is_active = true
			ORDER BY ua.granted_at DESC
		`;

		return result.rows.map((row) => ({
			id: row.id,
			applicationId: row.application_id,
			applicationName: row.app_name,
			description: row.app_description,
			websiteUrl: row.website_url,
			logoUrl: row.logo_url,
			scopes: row.scopes || [],
			grantedAt: row.granted_at,
			lastUsedAt: row.last_used_at,
			expiresAt: row.expires_at,
			isActive: row.is_active
		}));
	} catch (error) {
		console.error('Error fetching user authorizations:', error);
		throw error;
	}
}

/**
 * Get all available third-party applications
 * @returns {Promise<Array>} - Array of available applications
 */
export async function getAvailableApplications() {
	try {
		const result = await sql`
			SELECT 
				id,
				name,
				description,
				website_url,
				logo_url,
				scopes,
				created_at
			FROM third_party_applications 
			WHERE is_active = true
			ORDER BY name
		`;

		return result.rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			websiteUrl: row.website_url,
			logoUrl: row.logo_url,
			availableScopes: row.scopes || [],
			createdAt: row.created_at
		}));
	} catch (error) {
		console.error('Error fetching available applications:', error);
		throw error;
	}
}

/**
 * Revoke user authorization for a specific application
 * @param {number} userId - The user's ID
 * @param {number} authorizationId - The authorization ID to revoke
 * @returns {Promise<boolean>} - Success status
 */
export async function revokeAuthorization(userId, authorizationId) {
	try {
		const result = await sql`
			UPDATE user_authorizations 
			SET is_active = false, updated_at = CURRENT_TIMESTAMP
			WHERE id = ${authorizationId} AND user_id = ${userId}
		`;

		return result.rowCount > 0;
	} catch (error) {
		console.error('Error revoking authorization:', error);
		throw error;
	}
}

/**
 * Grant authorization for a user to a third-party application
 * @param {number} userId - The user's ID
 * @param {number} applicationId - The application ID
 * @param {Array<string>} scopes - Array of granted scopes
 * @returns {Promise<Object>} - Authorization details
 */
export async function grantAuthorization(userId, applicationId, scopes = ['read:profile']) {
	try {
		// First check if authorization already exists
		const existingAuth = await sql`
			SELECT id FROM user_authorizations 
			WHERE user_id = ${userId} AND application_id = ${applicationId}
		`;

		if (existingAuth.rows.length > 0) {
			// Update existing authorization
			const result = await sql`
				UPDATE user_authorizations 
				SET 
					scopes = ${scopes},
					is_active = true,
					granted_at = CURRENT_TIMESTAMP,
					expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour',
					refresh_expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days',
					access_token = gen_random_uuid(),
					refresh_token = gen_random_uuid()
				WHERE user_id = ${userId} AND application_id = ${applicationId}
				RETURNING id, access_token, refresh_token, expires_at
			`;
			return result.rows[0];
		} else {
			// Create new authorization
			const result = await sql`
				INSERT INTO user_authorizations (user_id, application_id, scopes)
				VALUES (${userId}, ${applicationId}, ${scopes})
				RETURNING id, access_token, refresh_token, expires_at
			`;
			return result.rows[0];
		}
	} catch (error) {
		console.error('Error granting authorization:', error);
		throw error;
	}
}

/**
 * Get authorization statistics for a user
 * @param {number} userId - The user's ID
 * @returns {Promise<Object>} - Statistics object
 */
export async function getAuthorizationStats(userId) {
	try {
		const result = await sql`
			SELECT 
				COUNT(*) as total_authorizations,
				COUNT(CASE WHEN last_used_at IS NOT NULL THEN 1 END) as used_authorizations,
				COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_authorizations
			FROM user_authorizations
			WHERE user_id = ${userId} AND is_active = true
		`;

		const row = result.rows[0];
		return {
			totalAuthorizations: parseInt(row.total_authorizations),
			usedAuthorizations: parseInt(row.used_authorizations),
			activeAuthorizations: parseInt(row.active_authorizations)
		};
	} catch (error) {
		console.error('Error fetching authorization stats:', error);
		throw error;
	}
}

/**
 * Cleanup expired authorizations
 * @returns {Promise<number>} - Number of cleaned up authorizations
 */
export async function cleanupExpiredAuthorizations() {
	try {
		const result = await sql`
			UPDATE user_authorizations 
			SET is_active = false
			WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true
		`;

		console.log(`Cleaned up ${result.rowCount} expired authorizations`);
		return result.rowCount;
	} catch (error) {
		console.error('Error cleaning up expired authorizations:', error);
		throw error;
	}
}
