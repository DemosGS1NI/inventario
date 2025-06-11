import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

export async function PUT({ request, locals }) {
	const user = requireAuth(locals);

	try {
		const { id, validado_por } = await request.json();

		console.log(id, user.userId);

		// Validate input
		if (!id || !user.userId) {
			return errorResponse(400, 'INVALID_INPUT', 'Invalid or missing input data');
		}

		// Update the record in the database
		const result = await sql`
      UPDATE inventario
      SET 
        validado = true, 
        validado_por = ${user.userId}
      WHERE id = ${id}
      RETURNING *;
    `;

		if (result.rowCount === 0) {
			return errorResponse(404, 'RECORD_NOT_FOUND', 'Record not found');
		}

		return successResponse({ record: result.rows[0] }, 'Record validated successfully');
	} catch (error) {
		console.error('Error validating record:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'An error occurred while validating the record',
			error.message
		);
	}
}
