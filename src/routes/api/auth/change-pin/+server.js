import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

export async function POST({ request, locals }) {
  // Retrieve data from the request body
  const { newPin, confirmNewPin } = await request.json();

  // Get user ID from session
  const userId = locals.user?.id;
  if (!userId) {
    console.error('Unauthorized: User session not found');
    return new Response(
      JSON.stringify({ message: 'Unauthorized: User session not found' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log('Updating PIN for user ID:', userId);

  // Validate PINs
  if (!newPin || !confirmNewPin) {
    console.error('Missing newPin or confirmNewPin in request body');
    return new Response(
      JSON.stringify({ message: 'Both newPin and confirmNewPin are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (newPin !== confirmNewPin) {
    console.error('PINs do not match');
    return new Response(
      JSON.stringify({ message: 'PINs do not match' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Hash the new PIN
    console.log('Hashing the new PIN...');
    const hashedPin = await bcrypt.hash(newPin, 12);

    // Update the user's PIN in the database
    console.log('Executing SQL query to update PIN...');
    const result = await sql`
      UPDATE usuarios 
      SET pin_hash = ${hashedPin}, debe_cambiar_pin = false 
      WHERE id = ${userId}
    `;

    console.log('SQL Update Result:', result);

    if (result.rowCount === 0) {
      console.error('No rows updated. User ID may not exist.');
      return new Response(
        JSON.stringify({ message: 'User not found or PIN update failed' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
