import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';

dotenv.config();

export async function POST({ cookies }) {
  const sessionId = cookies.get('sessionId');

  if (!sessionId) {
    return errorResponse(400, 'NO_SESSION', 'No active session found to log out.');
  }

  try {
    // Delete the session from the database
    await sql`
      DELETE FROM sessions WHERE id = ${sessionId}
    `;

    // Delete the session cookie
    cookies.delete('sessionId', { path: '/' });

    // Return a successful logout response
    return successResponse(
      null,
      'Logout successful',
      {
        headers: {
          'Set-Cookie': 'sessionId=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error during logout:', error);

    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Failed to log out due to a server error.', error.message);
  }
}
