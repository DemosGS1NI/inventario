import { sql } from '$lib/database';
import { requireAuth, requireAdmin } from '$lib/authMiddleware';
import { successResponse, errorResponse } from '$lib/responseUtils';

// Get all menu items
export async function GET({ locals }) {
	requireAuth(locals);
	try {
		const result = await sql`
      SELECT mi.id, mi.category_id, mc.name as category_name, mi.label, mi.href, mi.order_index, mi.is_active
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      ORDER BY mi.category_id, mi.order_index, mi.id
    `;
		return successResponse(result.rows, 'Ítems de menú obtenidos satisfactoriamente');
	} catch (error) {
		console.error('Error obteniendo ítems de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error obteniendo ítems de menú');
	}
}

// Create a new menu item
export async function POST({ request, locals }) {
	requireAdmin(locals);
	try {
		const { category_id, label, href, order_index, is_active } = await request.json();
		if (!category_id || !label) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Categoría y etiqueta son requeridas');
		}
		const result = await sql`
      INSERT INTO menu_items (category_id, label, href, order_index, is_active)
      VALUES (${category_id}, ${label}, ${href}, ${order_index ?? 0}, ${is_active ?? true})
      RETURNING id, category_id, label, href, order_index, is_active
    `;
		return successResponse(result.rows[0], 'Ítem de menú creado satisfactoriamente', {
			status: 201
		});
	} catch (error) {
		console.error('Error creando ítem de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error creando ítem de menú');
	}
}

// Update a menu item
export async function PUT({ request, locals }) {
	requireAdmin(locals);

	try {
		const { id, category_id, label, href, order_index, is_active } = await request.json();
		if (!id || !category_id || !label) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID, categoría y etiqueta son requeridos');
		}
		const result = await sql`
      UPDATE menu_items
      SET category_id = ${category_id}, label = ${label}, href = ${href}, order_index = ${order_index ?? 0}, is_active = ${is_active ?? true}
      WHERE id = ${id}
      RETURNING id, category_id, label, href, order_index, is_active
    `;
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Ítem de menú no encontrado');
		}
		return successResponse(result.rows[0], 'Ítem de menú actualizado satisfactoriamente');
	} catch (error) {
		console.error('Error actualizando ítem de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error actualizando ítem de menú');
	}
}

// Delete a menu item
export async function DELETE({ request, locals }) {
	requireAdmin(locals);
	try {
		const { id } = await request.json();
		if (!id) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID es requerido');
		}
		const result = await sql`
      DELETE FROM menu_items WHERE id = ${id} RETURNING id
    `;
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Ítem de menú no encontrado');
		}
		return successResponse(null, 'Ítem de menú eliminado satisfactoriamente');
	} catch (error) {
		console.error('Error eliminando ítem de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error eliminando ítem de menú');
	}
}
