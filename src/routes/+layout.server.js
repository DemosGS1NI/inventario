import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
	// Redirect to login if no user is logged in and the path is not the login page
	if (!locals.user && url.pathname !== '/') {
		throw redirect(302, '/');
	}

	// Provide user information and role to layout
	return {
		userId: locals.user?.userId,
		userName: locals.user?.userName, // `nombre` from the database for the user's name
		userRole: locals.user?.userRole // `roleName` from the database for the user's role
	};
}
