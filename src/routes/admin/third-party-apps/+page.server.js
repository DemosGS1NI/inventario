// src/routes/admin/third-party-apps/+page.server.js
import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/database';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Check if user is admin (modify this check based on your role system)
	if (locals.user.userRole !== 'Admin') {
		throw redirect(302, '/menu');
	}

	try {
		// Get all third-party applications
		const appsResult = await sql`
			SELECT 
				id,
				name,
				description,
				website_url,
				scopes,
				is_active,
				created_at,
				(SELECT COUNT(*) FROM user_authorizations ua WHERE ua.application_id = tpa.id AND ua.is_active = true) as active_users
			FROM third_party_applications tpa
			ORDER BY created_at DESC
		`;

		// Get authorization statistics
		const statsResult = await sql`
			SELECT 
				COUNT(*) as total_apps,
				COUNT(CASE WHEN is_active = true THEN 1 END) as active_apps,
				(SELECT COUNT(*) FROM user_authorizations WHERE is_active = true) as total_authorizations
			FROM third_party_applications
		`;

		return {
			applications: appsResult.rows.map((row) => ({
				id: row.id,
				name: row.name,
				description: row.description,
				websiteUrl: row.website_url,
				scopes: row.scopes || [],
				isActive: row.is_active,
				createdAt: row.created_at,
				activeUsers: parseInt(row.active_users)
			})),
			stats: {
				totalApps: parseInt(statsResult.rows[0].total_apps),
				activeApps: parseInt(statsResult.rows[0].active_apps),
				totalAuthorizations: parseInt(statsResult.rows[0].total_authorizations)
			},
			user: {
				userId: locals.user.userId,
				userName: locals.user.userName,
				userRole: locals.user.userRole
			}
		};
	} catch (error) {
		console.error('Error loading third-party apps admin page:', error);
		return {
			applications: [],
			stats: { totalApps: 0, activeApps: 0, totalAuthorizations: 0 },
			error: 'Failed to load application data'
		};
	}
}
