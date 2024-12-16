import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

export async function handle({ event, resolve }) {
  const sessionId = event.cookies.get('sessionId');

  if (sessionId) {
    try {
      const result = await sql`
        SELECT u.nombre, r.nombre_rol
        FROM sessions s
        JOIN usuarios u ON s.user_id = u.id
        JOIN roles r ON u.rol_id = r.id
        WHERE s.id = ${sessionId} AND s.expires_at > NOW()
      `;

      if (result.rows.length > 0) {
        const user = result.rows[0];
        event.locals.user = {
          nombre: user.nombre, // User's name
          roleName: user.nombre_rol, // User's role
        };
      }
    } catch (error) {
      console.error('Error validating session:', error);
    }
  }

  return resolve(event);
}
