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
	const codigo_barras = url.searchParams.get('codigo_barras'); // This can match multiple fields

	// Handle the case where marca is the string "null"
	if (marca === 'null' || marca === 'undefined') {
		marca = null;
	}

	// Debug logging
	console.log('API recibió parámetros:', { bodega, marca, codigo_barras });

	// Validate required parameters
	if (!bodega || !codigo_barras) {
		return errorResponse(400, 'BAD_REQUEST', 'Bodega y código de barras son requeridos');
	}

	try {
		// Build the SQL query with proper handling of null marca
		let query;

		if (marca) {
			// If marca is provided and valid
			query = await sql`
				SELECT 
					id, codigo_barras, numero_parte, descripcion, 
					inventario_sistema, inventario_fisico, 
					fecha_inventario::TEXT AS fecha_inventario, 
					bodega, ubicacion, marca,
					categoria_incidencia, incidencia, 
					single_item_ean13, master_carton_ean13,
					actualizado_por, validado_por, validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND marca = ${marca}
					AND (
						codigo_barras = ${codigo_barras} OR 
						numero_parte = ${codigo_barras} OR 
						single_item_ean13 = ${codigo_barras}
					)
				LIMIT 1
			`;
		} else {
			// If marca is not provided or is null
			query = await sql`
				SELECT 
					id, codigo_barras, numero_parte, descripcion, 
					inventario_sistema, inventario_fisico, 
					fecha_inventario::TEXT AS fecha_inventario, 
					bodega, ubicacion, marca,
					categoria_incidencia, incidencia, 
					single_item_ean13, master_carton_ean13,
					actualizado_por, validado_por, validado
				FROM inventario
				WHERE bodega = ${bodega}
					AND (
						codigo_barras = ${codigo_barras} OR 
						numero_parte = ${codigo_barras} OR 
						single_item_ean13 = ${codigo_barras} 
					)
				LIMIT 1
			`;
		}

		// Check if a record was found
		if (query.rows.length === 0) {
			console.log('No se encontró registro de inventario con los criterios especificados');
			return errorResponse(404, 'NOT_FOUND', 'No se encontró registro de inventario con los criterios especificados');
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
			// bodega,                 // ← RECEIVED: But not used (this field does not need to be updated)
			// marca,                  // ← RECEIVED: But not used (this field does not need to be updated)  
			ubicacion,                 // ← RECEIVED: For updating (this is what changes)
			inventario_fisico,
			categoria_incidencia,
			incidencia,
			single_item_ean13,
			master_carton_ean13
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
				ubicacion = ${ubicacion},                                   
				inventario_fisico = COALESCE(${inventario_fisico}, inventario_fisico),
				categoria_incidencia = COALESCE(${categoria_incidencia}, categoria_incidencia),
				incidencia = COALESCE(${incidencia}, incidencia),
				single_item_ean13 = COALESCE(${single_item_ean13}, single_item_ean13),
				master_carton_ean13 = COALESCE(${master_carton_ean13}, master_carton_ean13),
				fecha_inventario = ${currentDateTime},                      
				actualizado_por = ${user.userId}                            
			WHERE 
				id = ${id}
			RETURNING id, codigo_barras, numero_parte, fecha_inventario, inventario_fisico, ubicacion
		`;

		// Check if a record was updated
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', `No se encontró registro de inventario con ID: ${id}`);
		}

		// Log the update for audit purposes
		console.log(`Producto actualizado: ID ${id}, Nueva Ubicación: ${ubicacion}, Usuario: ${user.userId}`);

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