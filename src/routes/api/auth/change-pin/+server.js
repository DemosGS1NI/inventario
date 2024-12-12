import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

export async function POST({ request, locals }) {
  const { newPin, confirmNewPin } = await request.json();

  const userId = locals.user?.id; // Get userId from session
  if (!userId) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: User session not found' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log('Updating PIN for user ID:', userId);

  if (newPin !== confirmNewPin) {
    return new Response(
      JSON.stringify({ message: 'PINs do not match' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Hash the new PIN
    const hashedPin = await bcrypt.hash(newPin, 12);

    // Update the user's PIN in the database
    const result = await sql`
      UPDATE usuarios 
      SET pin_hash = ${hashedPin}, debe_cambiar_pin = false 
      WHERE id = ${userId}
    `;

    console.log('SQL Update Result:', result);

    return new Response(
      JSON.stringify({ message: 'PIN successfully changed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error during PIN change:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
