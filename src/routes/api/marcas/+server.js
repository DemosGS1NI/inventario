import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function GET({ url }) {
  const bodega = url.searchParams.get('bodega'); // Get the `bodega` parameter from the query string

  // Validate the query parameter
  if (!bodega) {
    return errorResponse(400, 'BAD_REQUEST', 'Bodega parameter is required');
  }

  try {
    // Query to fetch distinct marcas for the given bodega
    const result = await sql`
      SELECT DISTINCT marca
      FROM inventario
      WHERE bodega = ${bodega}
    `;

    if (result.rows.length > 0) {
      const marcas = result.rows.map((row) => row.marca);
      return successResponse(marcas, 'Marcas fetched successfully');
    } else {
      return errorResponse(404, 'NOT_FOUND', 'No marcas found for the specified bodega');
    }
  } catch (error) {
    console.error('Error fetching marcas:', error);
    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An error occurred while fetching marcas',
      error.message
    );
  }
}
