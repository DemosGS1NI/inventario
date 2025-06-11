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
	console.log('API Ubicaciones received parameters:', { bodega });

	// Validate required parameters
	if (!bodega) {
		return errorResponse(400, 'BAD_REQUEST', 'Bodega is required');
	}

	try {
		// Query to get unique ubicaciones for the given bodega
		const result = await sql`
            SELECT DISTINCT ubicacion 
              FROM inventario 
             WHERE bodega = ${bodega} 
               AND ubicacion IS NOT NULL
          ORDER BY ubicacion
        `;

		// Extract ubicaciones from the result
		const ubicaciones = result.rows.map((row) => row.ubicacion);

		// Provide contextual message based on result
		const contextualMessage = ubicaciones.length > 0 
			? `Found ${ubicaciones.length} ubicaciones for bodega "${bodega}"`
			: `No ubicaciones configured for bodega "${bodega}"`;

		return successResponse(ubicaciones, contextualMessage);
	} catch (error) {
		console.error('Error fetching ubicaciones:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error fetching ubicaciones', error.message);
	}
}