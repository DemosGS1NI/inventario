import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	console.log('Loading menu page');

	if (!locals.user) {
		console.log('Menu API: No user found, redirecting to login');
		throw redirect(302, '/login');
	}

	if (!locals.user.userRole) {
		console.error('Role name not found for user:', locals.user);
		throw new Error('User role not defined');
	}

	return {
		userId: locals.user.userId,
		userName: locals.user.userName,
		userRole: locals.user.userRole
	};
}
