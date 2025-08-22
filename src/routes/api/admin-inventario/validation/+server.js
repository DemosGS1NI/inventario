import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

export async function PUT({ request, locals }) {
	const user = requireAuth(locals);

	try {
		const { id, validado_por } = await request.json();

		console.log('Validando registro:', { id, userId: user.userId });

		// Validate input
		if (!id || !user.userId) {
			return errorResponse(400, 'INVALID_INPUT', 'Datos de entrada inválidos o faltantes');
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
			return errorResponse(404, 'RECORD_NOT_FOUND', 'Registro no encontrado');
		}

		return successResponse({ record: result.rows[0] }, 'Registro validado satisfactoriamente');
	} catch (error) {
		console.error('Error al validar registro:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Error al validar el registro',
			error.message
		);
	}
}
