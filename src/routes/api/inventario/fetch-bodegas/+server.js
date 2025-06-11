import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const GET = async ({ locals }) => {
	requireAuth(locals);

	try {
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
			? `Found ${bodegas.length} bodegas in inventory system`
			: 'No bodegas found in inventory system';

		// Debug logging
		console.log('Fetching bodegas:', bodegas);
		
		return successResponse(bodegas, contextualMessage);
	} catch (error) {
		console.error('fetch-bodegas Error Details:', {
			message: error.message,
			stack: error.stack,
			name: error.name,
			code: error.code
		});

		// Return a standardized error response
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch bodegas', error.message);
	}
};