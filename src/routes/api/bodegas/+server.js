import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const GET = async () => {
  try {
    // Query to fetch distinct bodega names
    const { rows } = await sql`
      SELECT DISTINCT bodega
      FROM inventario;
    `;

    // Extract the bodega names into an array
    const bodegas = rows.map((row) => row.bodega);

    // Return the standardized success response
    console.log('fetching bodegas', bodegas);
    return successResponse(bodegas, 'Bodegas fetched successfully');
  } catch (error) {
    console.error('Error fetching bodegas:', error);

    // Return a standardized error response
    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch bodegas',
      error.message
    );
  }
};
