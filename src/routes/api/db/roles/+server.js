import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';

dotenv.config();

// Get all roles
export async function GET() {
  try {
    const result = await sql`SELECT * FROM roles ORDER BY fecha_creacion DESC`;
    return successResponse(result.rows, 'Roles obtenidos satisfactoriamente');
  } catch (error) {
    console.error('Error fetching roles:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error al obtener roles', error.message);
  }
}

// Create a new role
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { nombre_rol, descripcion, opciones_menu, accesos_api } = body;

    if (!nombre_rol || !descripcion || !opciones_menu || !accesos_api) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Todos los campos son requeridos');
    }

    const result = await sql`
      INSERT INTO roles (nombre_rol, descripcion, opciones_menu, accesos_api)
      VALUES (${nombre_rol}, ${descripcion}, ${JSON.stringify(opciones_menu)}, ${JSON.stringify(accesos_api)})
      RETURNING *`;

    return successResponse(result.rows[0], 'Rol creado satisfactoriamente');
  } catch (error) {
    console.error('Error creating role:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error al crear rol', error.message);
  }
}

// Update an existing role
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const { id, nombre_rol, descripcion, opciones_menu, accesos_api } = body;

    if (!id || !nombre_rol || !descripcion || !opciones_menu || !accesos_api) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Todos los campos son requeridos');
    }

    const result = await sql`
      UPDATE roles
      SET 
        nombre_rol = ${nombre_rol}, 
        descripcion = ${descripcion},
        opciones_menu = ${JSON.stringify(opciones_menu)},
        accesos_api = ${JSON.stringify(accesos_api)},
        fecha_actualizacion = NOW()
      WHERE id = ${id}
      RETURNING *`;

    if (result.rowCount === 0) {
      return errorResponse(404, 'NOT_FOUND', 'Role not found');
    }

    return successResponse(result.rows[0], 'Role updated successfully');
  } catch (error) {
    console.error('Error updating role:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Failed to update role', error.message);
  }
}

// Delete a role
export async function DELETE({ request }) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse(400, 'VALIDATION_ERROR', 'ID de rol es requerido');
    }

    const result = await sql`
      DELETE FROM roles
      WHERE id = ${id}
      RETURNING *`;

    if (result.rowCount === 0) {
      return errorResponse(404, 'NOT_FOUND', 'Rol no encontrado');
    }

    return successResponse(result.rows[0], 'Rol eliminado satisfactoriamente');
  } catch (error) {
    console.error('Error deleting role:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error al tratar de eliminar rol', error.message);
  }
}
