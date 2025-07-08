import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAdmin } from '$lib/authMiddleware';
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

export async function GET({ url, locals }) {
	requireAdmin(locals);

	const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 10));

	if (isNaN(page) || isNaN(limit)) {
		return errorResponse(400, 'INVALID_PARAMS', 'Parámetros de paginación inválidos');
	}

	// Calculate offset, ensuring it's 0 for page 1
	const offset = page === 1 ? 0 : (page - 1) * limit;

	try {
		// Get total count first
		const countResult = await sql`SELECT COUNT(*) as total FROM inventario;`;
		const totalRecords = parseInt(countResult.rows[0].total, 10);
		const totalPages = Math.ceil(totalRecords / limit);

		// If no records, return empty result
		if (totalRecords === 0) {
			return successResponse(
				{
					items: [],
					pagination: {
						currentPage: page,
						totalPages: 0,
						totalRecords: 0,
						limit
					}
				},
				'No hay registros de inventario disponibles'
			);
		}

		// Fetch paginated data with tagged template (works with both pg and @vercel/postgres)
		const result = await sql`
			SELECT 
				id,
				bodega,
				marca,
				codigo_barras,
				numero_parte,
				descripcion,
				inventario_sistema
			FROM inventario
			ORDER BY bodega, marca, id
			LIMIT ${limit}
			OFFSET ${offset};
		`;

		// Return the rows directly as items
		const response = {
			items: result.rows || [],
			pagination: {
				currentPage: page,
				totalPages,
				totalRecords,
				limit
			}
		};

		return successResponse(
			{
				items: response.items,
				pagination: response.pagination
			},
			'Registros de inventario obtenidos exitosamente'
		);
	} catch (error) {
		console.error('❌ Error al obtener inventario:', error);
		return errorResponse(
			500, 
			'DATABASE_ERROR', 
			'Error al obtener registros de inventario', 
			error.message
		);
	}
}
