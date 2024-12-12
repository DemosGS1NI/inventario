import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

export async function POST({ request, cookies }) {
  const sessionId = cookies.get('sessionId');

  if (sessionId) {
    try {
      await sql`
        DELETE FROM sessions WHERE id = ${sessionId}
      `;
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': 'sessionId=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0',
    },
  });
}
