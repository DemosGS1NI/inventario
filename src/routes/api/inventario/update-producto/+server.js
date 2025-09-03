import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

export const PUT = async ({ request, locals }) => {
	requireAuth(locals);

	try {
		const { id, cantidad, ubicacion, bodega } = await request.json();

		if (!id || cantidad === undefined || !ubicacion || !bodega) {
			return errorResponse(
				400,
				'INVALID_REQUEST',
				'Faltan datos requeridos',
				'Se requieren id, cantidad, ubicacion y bodega'
			);
		}

		// Update the product
		const { rows } = await sql`
			UPDATE inventario
			SET cantidad = ${cantidad},
				ubicacion = ${ubicacion},
				bodega = ${bodega},
				updated_at = NOW()
			WHERE id = ${id}
			RETURNING *;
		`;

		if (rows.length === 0) {
			return errorResponse(
				404,
				'NOT_FOUND',
				'Producto no encontrado',
				`No se encontró el producto con id ${id}`
			);
		}

		// Invalidate cache for inventario table
		await sql.invalidateCache('inventario');

		return successResponse(rows[0], 'Producto actualizado exitosamente');
	} catch (error) {
		console.error('Error al actualizar producto:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al actualizar producto',
			error.message
		);
	}
};
