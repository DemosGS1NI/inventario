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
	const ubicacion = url.searchParams.get('ubicacion');

	// Debug logging
	console.log('Obteniendo marcas:', { bodega, ubicacion });

	// Validate required parameters
	if (!bodega) {
		return errorResponse(400, 'BAD_REQUEST', 'El parámetro Bodega es requerido');
	}

	try {
		let result;
		let contextInfo = '';

		// Query to get unique marcas for the given parameters
		if (ubicacion) {
			result = await sql`
				SELECT DISTINCT marca 
				FROM inventario 
				WHERE bodega = ${bodega} 
				AND ubicacion = ${ubicacion}
				AND marca IS NOT NULL
				ORDER BY marca
			`;
			contextInfo = `bodega "${bodega}" y ubicación "${ubicacion}"`;
		} else {
			result = await sql`
				SELECT DISTINCT marca 
				FROM inventario 
				WHERE bodega = ${bodega} 
				AND marca IS NOT NULL
				ORDER BY marca
			`;
			contextInfo = `bodega "${bodega}"`;
		}

		// Extract marcas from the result
		const marcas = result.rows.map((row) => row.marca);

		// Provide contextual message based on result
		const contextualMessage = marcas.length > 0 
			? `Se encontraron ${marcas.length} marcas para la ${contextInfo}`
			: `No hay marcas configuradas para la ${contextInfo}`;

		return successResponse(marcas, contextualMessage);
	} catch (error) {
		console.error('Error al obtener marcas:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Fallo al obtener marcas', error.message);
	}
}