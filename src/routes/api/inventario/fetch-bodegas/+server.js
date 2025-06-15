import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const GET = async ({ locals }) => {
	requireAuth(locals);

	try {
		console.log('🔍 Fetching bodegas from database...');
		// Query to fetch distinct bodega names
		const { rows } = await sql`
			SELECT DISTINCT bodega
			FROM inventario
			WHERE bodega IS NOT NULL
			ORDER BY bodega;
		`;

		// Extract the bodega names into an array
		const bodegas = rows.map((row) => row.bodega);

		// Provide contextual message based on result
		const contextualMessage = bodegas.length > 0 
			? `Se encontraron ${bodegas.length} bodegas en el sistema de inventario`
			: 'No se encontraron bodegas en el sistema de inventario';

		// Debug logging
		console.log('📊 Bodegas result:', { count: bodegas.length });
		
		return successResponse(bodegas, contextualMessage);
	} catch (error) {
		console.error('Error al obtener bodegas:', error);
		return errorResponse(
			500, 
			'INTERNAL_SERVER_ERROR', 
			'Fallo al obtener bodegas', 
			error.message
		);
	}
};