import { successResponse, errorResponse } from '$lib/responseUtils';

export async function POST({ cookies }) {
  const token = cookies.get('jwt');

  if (!token) {
    return errorResponse(400, 'NO_TOKEN', 'No active session found to log out.');
  }

  try {
    // Invalidate the JWT by removing it from the cookies
    cookies.delete('jwt', { path: '/' });

    // Optionally, you can also include a header to ensure the cookie is deleted
    return successResponse(
      null,
      'Logout successful',
      {
        headers: {
          'Set-Cookie': 'jwt=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error during logout:', error);

    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'Failed to log out due to a server error.',
      error.message
    );
  }
}
