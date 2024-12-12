export async function load({ locals }) {
  console.log('Loading menu page');
  
  if (!locals.user) {
    console.log('No user found, redirecting to login');
    throw redirect(302, '/login');
  }

  console.log('User in +page.server.js:', locals.user);

  return {
    userRole: locals.user.roleName,
  };
}
