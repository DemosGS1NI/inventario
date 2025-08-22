// src/routes/authorizations/+page.server.js
import { redirect } from '@sveltejs/kit';
import { getUserAuthorizations, getAuthorizationStats } from '$lib/services/authorizationService';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	try {
		const [authorizations, stats] = await Promise.all([
			getUserAuthorizations(locals.user.userId),
			getAuthorizationStats(locals.user.userId)
		]);

		return {
			authorizations,
			stats,
			user: {
				userId: locals.user.userId,
				userName: locals.user.userName,
				userRole: locals.user.userRole
			}
		};
	} catch (error) {
		console.error('Error loading authorizations page:', error);
		return {
			authorizations: [],
			stats: {
				totalAuthorizations: 0,
				usedAuthorizations: 0,
				activeAuthorizations: 0
			},
			error: 'Failed to load authorization data'
		};
	}
}
