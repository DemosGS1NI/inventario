import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// GET Endpoint - Fetch Product Details with Simplified Movements
/**
 * Retrieves inventory records for a specific bodega, marca, and ubicacion
 * with simplified movement totals and sorted by recent activity
 * @param {Object} params - Request parameters
 * @param {URL} params.url - Request URL with search parameters
 * @returns {Promise<Response>} JSON response with inventory records
 */
export async function GET({ url, locals }) {
	try {
		requireAuth(locals);

		const bodega = url.searchParams.get('bodega');
		const marca = url.searchParams.get('marca');
		const ubicacion = url.searchParams.get('ubicacion');

		// Remove strict filter requirement: allow fetching all records if no filters are provided
		// Build WHERE clause and params for inventory
		let whereClause = '';
		let params = [];
		if (bodega) {
			params.push(bodega);
			whereClause += (whereClause ? ' AND ' : '') + `i.bodega = $${params.length}`;
		}
		if (marca) {
			params.push(marca);
			whereClause += (whereClause ? ' AND ' : '') + `i.marca = $${params.length}`;
		}
		if (ubicacion) {
			params.push(ubicacion);
			whereClause += (whereClause ? ' AND ' : '') + `i.ubicacion = $${params.length}`;
		}
		const whereSQL = whereClause ? `WHERE ${whereClause}` : '';

		// Dynamic query construction for inventory
		let inventoryResult;
		if (bodega && marca && ubicacion) {
			inventoryResult = await sql`
				SELECT i.*, u.nombre, u.apellido
				FROM inventario i
				LEFT JOIN usuarios u ON i.actualizado_por = u.id
				WHERE i.bodega = ${bodega} AND i.marca = ${marca} AND i.ubicacion = ${ubicacion}
				and fecha_inventario IS NOT NULL
				ORDER BY i.fecha_inventario DESC NULLS LAST, i.bodega, i.ubicacion, i.marca, i.codigo_barras
			`;
		} else if (bodega && marca) {
			inventoryResult = await sql`
				SELECT i.*, u.nombre, u.apellido
				FROM inventario i
				LEFT JOIN usuarios u ON i.actualizado_por = u.id
				WHERE i.bodega = ${bodega} AND i.marca = ${marca}
				and fecha_inventario IS NOT NULL
				ORDER BY i.fecha_inventario DESC NULLS LAST, i.bodega, i.ubicacion, i.marca, i.codigo_barras
			`;
		} else if (bodega && ubicacion) {
			inventoryResult = await sql`
				SELECT i.*, u.nombre, u.apellido
				FROM inventario i
				LEFT JOIN usuarios u ON i.actualizado_por = u.id
				WHERE i.bodega = ${bodega} AND i.ubicacion = ${ubicacion}
				and fecha_inventario IS NOT NULL
				ORDER BY i.fecha_inventario DESC NULLS LAST, i.bodega, i.ubicacion, i.marca, i.codigo_barras
			`;
		} else if (bodega) {
			inventoryResult = await sql`
				SELECT i.*, u.nombre, u.apellido
				FROM inventario i
				LEFT JOIN usuarios u ON i.actualizado_por = u.id
				WHERE i.bodega = ${bodega}
				and fecha_inventario IS NOT NULL
				ORDER BY i.fecha_inventario DESC NULLS LAST, i.bodega, i.ubicacion, i.marca, i.codigo_barras
			`;
		} else {
			// Fetch all records, limit for performance
			inventoryResult = await sql`
				SELECT i.*, u.nombre, u.apellido
				FROM inventario i
				LEFT JOIN usuarios u ON i.actualizado_por = u.id
				where fecha_inventario IS NOT NULL
				ORDER BY i.fecha_inventario DESC NULLS LAST, i.bodega, i.ubicacion, i.marca, i.codigo_barras
				LIMIT 200
			`;
		}

		if (inventoryResult.rows.length === 0) {
			return successResponse([], 'No se encontraron productos para los criterios especificados');
		}

		// Build movement query for all found products
		const productCodes = inventoryResult.rows.map((row) => row.codigo_barras);
		let movementResult = { rows: [] };
		if (productCodes.length > 0) {
			if (bodega && marca && ubicacion) {
				movementResult = await sql`
					SELECT codigo_barras,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE 0 END) as total_entradas,
						SUM(CASE WHEN tipo_movimiento = 'OUT' THEN cantidad ELSE 0 END) as total_salidas,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE -cantidad END) as net_movimientos
					FROM movimientos
					WHERE bodega = ${bodega} AND marca = ${marca} AND ubicacion = ${ubicacion} AND codigo_barras = ANY(${productCodes})
					GROUP BY codigo_barras
				`;
			} else if (bodega && marca) {
				movementResult = await sql`
					SELECT codigo_barras,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE 0 END) as total_entradas,
						SUM(CASE WHEN tipo_movimiento = 'OUT' THEN cantidad ELSE 0 END) as total_salidas,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE -cantidad END) as net_movimientos
					FROM movimientos
					WHERE bodega = ${bodega} AND marca = ${marca} AND codigo_barras = ANY(${productCodes})
					GROUP BY codigo_barras
				`;
			} else if (bodega && ubicacion) {
				movementResult = await sql`
					SELECT codigo_barras,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE 0 END) as total_entradas,
						SUM(CASE WHEN tipo_movimiento = 'OUT' THEN cantidad ELSE 0 END) as total_salidas,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE -cantidad END) as net_movimientos
					FROM movimientos
					WHERE bodega = ${bodega} AND ubicacion = ${ubicacion} AND codigo_barras = ANY(${productCodes})
					GROUP BY codigo_barras
				`;
			} else if (bodega) {
				movementResult = await sql`
					SELECT codigo_barras,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE 0 END) as total_entradas,
						SUM(CASE WHEN tipo_movimiento = 'OUT' THEN cantidad ELSE 0 END) as total_salidas,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE -cantidad END) as net_movimientos
					FROM movimientos
					WHERE bodega = ${bodega} AND codigo_barras = ANY(${productCodes})
					GROUP BY codigo_barras
				`;
			} else {
				movementResult = await sql`
					SELECT codigo_barras,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE 0 END) as total_entradas,
						SUM(CASE WHEN tipo_movimiento = 'OUT' THEN cantidad ELSE 0 END) as total_salidas,
						SUM(CASE WHEN tipo_movimiento = 'IN' THEN cantidad ELSE -cantidad END) as net_movimientos
					FROM movimientos
					WHERE codigo_barras = ANY(${productCodes})
					GROUP BY codigo_barras
				`;
			}
		}

		// Create movement lookup map
		const movementMap = {};
		movementResult.rows.forEach((row) => {
			movementMap[row.codigo_barras] = {
				totalEntradas: parseInt(row.total_entradas) || 0,
				totalSalidas: parseInt(row.total_salidas) || 0,
				netMovimientos: parseInt(row.net_movimientos) || 0
			};
		});

		// Combine inventory data with simplified movement data
		const enrichedRecords = inventoryResult.rows.map((record) => ({
			...record,
			movements: movementMap[record.codigo_barras] || {
				totalEntradas: 0,
				totalSalidas: 0,
				netMovimientos: 0
			}
		}));

		return successResponse(enrichedRecords, 'Productos obtenidos satisfactoriamente');
	} catch (error) {
		console.error('Error al obtener productos:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Fallo al obtener productos', error.message);
	}
}

