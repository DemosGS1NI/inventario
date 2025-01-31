import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function GET({ url, locals }) {
  // Check if user is authenticated
  if (!locals.user) {
    return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const bodega = url.searchParams.get('bodega');


  // Validate the query parameters
  if (!bodega) {
    return errorResponse(400, 'BAD_REQUEST', 'Bodega parameter is required');
  }

   try {
    // Log the request for audit purposes
    console.log(`User ${locals.user.userName} (${locals.user.userId}) requested marcas for bodega: ${bodega} `);

    const result = await sql`
      SELECT DISTINCT marca
      FROM inventario
      WHERE bodega = ${bodega}
        AND marca IS NOT NULL
      ORDER BY marca ASC NULLS LAST
    `;

    if (result.rows.length > 0) {
      const marcas = result.rows.map((row) => row.marca);
      return successResponse(marcas, 'Marcas fetched successfully');
    } else {
      return errorResponse(
        404, 
        'NOT_FOUND', 
        `No marcas found for bodega: ${bodega}`
      );
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