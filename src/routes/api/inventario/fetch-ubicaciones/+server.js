// src/routes/api/inventario/fetch-ubicaciones/+server.js
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function GET({ url, locals }) {
	requireAuth(locals);

	// Get query parameters
	const bodega = url.searchParams.get('bodega');

	// Debug logging
	console.log('API received parameters:', { bodega });

	// Validate required parameters
	if (!bodega) {
		return errorResponse(400, 'BAD_REQUEST', 'Bodega is required');
	}

	try {
		// Query to get unique ubicaciones for the given bodega and marca
		const result = await sql`
            SELECT DISTINCT ubicacion 
              FROM inventario 
             WHERE bodega = ${bodega} 
               AND ubicacion IS NOT NULL
          ORDER BY ubicacion
        `;

		// Extract ubicaciones from the result
		const ubicaciones = result.rows.map((row) => row.ubicacion);

		return successResponse(ubicaciones, 'Ubicaciones fetched successfully');
	} catch (error) {
		console.error('Error fetching ubicaciones:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error fetching ubicaciones', error.message);
	}
}