// PUT Endpoint - Update Product Details
/**
 * Updates inventory records with physical count and incident information
 * @param {Object} params - Request parameters
 * @param {Request} params.request - HTTP request object
 * @param {Object} params.locals - Local variables including user session
 * @returns {Promise<Response>} JSON response confirming update
 */
export async function PUT({ request, locals }) {
	const user = requireAuth(locals);

	try {
		const {
			bodega,
			ubicacion,
			marca,
			codigo_barras,
			inventario_fisico,
			categoria_incidencia,
			incidencia
		} = await request.json();

		// Validate required fields
		if (!bodega || !marca || !ubicacion) {
			return errorResponse(400, 'BAD_REQUEST', 'Bodega, Marca y Ubicación son requeridos');
		}

		console.log('Actualizando producto:', { bodega, ubicacion, marca, userId: user.userId });

		const currentDateTime = new Date().toISOString();

		// Update product details
		const result = await sql`
			UPDATE inventario
			SET 
				ubicacion = ${ubicacion},
				inventario_fisico = ${inventario_fisico},
				fecha_inventario = ${currentDateTime},
				categoria_incidencia = ${categoria_incidencia},
				incidencia = ${incidencia},
				actualizado_por = ${user.userId}
			WHERE 
				bodega = ${bodega} AND 
				marca = ${marca} AND 
				codigo_barras = ${codigo_barras}
		`;

		if (result.rowCount > 0) {
			return successResponse(null, 'Producto actualizado satisfactoriamente');
		} else {
			return errorResponse(404, 'NOT_FOUND', 'Producto no encontrado o no se realizaron cambios');
		}
	} catch (error) {
		console.error('Error al actualizar producto:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al actualizar producto',
			error.message
		);
	}
}
