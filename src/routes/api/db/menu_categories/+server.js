import { sql } from '$lib/database';
import { requireAuth, requireAdmin } from '$lib/authMiddleware';
import { successResponse, errorResponse } from '$lib/responseUtils';

// Get all menu categories
export async function GET({ locals }) {
	requireAuth(locals);
	try {
		const result =
			await sql`SELECT id, name, order_index FROM menu_categories ORDER BY order_index, id`;
		return successResponse(result.rows, 'Categorías de menú obtenidas satisfactoriamente');
	} catch (error) {
		console.error('Error obteniendo categorías de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error obteniendo categorías de menú');
	}
}

// Create a new menu category
export async function POST({ request, locals }) {
	requireAdmin(locals);
	try {
		const { name, order_index } = await request.json();
		if (!name) {
			return errorResponse(400, 'VALIDATION_ERROR', 'El nombre es requerido');
		}
		const result = await sql`
      INSERT INTO menu_categories (name, order_index)
      VALUES (${name}, ${order_index ?? 0})
      RETURNING id, name, order_index
    `;
		return successResponse(result.rows[0], 'Categoría creada satisfactoriamente', { status: 201 });
	} catch (error) {
		console.error('Error creando categoría de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error creando categoría de menú');
	}
}

// Update a menu category
export async function PUT({ request, locals }) {
	requireAdmin(locals);
	try {
		const { id, name, order_index } = await request.json();
		if (!id || !name) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID y nombre son requeridos');
		}
		const result = await sql`
      UPDATE menu_categories
      SET name = ${name}, order_index = ${order_index ?? 0}
      WHERE id = ${id}
      RETURNING id, name, order_index
    `;
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Categoría no encontrada');
		}
		return successResponse(result.rows[0], 'Categoría actualizada satisfactoriamente');
	} catch (error) {
		console.error('Error actualizando categoría de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error actualizando categoría de menú');
	}
}

// Delete a menu category
export async function DELETE({ request, locals }) {
	requireAdmin(locals);
	try {
		const { id } = await request.json();
		if (!id) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID es requerido');
		}
		const result = await sql`
      DELETE FROM menu_categories WHERE id = ${id} RETURNING id
    `;
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Categoría no encontrada');
		}
		return successResponse(null, 'Categoría eliminada satisfactoriamente');
	} catch (error) {
		console.error('Error eliminando categoría de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error eliminando categoría de menú');
	}
}
