// src/routes/api/inventario/fetch-ubicaciones/+server.js
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function GET({ url, locals }) {
	// Get user ID from session for security
	const userId = locals.user?.userId;
	if (!userId) {
		console.error('Unauthorized: User session not found');
		return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
	}

	// Get query parameters
	const bodega = url.searchParams.get('bodega');

	// Debug logging
	console.log('API received parameters:', { bodega });

	// Validate required parameters
	if (!bodega) {
		return errorResponse(400, 'BAD_REQUEST', 'Bodega and Marca are required');
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

		// Debug logging
		//console.log('Query results:', result.rows);

		// Extract ubicaciones from the result
		const ubicaciones = result.rows.map((row) => row.ubicacion);

		return successResponse(ubicaciones, 'Ubicaciones fetched successfully');
	} catch (error) {
		console.error('Error fetching ubicaciones:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error fetching ubicaciones', error.message);
	}
}
