import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export async function handle({ event, resolve }) {
  const sessionId = event.cookies.get('sessionId');

  if (sessionId) {
    try {
      // Fetch user and role from session
      const result = await sql`
        SELECT u.id, u.rol_id, r.nombre_rol
        FROM sessions s
        JOIN usuarios u ON s.user_id = u.id
        JOIN roles r ON u.rol_id = r.id
        WHERE s.id = ${sessionId} AND s.expires_at > NOW()
      `;

      if (result.rows.length > 0) {
        const user = result.rows[0];
        event.locals.user = {
          id: user.id,
          roleId: user.rol_id,
          roleName: user.nombre_rol,
        };
      }
    } catch (error) {
      console.error('Error validating session:', error);
    }
  }

  console.log('User set in locals:', event.locals.user);
  return resolve(event);
}
