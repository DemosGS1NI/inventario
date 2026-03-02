// src/routes/api/inventario/registro/+server.js
import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

// GET a single inventory record with flexible matching
export async function GET({ url, locals }) {
	const user = requireAuth(locals);

	// Get query parameters
	const bodega = url.searchParams.get('bodega');
	let marca = url.searchParams.get('marca');
	const codigo = url.searchParams.get('codigo');
	const lote = url.searchParams.get('lote');
	const ubicacion = url.searchParams.get('ubicacion');

	// Handle the case where marca is the string "null"
	if (marca === 'null' || marca === 'undefined') {
		marca = null;
	}

	// Basic misuse guard: if lote/ubicacion provided, demand non-empty string
	const trimmedLote = lote?.trim?.();
	const trimmedUbicacion = ubicacion?.trim?.();

	// Debug logging with normalized params
	console.log('API recibió parámetros:', { bodega, marca, codigo, lote: trimmedLote, ubicacion: trimmedUbicacion });

	// Validate required parameters
	if (!bodega || !codigo) {
		return errorResponse(400, 'BAD_REQUEST', 'Bodega y código son requeridos');
	}

	try {
		let query;

		// Explicit branching to avoid dynamic SQL composition issues
		if (marca && trimmedUbicacion && trimmedLote) {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND marca = ${marca}
					AND ubicacion = ${trimmedUbicacion}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
					AND lote = ${trimmedLote}
				LIMIT 2
			`;
		} else if (marca && trimmedLote) {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND marca = ${marca}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
					AND lote = ${trimmedLote}
				LIMIT 2
			`;
		} else if (marca && trimmedUbicacion) {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND marca = ${marca}
					AND ubicacion = ${trimmedUbicacion}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
				LIMIT 2
			`;
		} else if (trimmedUbicacion && trimmedLote) {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND ubicacion = ${trimmedUbicacion}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
					AND lote = ${trimmedLote}
				LIMIT 2
			`;
		} else if (trimmedUbicacion) {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND ubicacion = ${trimmedUbicacion}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
				LIMIT 2
			`;
		} else if (trimmedLote) {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
					AND lote = ${trimmedLote}
				LIMIT 2
			`;
		} else if (marca) {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND marca = ${marca}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
				LIMIT 2
			`;
		} else {
			query = await sql`
				SELECT 
					id,
					codigo,
					numero_parte,
					descripcion,
					inventario_sistema,
					inventario_fisico,
					fecha_inventario::TEXT AS fecha_inventario,
					bodega,
					ubicacion,
					marca,
					categoria_incidencia,
					notas,
					gtin,
					dun14,
					lote,
					unidad_medida,
					tare,
					actualizado_por,
					validado_por,
					validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND (codigo = ${codigo} OR numero_parte = ${codigo} OR gtin = ${codigo})
				LIMIT 2
			`;
		}

		// Check if a record was found
		if (query.rows.length === 0) {
			console.log('No se encontró registro de inventario con los criterios especificados');
			return errorResponse(
				404,
				'NOT_FOUND',
				'No se encontró registro de inventario con los criterios especificados'
			);
		}

		if (query.rows.length > 1) {
			return errorResponse(
				409,
				'MULTIPLE_MATCHES',
				'La búsqueda devolvió múltiples registros. Ajuste los filtros (marca, ubicación o lote) para un resultado único.'
			);
		}

		// Return the single record
		console.log('¡Registro encontrado!');
		return successResponse(query.rows[0], 'Registro de inventario obtenido satisfactoriamente');
	} catch (error) {
		console.error('Error al obtener registro de inventario:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al obtener registro de inventario',
			error.message
		);
	}
}

// PUT to update an inventory record using ID
export async function PUT({ request, locals }) {
	const user = requireAuth(locals);

	try {
		// Parse the request body
		const {
			id,
			ubicacion, // optional update
			inventario_fisico,
			categoria_incidencia,
			notas,
			gtin,
			dun14
		} = await request.json();

		// Validate ID is provided
		if (!id) {
			return errorResponse(400, 'BAD_REQUEST', 'ID del registro es requerido para actualizaciones');
		}

		// Current timestamp for the update
		const currentDateTime = new Date();

		// Execute the update - only update fields that actually change during inventory
		const result = await sql`
			UPDATE inventario
			SET 
			    ubicacion = COALESCE(${ubicacion}, ubicacion),                                   
				inventario_fisico = COALESCE(${inventario_fisico}, inventario_fisico),
				categoria_incidencia = COALESCE(${categoria_incidencia}, categoria_incidencia),
				notas = COALESCE(${notas}, notas),
				gtin = COALESCE(${gtin}, gtin),
				dun14 = COALESCE(${dun14}, dun14),
				fecha_inventario = ${currentDateTime},                      
				actualizado_por = ${user.userId}                            
			WHERE 
				id = ${id}
			RETURNING id, codigo, numero_parte, fecha_inventario, inventario_fisico, ubicacion
		`;

		// Check if a record was updated
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', `No se encontró registro de inventario con ID: ${id}`);
		}

		// Log the update for audit purposes with changed fields summary
		const updatedFields = {
			ubicacion: ubicacion ?? 'sin cambio',
			inventario_fisico: inventario_fisico ?? 'sin cambio',
			categoria_incidencia: categoria_incidencia ?? 'sin cambio',
			notas: notas ?? 'sin cambio',
			gtin: gtin ?? 'sin cambio',
			dun14: dun14 ?? 'sin cambio'
		};

		const actor = user?.userId ?? locals?.user?.userId ?? 'desconocido';
		if (actor === 'desconocido') {
			console.warn('Usuario no disponible en locals durante actualización');
		}

		console.log(
			`Producto actualizado: ID ${id}, Usuario: ${actor} | Campos: ${JSON.stringify(updatedFields)}`
		);

		return successResponse(result.rows[0], 'Registro de inventario actualizado satisfactoriamente');
	} catch (error) {
		console.error('Error al actualizar registro de inventario:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al actualizar registro de inventario',
			error.message
		);
	}
}
