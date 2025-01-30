import { sql } from '@vercel/postgres';  // Importing the sql function from @vercel/postgres
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file


export async function DELETE({ locals }) {
  // Check if the user is authenticated and has the correct role
  const user = locals?.user; //
  if (!user) {
    return errorResponse(401, 'UNAUTHORIZED', 'You must be logged in to delete inventory.');
  }

  // Optional: Check for specific role (e.g., admin)
  if (user.userRole !== 'Admin') {
    return errorResponse(403, 'FORBIDDEN', 'You do not have permission to delete inventory.');
  }

  try {
    // Delete all rows from the table
    await sql`DELETE FROM inventario`;

    return successResponse(null, 'TODOS los registros fueron eliminados.');
  } catch (error) {
    console.error('Error deleting rows:', error);
    return errorResponse(500, 'DELETE_ERROR', 'Failed to delete rows.', error.message);
  }
}
