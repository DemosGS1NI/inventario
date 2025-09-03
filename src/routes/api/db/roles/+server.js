import { sql } from '$lib/database';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth, requireAdmin } from '$lib/authMiddleware';

dotenv.config();

// Create a new role
export async function POST({ request, locals }) {
	// Require admin for creating roles
	requireAdmin(locals);

	try {
		const { nombre_rol, descripcion } = await request.json();

		// Validate input
		if (!nombre_rol) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Nombre del rol es requerido');
		}

		// Check if role already exists
		const existingRole = await sql`
      SELECT id FROM roles WHERE nombre_rol = ${nombre_rol}
    `;

		if (existingRole.rows.length > 0) {
			return errorResponse(409, 'CONFLICT', 'Ya existe un rol con ese nombre');
		}

		const creado_por = locals.user?.userId || null;
		const result = await sql`
      INSERT INTO roles (nombre_rol, descripcion, creado_por)
      VALUES (${nombre_rol}, ${descripcion}, ${creado_por})
      RETURNING id, nombre_rol, descripcion, creado_por;
    `;

		return successResponse(result.rows[0], 'Rol creado satisfactoriamente', { status: 201 });
	} catch (error) {
		console.error('Error creating role:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Fallo al crear un rol', error.message);
	}
}

// Read all roles
export async function GET({ locals }) {
	// All authenticated users can read roles
	requireAuth(locals);

	try {
		const result = await sql`
      SELECT id, nombre_rol, descripcion, creado_por
      FROM roles 
      ORDER BY id
    `;

		return successResponse(result.rows, 'Roles obtenidos satisfactoriamente');
	} catch (error) {
		console.error('Error fetching roles:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Fallo al obtener roles', error.message);
	}
}

// Update a role by ID
export async function PUT({ request, locals }) {
	// Require admin for updating roles
	requireAdmin(locals);

	try {
		const { id, nombre_rol, descripcion } = await request.json();

		// Validate input
		if (!id || !nombre_rol) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID y nombre del rol son requeridos');
		}

		// Check if role exists
		const existingRole = await sql`
      SELECT id FROM roles WHERE id = ${id}
    `;

		if (existingRole.rows.length === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Rol no encontrado');
		}

		// Check if new name conflicts with another role
		const nameConflict = await sql`
      SELECT id FROM roles 
      WHERE nombre_rol = ${nombre_rol} AND id != ${id}
    `;

		if (nameConflict.rows.length > 0) {
			return errorResponse(409, 'CONFLICT', 'Ya existe un rol con ese nombre');
		}

		const result = await sql`
      UPDATE roles
      SET nombre_rol = ${nombre_rol}, 
          descripcion = ${descripcion}
      WHERE id = ${id}
      RETURNING id, nombre_rol, descripcion, creado_por;
    `;

		return successResponse(result.rows[0], 'Rol actualizado satisfactoriamente');
	} catch (error) {
		console.error('Error updating role:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Fallo al actualizar rol', error.message);
	}
}

// Delete a role by ID
export async function DELETE({ request, locals }) {
	// Require admin for deleting roles
	requireAdmin(locals);

	try {
		const { id } = await request.json();

		// Validate input
		if (!id) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID es requerido');
		}

		// Check if role exists
		const existingRole = await sql`
      SELECT id, nombre_rol FROM roles WHERE id = ${id}
    `;

		if (existingRole.rows.length === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Rol no encontrado');
		}

		const result = await sql`
      DELETE FROM roles
      WHERE id = ${id}
      RETURNING id, nombre_rol;
    `;

		console.log(`Rol ${result.rows[0].nombre_rol} eliminado por ${locals.user.userId}`);

		return successResponse(null, 'Rol eliminado satisfactoriamente');
	} catch (error) {
		console.error('Error deleting role:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Fallo al eliminar rol', error.message);
	}
}
