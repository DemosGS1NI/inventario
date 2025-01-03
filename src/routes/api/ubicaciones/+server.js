import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function GET({ url }) {
  const bodega = url.searchParams.get('bodega'); // Get the `bodega` parameter from the query string
  const marca = url.searchParams.get('marca'); // Get the `bodega` parameter from the query string  

  // Validate the query parameter
  if (!bodega && !marca) {
    return errorResponse(400, 'BAD_REQUEST', 'Bodega and Marca parameters are required');
  }

  try {
    // Query to fetch distinct marcas for the given bodega
    const result = await sql`
      SELECT DISTINCT ubicacion
      FROM inventario
      WHERE bodega = ${bodega}
        AND marca = ${marca}
    `;

    if (result.rows.length > 0) {
      const ubicaciones = result.rows.map((row) => row.ubicacion);
      return successResponse(ubicaciones, 'Ubicaciones fetched successfully');
    } else {
      return errorResponse(404, 'NOT_FOUND', 'No ubicacioines found for the specified bodega and marca');
    }
  } catch (error) {
    console.error('Error fetching ubicaciones:', error);
    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An error occurred while fetching ubicaciones',
      error.message
    );
  }
}
