import { sql } from '$lib/database';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { AUTH } from '$lib/constants.js';
import { requireAuth, requireAdmin } from '$lib/authMiddleware';

dotenv.config();

export async function GET(event) {
	try {
		// Verify user is logged in
		const user = requireAuth(event.locals);

		const result = await sql`
      SELECT 
        u.id, 
				u.username,
        u.nombre, 
        u.apellido, 
        u.numero_telefono, 
        u.rol_id, 
        r.nombre_rol, 
        u.activo,
        u.debe_cambiar_pin,
        u.created_by,
        creator.nombre AS creador_nombre,
        creator.apellido AS creador_apellido,
        u.updated_by,
        updator.nombre AS actualizador_nombre,
        updator.apellido AS actualizador_apellido,
        u.fecha_creacion,
				u.fecha_actualizacion
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuarios creator ON u.created_by = creator.id
      LEFT JOIN usuarios updator ON u.updated_by = updator.id
      ORDER BY u.id
    `;

		return successResponse(result.rows, 'Usuarios obtenidos satisfactoriamente');
	} catch (error) {
		console.error('Error obteniendo usuarios:', error);
		if (error.status) return error; // Return error response if it's already formatted
		return errorResponse(500, 'INTERNAL_ERROR', 'Error obteniendo usuarios');
	}
}

export async function POST(event) {
	try {
		// Verify user is logged in
		const user = requireAuth(event.locals);

		const { nombre, apellido, numero_telefono, rol_id, username, password } =
			await event.request.json();

		// Validate required fields
		if (!nombre || !apellido || !numero_telefono || !rol_id || !username || !password) {
			return errorResponse(
				400,
				'INVALID_INPUT',
				'Falta algun campo requerido (Usuario, Nombre, Apellido, Telefono, Rol, Contraseña)'
			);
		}

		// Hash the provided password (also set pin_hash for backward compat)
		const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS);
		const created_by = user.userId;
		const result = await sql`
      INSERT INTO usuarios (
				nombre, 
				apellido, 
				numero_telefono, 
				username,
				rol_id, 
				pin_hash,
				password_hash,
				debe_cambiar_pin, 
				activo,
				created_by,
				updated_by
      )
      VALUES (
        ${nombre}, 
        ${apellido}, 
        ${numero_telefono}, 
				${username.toLowerCase()},
        ${rol_id}, 
				${passwordHash},
				${passwordHash},
				false, 
				true,
        ${created_by},
        ${created_by}
      )
			RETURNING id, username, nombre, apellido, numero_telefono, rol_id, activo, debe_cambiar_pin, created_by, updated_by
    `;

		return successResponse(result.rows[0], 'Usuario creado satisfactoriamente', { status: 201 });
	} catch (error) {
		console.error('Error creando usuario:', error);
		if (error.status) return error;
		return errorResponse(500, 'INTERNAL_ERROR', 'Error creando usuario');
	}
}

export async function PUT(event) {
	try {
		// Verify user is logged in
		const user = requireAuth(event.locals);

		const { id, numero_telefono, nombre, apellido, rol_id, activo, debe_cambiar_pin, username, password } =
			await event.request.json();

		// Validate required fields
		if (!id || !nombre || !apellido || !numero_telefono || !rol_id || !username) {
			return errorResponse(
				400,
				'INVALID_INPUT',
				'Falta algun campo requerido (Usuario, Nombre, Apellido, Telefono, Rol)'
			);
		}

		const updated_by = user.userId;
		const fields = {
			nombre,
			apellido,
			numero_telefono,
			username: username.toLowerCase(),
			rol_id,
			activo,
			debe_cambiar_pin,
			updated_by
		};

		if (password) {
			const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS);
			fields.password_hash = passwordHash;
			fields.pin_hash = passwordHash;
		}

		const result = password
			? await sql`
				UPDATE usuarios
				SET 
					nombre = ${fields.nombre},
					apellido = ${fields.apellido},
					numero_telefono = ${fields.numero_telefono},
					username = ${fields.username},
					rol_id = ${fields.rol_id},
					activo = ${fields.activo},
					debe_cambiar_pin = ${fields.debe_cambiar_pin},
					updated_by = ${fields.updated_by},
					fecha_actualizacion = CURRENT_TIMESTAMP,
					password_hash = ${fields.password_hash},
					pin_hash = ${fields.pin_hash}
				WHERE id = ${id}
				RETURNING id, username, nombre, apellido, numero_telefono, rol_id, activo, debe_cambiar_pin, created_by, updated_by
			`
			: await sql`
				UPDATE usuarios
				SET 
					nombre = ${fields.nombre},
					apellido = ${fields.apellido},
					numero_telefono = ${fields.numero_telefono},
					username = ${fields.username},
					rol_id = ${fields.rol_id},
					activo = ${fields.activo},
					debe_cambiar_pin = ${fields.debe_cambiar_pin},
					updated_by = ${fields.updated_by},
					fecha_actualizacion = CURRENT_TIMESTAMP
				WHERE id = ${id}
				RETURNING id, username, nombre, apellido, numero_telefono, rol_id, activo, debe_cambiar_pin, created_by, updated_by
			`;

		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Usuario no encontrado');
		}

		return successResponse(result.rows[0], 'Usuario actualizado satisfactoriamente');
	} catch (error) {
		console.error('Error actualizando usuario:', error);
		if (error.status) return error;
		return errorResponse(500, 'INTERNAL_ERROR', 'Error actualizando usuario');
	}
}

export async function DELETE(event) {
	try {
		// Verify user is logged in
		const user = requireAuth(event.locals);

		const { id } = await event.request.json();

		// Verify user exists before deletion
		const existingUser = await sql`
      SELECT id, numero_telefono FROM usuarios WHERE id = ${id}
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
		const result = await sql`
      DELETE FROM usuarios 
      WHERE id = ${id}
      RETURNING id, numero_telefono
    `;

		console.log(`Usuario ${result.rows[0].numero_telefono} eliminado por ${user.userId}`);

		return successResponse(null, 'Usuario eliminado con éxito');
	} catch (error) {
		console.error('Error eliminando usuario:', error);
		if (error.status) return error;
		return errorResponse(500, 'INTERNAL_ERROR', 'Error eliminando usuario');
	}
}
