// src/routes/api/inventario/+server.js
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config();

// GET a single inventory record with flexible matching
export async function GET({ url, locals }) {
	// Authentication check
	const userId = locals.user?.userId;
	if (!userId) {
		return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
	}

	// Get query parameters
	const bodega = url.searchParams.get('bodega');
	let marca = url.searchParams.get('marca');
	const codigo_barras = url.searchParams.get('codigo_barras'); // This can match multiple fields

	// Handle the case where marca is the string "null"
	if (marca === 'null' || marca === 'undefined') {
		marca = null;
	}

	// Debug logging
	console.log('API received parameters:', { bodega, marca, codigo_barras });

	// Validate required parameters
	if (!bodega || !codigo_barras) {
		return errorResponse(400, 'BAD_REQUEST', 'Bodega and codigo_barras parameters are required');
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
			console.log('No inventory record found matching the criteria');
			return errorResponse(404, 'NOT_FOUND', 'No inventory record found matching the criteria');
		}

		// Return the single record
		console.log('record found!');
		return successResponse(query.rows[0], 'Inventory record retrieved successfully');
	} catch (error) {
		console.error('Error fetching inventory record:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Error fetching inventory record',
			error.message
		);
	}
}

// PUT to update an inventory record using ID
export async function PUT({ request, locals }) {
	// Authentication check
	const userId = locals.user?.userId;
	if (!userId) {
		return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
	}

	try {
		// Parse the request body
		const {
			id, // Now using ID as the primary key for updates
			ubicacion,
			inventario_fisico,
			categoria_incidencia,
			incidencia,
			single_item_ean13,
			master_carton_ean13
		} = await request.json();

		// Validate ID is provided
		if (!id) {
			return errorResponse(400, 'BAD_REQUEST', 'Record ID is required for updates');
		}

		// Current timestamp for the update
		const currentDateTime = new Date();

		// Execute the update using the ID
		const result = await sql`
      UPDATE inventario
      SET 
        ubicacion = COALESCE(${ubicacion}, ubicacion),
        inventario_fisico = COALESCE(${inventario_fisico}, inventario_fisico),
        categoria_incidencia = COALESCE(${categoria_incidencia}, categoria_incidencia),
        incidencia = COALESCE(${incidencia}, incidencia),
        single_item_ean13 = COALESCE(${single_item_ean13}, single_item_ean13),
        master_carton_ean13 = COALESCE(${master_carton_ean13}, master_carton_ean13),
        fecha_inventario = ${currentDateTime},
        actualizado_por = ${userId}
      WHERE 
        id = ${id}
      RETURNING id, codigo_barras, numero_parte, fecha_inventario, inventario_fisico
    `;

		// Check if a record was updated
		if (result.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', `No inventory record found with ID: ${id}`);
		}

		return successResponse(result.rows[0], 'Inventory record updated successfully');
	} catch (error) {
		console.error('Error updating inventory record:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Error updating inventory record',
			error.message
		);
	}
}
