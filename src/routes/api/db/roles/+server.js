import { json } from '@sveltejs/kit';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

// Get all roles
export async function GET() {
  try {
    const result = await sql`SELECT * FROM roles ORDER BY fecha_creacion DESC`;
    return json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return json({ success: false, error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// Create a new role
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { nombre_rol, descripcion, opciones_menu, accesos_api } = body;

    const result = await sql`
      INSERT INTO roles (nombre_rol, descripcion, opciones_menu, accesos_api)
      VALUES (${nombre_rol}, ${descripcion}, ${JSON.stringify(opciones_menu)}, ${JSON.stringify(accesos_api)})
      RETURNING *`;

    return json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating role:', error);
    return json({ success: false, error: 'Failed to create role' }, { status: 500 });
  }
}

// Update an existing role
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const { id, nombre_rol, descripcion, opciones_menu, accesos_api } = body;

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
      return json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    return json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating role:', error);
    return json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}

// Delete a role
export async function DELETE({ request }) {
  try {
    const body = await request.json();
    const { id } = body;

    const result = await sql`
      DELETE FROM roles
      WHERE id = ${id}
      RETURNING *`;

    if (result.rowCount === 0) {
      return json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    return json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting role:', error);
    return json({ success: false, error: 'Failed to delete role' }, { status: 500 });
  }
}
