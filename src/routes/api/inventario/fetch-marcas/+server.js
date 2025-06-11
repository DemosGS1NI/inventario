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
	const ubicacion = url.searchParams.get('ubicacion');

	// Debug logging
	console.log('API received parameters:', { bodega, ubicacion });

	// Validate required parameters
	if (!bodega) {
		return errorResponse(400, 'BAD_REQUEST', 'El parametro Bodega es requerido');
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
			contextInfo = `bodega "${bodega}" and ubicacion "${ubicacion}"`;
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
			? `Found ${marcas.length} marcas for ${contextInfo}`
			: `No marcas configured for ${contextInfo}`;

		return successResponse(marcas, contextualMessage);
	} catch (error) {
		console.error('Error fetching marcas:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error fetching marcas', error.message);
	}
}