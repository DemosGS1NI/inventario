import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { AUTH } from '$lib/constants.js';

dotenv.config();

// Authentication middleware
function requireAuth(event) {
  const user = event.locals.user;
  if (!user) {
    throw errorResponse(401, 'UNAUTHORIZED', 'Se requiere autenticacion');
  }
  return user;
}

export async function GET(event) {
  try {
    // Verify user is logged in
    const user = requireAuth(event);

    const result = await sql`
      SELECT 
        u.id, 
        u.nombre, 
        u.apellido, 
        u.numero_telefono, 
        u.rol_id, 
        r.nombre_rol, 
        u.activo,
        u.debe_cambiar_pin
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.fecha_creacion DESC
    `;
    
    return successResponse(
      { users: result.rows },
      'Usuarios obtenidos satisfactoriamente'
    );
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    if (error.status) return error; // Return error response if it's already formatted
    return errorResponse(500, 'INTERNAL_ERROR', 'Error obteniendo usuarios');
  }
}

export async function POST(event) {
  try {
    // Verify user is logged in
    const user = requireAuth(event);

    const { nombre, apellido, numero_telefono, rol_id } = await event.request.json();

    // Validate required fields
    if (!nombre || !apellido || !numero_telefono || !rol_id) {
      return errorResponse(400, 'INVALID_INPUT', 'Falta algun campo requerido (Nombre, Apellido, Telefono, Rol)');
    }

    // Hash the default PIN "0000"
    const defaultPinHash = await bcrypt.hash(AUTH.DEFAULT_PIN, AUTH.BCRYPT_ROUNDS); 
    await sql`
      INSERT INTO usuarios (
        nombre, 
        apellido, 
        numero_telefono, 
        rol_id, 
        pin_hash, 
        debe_cambiar_pin, 
        activo, 
        fecha_creacion,
        created_by
      )
      VALUES (
        ${nombre}, 
        ${apellido}, 
        ${numero_telefono}, 
        ${rol_id}, 
        ${defaultPinHash}, 
        true, 
        true, 
        NOW(),
        ${user.userId}
      )
    `;

    return successResponse(
      null,
      'Usuario creado satisfactoriamente',
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creando usuario:', error);
    if (error.status) return error;
    return errorResponse(500, 'INTERNAL_ERROR', 'Error creando usuario');
  }
}

export async function PUT(event) {
  try {
    // Verify user is logged in
    const user = requireAuth(event);

    const { id, numero_telefono, nombre, apellido, rol_id, activo, debe_cambiar_pin } = await event.request.json();

    // Validate required fields
    if (!id || !nombre || !apellido || !numero_telefono || !rol_id) {
      return errorResponse(400, 'INVALID_INPUT', 'Falta algun campo requerido (Nombre, Apellido, Telefono, Rol)');
    }

    await sql`
      UPDATE usuarios
      SET 
        nombre = ${nombre}, 
        apellido = ${apellido}, 
        numero_telefono = ${numero_telefono}, 
        rol_id = ${rol_id},  
        activo = ${activo},  
        debe_cambiar_pin = ${debe_cambiar_pin}, 
        fecha_actualizacion = NOW(),
        updated_by = ${user.userId}
      WHERE id = ${id}
    `;

    return successResponse(
      null,
      'Usuario actualizado satisfactoriamente'
    );
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    if (error.status) return error;
    return errorResponse(500, 'INTERNAL_ERROR', 'Error actualizando usuario');
  }
}

export async function DELETE(event) {
  try {
    // Verify user is logged in
    const user = requireAuth(event);

    const { id } = await event.request.json();

    // Verify user exists before deletion
    const existingUser = await sql`
      SELECT * FROM usuarios WHERE id = ${id}
    `;

    if (existingUser.rows.length === 0) {
      return errorResponse(404, 'NOT_FOUND', 'Usuario no encontrado');
    }

    // First, delete related audit logs
    await sql`
      DELETE FROM audit_log 
      WHERE performed_by = ${id}
    `;

    // Then delete the user
    await sql`
      DELETE FROM usuarios WHERE id = ${id}
    `;

    return successResponse(
      null,
      'Usuario eliminado con éxito'
    );
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    if (error.status) return error;
    return errorResponse(500, 'INTERNAL_ERROR', 'Error eliminando usuario');
  }
}