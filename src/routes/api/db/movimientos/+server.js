import { sql } from '@vercel/postgres';
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

		return successResponse(result.rows[0], 'Movimiento creado exitosamente');
	} catch (error) {
		console.error('Error creating movement:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Error al crear el movimiento',
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

		let query;
		let params = [];

		// Build dynamic query based on filters
		if (bodega && marca && ubicacion) {
			query = `
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.bodega = $1 AND m.marca = $2 AND m.ubicacion = $3
        ORDER BY m.fecha_movimiento DESC
      `;
			params = [bodega, marca, ubicacion];
		} else if (bodega && marca) {
			query = `
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.bodega = $1 AND m.marca = $2
        ORDER BY m.fecha_movimiento DESC
      `;
			params = [bodega, marca];
		} else if (bodega) {
			query = `
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.bodega = $1
        ORDER BY m.fecha_movimiento DESC
      `;
			params = [bodega];
		} else {
			// Get all movements (limit for performance)
			query = `
        SELECT 
          m.*, 
          u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        ORDER BY m.fecha_movimiento DESC
        LIMIT 100
      `;
		}

		const result = await sql.query(query, params);

		return successResponse(result.rows, 'Movimientos obtenidos exitosamente');
	} catch (error) {
		console.error('Error fetching movements:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Error al obtener movimientos',
			error.message
		);
	}
}
