import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  console.log('Loading menu page');

  if (!locals.user) {
    console.log('No user found, redirecting to login');
    throw redirect(302, '/login');
  }

  console.log('User in +page.server.js:', locals.user);

  if (!locals.user.roleName) {
    console.error('Role name not found for user:', locals.user);
    throw new Error('User role not defined');
  }

  return {
    userRole: locals.user.roleName
  };
}
