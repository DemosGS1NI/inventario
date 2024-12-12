import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export async function POST({ request }) {
  const { numero_telefono, pin } = await request.json();

  try {
    const result = await sql`
      SELECT id, pin_hash, activo, debe_cambiar_pin
      FROM usuarios
      WHERE numero_telefono = ${numero_telefono}
    `;

    const user = result.rows[0];
    if (!user) {
      return new Response(
        JSON.stringify({ message: 'Invalid phone number or PIN' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!await bcrypt.compare(pin, user.pin_hash)) {
      return new Response(
        JSON.stringify({ message: 'Invalid phone number or PIN' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!user.activo) {
      return new Response(
        JSON.stringify({ message: 'Account is inactive' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create session
    const sessionId = randomUUID();
    await sql`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (${sessionId}, ${user.id}, NOW(), NOW() + INTERVAL '1 hour')
    `;

    return new Response(
      JSON.stringify({
        message: 'Login successful!',
        user: { debe_cambiar_pin: user.debe_cambiar_pin },
      }),
      {
        status: 200,
        headers: {
          'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Secure; Path=/; SameSite=Strict`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error during login:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
