import { sql } from '@vercel/postgres'; // Importing the sql function from @vercel/postgres
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAdmin } from '$lib/authMiddleware';
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

export async function GET({ url, locals }) {
	requireAdmin(locals);

	const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 10));

	if (isNaN(page) || isNaN(limit)) {
		return errorResponse(400, 'INVALID_PARAMS', 'Invalid pagination parameters');
	}

	const offset = (page - 1) * limit;

	try {
		const result = await sql`
            SELECT * FROM inventario
            ORDER BY bodega, marca, ubicacion, id, codigo_barras
            LIMIT ${limit} 
            OFFSET ${offset};
        `;

		// Get total count in a separate query for now
		const countResult = await sql`SELECT COUNT(*) as total FROM inventario;`;
		const totalRecords = parseInt(countResult.rows[0].total, 10);
		const totalPages = Math.ceil(totalRecords / limit);

		return successResponse(
			{
				items: result.rows,
				pagination: {
					currentPage: page,
					totalPages,
					totalRecords,
					limit
				}
			},
			'Inventory items retrieved successfully'
		);
	} catch (error) {
		console.error('Error fetching inventory:', error);
		return errorResponse(500, 'DATABASE_ERROR', 'Failed to fetch inventory items', {
			error: error.message,
			stack: error.stack
		});
	}
}
