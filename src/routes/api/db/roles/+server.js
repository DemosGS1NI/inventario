import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

export async function GET() {
  try {
    const result = await sql`SELECT id, nombre_rol FROM roles ORDER BY id ASC`;
    return new Response(JSON.stringify(result.rows), { status: 200 });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}