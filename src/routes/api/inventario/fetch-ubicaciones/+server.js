// src/routes/api/inventario/fetch-ubicaciones/+server.js
import { sql } from '$lib/database';
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
	console.log('Obteniendo ubicaciones:', { bodega });

	// Validate required parameters
	if (!bodega) {
		return errorResponse(400, 'BAD_REQUEST', 'El parámetro Bodega es requerido');
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
		const contextualMessage =
			ubicaciones.length > 0
				? `Se encontraron ${ubicaciones.length} ubicaciones para la bodega "${bodega}"`
				: `No hay ubicaciones configuradas para la bodega "${bodega}"`;

		return successResponse(ubicaciones, contextualMessage);
	} catch (error) {
		console.error('Error al obtener ubicaciones:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al obtener ubicaciones',
			error.message
		);
	}
}
