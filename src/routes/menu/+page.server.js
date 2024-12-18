import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  console.log('Loading menu page');

  if (!locals.user) {
    console.log('No user found, redirecting to login');
    throw redirect(302, '/login');
  }

  if (!locals.user.roleName) {
    console.error('Role name not found for user:', locals.user);
    throw new Error('User role not defined');
  }

  return {
    username: locals.user.username,
    userRole: locals.user.roleName
  };
}
