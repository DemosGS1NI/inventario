import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

// Create a new movement
export async function POST({ request, locals }) {
	const user = requireAuth(locals);

	try {
		const {
			bodega,
			ubicacion,
			marca,
			codigo_barras,
			numero_parte,
			descripcion,
			tipo_movimiento,
			cantidad,
			numero_documento,
			comentarios
		} = await request.json();

		// Validate required fields
		if (!bodega || !marca || !codigo_barras || !tipo_movimiento || !cantidad) {
			return errorResponse(
				400,
				'VALIDATION_ERROR',
				'Bodega, Marca, Código de Barras, Tipo de Movimiento y Cantidad son requeridos'
			);
		}

		// Validate tipo_movimiento
		if (!['IN', 'OUT'].includes(tipo_movimiento)) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Tipo de movimiento debe ser IN o OUT');
		}

		// Validate cantidad is positive integer
		if (!Number.isInteger(cantidad) || cantidad <= 0) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Cantidad debe ser un número entero positivo');
		}

		// Insert movement
		const result = await sql`
      INSERT INTO movimientos (
        bodega, ubicacion, marca, codigo_barras, numero_parte, descripcion,
        tipo_movimiento, cantidad, numero_documento, comentarios, usuario_id
      )
      VALUES (
        ${bodega}, ${ubicacion}, ${marca}, ${codigo_barras}, ${numero_parte}, ${descripcion},
        ${tipo_movimiento}, ${cantidad}, ${numero_documento}, ${comentarios}, ${user.userId}
      )
      RETURNING id, fecha_movimiento
    `;

		return successResponse(result.rows[0], 'Movimiento registrado satisfactoriamente');
	} catch (error) {
		console.error('Error creating movement:', error);

		// Check for unique constraint violation (PostgreSQL: 23505, SQLite: 'UNIQUE constraint failed', MySQL: ER_DUP_ENTRY)
		const isUniqueViolation =
			error.code === '23505' || // PostgreSQL
			(error.message && error.message.includes('UNIQUE constraint')) || // SQLite
			error.code === 'ER_DUP_ENTRY'; // MySQL

		if (isUniqueViolation) {
			return errorResponse(
				409,
				'UNIQUE_CONSTRAINT',
				'Ya existe un movimiento con este número de documento para esta pieza en la bodega y marca seleccionadas.'
			);
		}

		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al registrar el movimiento',
			error.message
		);
	}
}

// Get movements with optional filtering
export async function GET({ url, locals }) {
	requireAuth(locals);

	try {
		// Get query parameters for filtering
		const bodega = url.searchParams.get('bodega');
		const marca = url.searchParams.get('marca');
		const ubicacion = url.searchParams.get('ubicacion');

		let result;

		// Build dynamic query based on filters
		if (bodega && marca && ubicacion) {
			result = await sql`
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.bodega = ${bodega} AND m.marca = ${marca} AND m.ubicacion = ${ubicacion}
        ORDER BY m.fecha_movimiento DESC
      `;
		} else if (bodega && marca) {
			result = await sql`
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.bodega = ${bodega} AND m.marca = ${marca}
        ORDER BY m.fecha_movimiento DESC
      `;
		} else if (bodega) {
			result = await sql`
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.bodega = ${bodega}
        ORDER BY m.fecha_movimiento DESC
      `;
		} else {
			// Get all movements (limit for performance)
			result = await sql`
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        ORDER BY m.fecha_movimiento DESC
        LIMIT 100
      `;
		}

		return successResponse(result.rows, 'Movimientos obtenidos satisfactoriamente');
	} catch (error) {
		console.error('Error fetching movements:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al obtener movimientos',
			error.message
		);
	}
}
