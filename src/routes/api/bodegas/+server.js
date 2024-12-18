import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';

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
