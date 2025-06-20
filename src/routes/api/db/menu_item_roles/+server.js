import { sql } from '$lib/database';
import { requireAuth, requireAdmin } from '$lib/authMiddleware';
import { successResponse, errorResponse } from '$lib/responseUtils';

// Get all menu item roles
export async function GET({ locals }) {
	requireAuth(locals);
	try {
		const result = await sql`
      SELECT mir.menu_item_id, mi.label as menu_item_label, mi.order_index as menu_item_order, mir.role_id, r.nombre_rol as role_name,
             mi.category_id, mc.name as category_name, mc.order_index as category_order
      FROM menu_item_roles mir
      LEFT JOIN menu_items mi ON mir.menu_item_id = mi.id
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN roles r ON mir.role_id = r.id
      ORDER BY mir.role_id, mc.order_index, mi.order_index, mir.menu_item_id
    `;
		return successResponse(result.rows, 'Roles de ítems de menú obtenidos satisfactoriamente');
	} catch (error) {
		console.error('Error obteniendo roles de ítems de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error obteniendo roles de ítems de menú');
	}
}

// Assign a role to a menu item
export async function POST({ request, locals }) {
	requireAdmin(locals);
	try {
		const { menu_item_id, role_id } = await request.json();
		if (!menu_item_id || !role_id) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Ítem de menú y rol son requeridos');
		}
		const result = await sql`
      INSERT INTO menu_item_roles (menu_item_id, role_id)
      VALUES (${menu_item_id}, ${role_id})
      ON CONFLICT DO NOTHING
      RETURNING menu_item_id, role_id
    `;
		return successResponse(result.rows[0] || { menu_item_id, role_id }, 'Rol asignado al ítem de menú satisfactoriamente', { status: 201 });
	} catch (error) {
		console.error('Error asignando rol a ítem de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error asignando rol a ítem de menú');
	}
}

// Remove a role from a menu item
export async function DELETE({ request, locals }) {
	requireAdmin(locals);
	try {
		const { menu_item_id, role_id } = await request.json();
		if (!menu_item_id || !role_id) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Ítem de menú y rol son requeridos');
		}
		const result = await sql`
      DELETE FROM menu_item_roles WHERE menu_item_id = ${menu_item_id} AND role_id = ${role_id} RETURNING menu_item_id, role_id
    `;
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Asignación no encontrada');
		}
		return successResponse(null, 'Rol removido del ítem de menú satisfactoriamente');
	} catch (error) {
		console.error('Error removiendo rol de ítem de menú:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error removiendo rol de ítem de menú');
	}
}
