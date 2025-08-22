import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

export async function GET({ url, locals }) {
	requireAuth(locals);

	try {
		// Get query parameters for filtering
		const bodega = url.searchParams.get('bodega');
		const marca = url.searchParams.get('marca');
		const ubicacion = url.searchParams.get('ubicacion');

		// Build base query for inventory records that have been physically counted
		let inventoryQuery = `
      SELECT 
        i.id,
        i.bodega,
        i.ubicacion, 
        i.marca,
        i.codigo_barras,
        i.numero_parte,
        i.descripcion,
        i.inventario_sistema,
        i.inventario_fisico,
        i.fecha_inventario,
        i.categoria_incidencia,
        i.incidencia
      FROM inventario i
      WHERE i.fecha_inventario IS NOT NULL
		 
    `;

		let queryParams = [];
		let paramIndex = 1;

		// Add filters
		if (bodega) {
			inventoryQuery += ` AND i.bodega = $${paramIndex}`;
			queryParams.push(bodega);
			paramIndex++;
		}
		if (marca) {
			inventoryQuery += ` AND i.marca = $${paramIndex}`;
			queryParams.push(marca);
			paramIndex++;
		}
		if (ubicacion) {
			inventoryQuery += ` AND i.ubicacion = $${paramIndex}`;
			queryParams.push(ubicacion);
			paramIndex++;
		}

		inventoryQuery +=
			' ORDER BY i.fecha_inventario DESC NULLS LAST, i.bodega, i.ubicacion, i.marca, i.codigo_barras ';

		// Execute inventory query
		const inventoryResult = await sql.query(inventoryQuery, queryParams);

		if (inventoryResult.rows.length === 0) {
			return successResponse(
				{
					records: [],
					summary: {
						totalRecords: 0,
						withMovements: 0,
						movementExplained: 0,
						trueDiscrepancies: 0
					}
				},
				'No inventory records found for reconciliation'
			);
		}

		// Get all movements for the products found
		const productCodes = inventoryResult.rows.map((row) => row.codigo_barras);

		let movementsQuery = `
      SELECT 
        m.*,
        u.nombre || ' ' || u.apellido AS usuario_nombre
      FROM movimientos m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.codigo_barras = ANY($1)
    `;

		let movementsParams = [productCodes];

		// Add movement filters to match inventory filters
		if (bodega) {
			movementsQuery += ` AND m.bodega = $2`;
			movementsParams.push(bodega);
		}
		if (marca && ubicacion) {
			const startParam = bodega ? 3 : 2;
			movementsQuery += ` AND m.marca = $${startParam} AND m.ubicacion = $${startParam + 1}`;
			movementsParams.push(marca, ubicacion);
		}

		movementsQuery += ' ORDER BY m.fecha_movimiento ASC';

		const movementsResult = await sql.query(movementsQuery, movementsParams);

		// Process reconciliation analysis
		// Process reconciliation analysis
		const reconciliationRecords = inventoryResult.rows.map((record) => {
			// Get movements for this product
			const productMovements = movementsResult.rows.filter(
				(movement) =>
					movement.codigo_barras === record.codigo_barras &&
					movement.bodega === record.bodega &&
					movement.marca === record.marca &&
					(movement.ubicacion === record.ubicacion || !movement.ubicacion)
			);

			// Split movements by timing relative to physical count
			const fechaInventario = new Date(record.fecha_inventario);
			const movimientosPreConteo = productMovements.filter(
				(m) => new Date(m.fecha_movimiento) <= fechaInventario
			);
			const movimientosPostConteo = productMovements.filter(
				(m) => new Date(m.fecha_movimiento) > fechaInventario
			);

			// Calculate pre-count movement totals
			const entradasPreConteo = movimientosPreConteo
				.filter((m) => m.tipo_movimiento === 'IN')
				.reduce((sum, m) => sum + m.cantidad, 0);

			const salidasPreConteo = movimientosPreConteo
				.filter((m) => m.tipo_movimiento === 'OUT')
				.reduce((sum, m) => sum + m.cantidad, 0);

			// Calculate post-count movement totals
			const entradasPostConteo = movimientosPostConteo
				.filter((m) => m.tipo_movimiento === 'IN')
				.reduce((sum, m) => sum + m.cantidad, 0);

			const salidasPostConteo = movimientosPostConteo
				.filter((m) => m.tipo_movimiento === 'OUT')
				.reduce((sum, m) => sum + m.cantidad, 0);

			// Calculate reconciliation values - FIXED VERSION
			const netMovimientosPreConteo = entradasPreConteo - salidasPreConteo;

			// Ensure we're working with numbers
			const inventarioSistema = Number(record.inventario_sistema) || 0;
			const inventarioFisico = Number(record.inventario_fisico) || 0;

			const stockEsperado = inventarioSistema + netMovimientosPreConteo;
			const diferenciaAparente = inventarioFisico - inventarioSistema;
			const diferenciaReal = inventarioFisico - stockEsperado;

			// Determine reconciliation status
			let estadoReconciliacion = 'Sin Diferencia';
			let explicacion = '';

			if (Math.abs(diferenciaReal) < 0.01) {
				// Account for floating point precision
				if (Math.abs(diferenciaAparente) > 0.01) {
					estadoReconciliacion = 'Explicado por Movimientos';
					explicacion =
						'La diferencia aparente se explica completamente por los movimientos registrados.';
				} else {
					estadoReconciliacion = 'Sin Diferencia';
					explicacion = 'No hay diferencia entre el inventario físico y el esperado.';
				}
			} else {
				estadoReconciliacion = 'Discrepancia Real';
				explicacion = `Diferencia de ${diferenciaReal} unidades no explicada por movimientos.`;
			}

			return {
				...record,
				// Movement analysis
				movimientosPreConteo,
				movimientosPostConteo,
				entradasPreConteo,
				salidasPreConteo,
				netMovimientosPreConteo,
				entradasPostConteo,
				salidasPostConteo,

				// Reconciliation calculations - ENSURE THESE ARE NUMBERS
				stockEsperado: stockEsperado,
				diferenciaAparente: diferenciaAparente,
				diferenciaReal: diferenciaReal,
				estadoReconciliacion,
				explicacion,

				// Flags for easy filtering
				tieneMovimientos: productMovements.length > 0,
				tieneDiscrepancia: Math.abs(diferenciaReal) > 0.01
			};
		});
		// Generate summary statistics
		const summary = {
			totalRecords: reconciliationRecords.length,
			withMovements: reconciliationRecords.filter((r) => r.tieneMovimientos).length,
			movementExplained: reconciliationRecords.filter(
				(r) => r.estadoReconciliacion === 'Explicado por Movimientos'
			).length,
			trueDiscrepancies: reconciliationRecords.filter(
				(r) => r.estadoReconciliacion === 'Discrepancia Real'
			).length,
			noDiscrepancy: reconciliationRecords.filter(
				(r) => r.estadoReconciliacion === 'Sin Diferencia'
			).length
		};

		// Check if this is an export request
		const isExport = url.searchParams.get('export') === 'true';

		if (isExport) {
			try {
				// Prepare data for Excel export
				const excelData = reconciliationRecords.map((record) => ({
					Bodega: record.bodega,
					Ubicación: record.ubicacion,
					Marca: record.marca,
					'Código de Barras': record.codigo_barras,
					'Número de Parte': record.numero_parte,
					Descripción: record.descripcion,
					'Inventario Sistema': record.inventario_sistema,
					'Inventario Físico': record.inventario_fisico,
					'Stock Esperado': record.stockEsperado,
					'Diferencia Aparente': record.diferenciaAparente,
					'Diferencia Real': record.diferenciaReal,
					'Estado Reconciliación': record.estadoReconciliacion,
					'Entradas Pre-Conteo': record.entradasPreConteo,
					'Salidas Pre-Conteo': record.salidasPreConteo,
					'Net Movimientos Pre-Conteo': record.netMovimientosPreConteo,
					'Entradas Post-Conteo': record.entradasPostConteo,
					'Salidas Post-Conteo': record.salidasPostConteo,
					'Fecha Inventario': record.fecha_inventario,
					'Categoría Incidencia': record.categoria_incidencia || '',
					Incidencia: record.incidencia || '',
					Explicación: record.explicacion
				}));

				// Create workbook and worksheet
				const workbook = XLSX.utils.book_new();
				const worksheet = XLSX.utils.json_to_sheet(excelData);

				// Set column widths for better readability
				const colWidths = [
					{ wch: 15 }, // Bodega
					{ wch: 12 }, // Ubicación
					{ wch: 15 }, // Marca
					{ wch: 15 }, // Código de Barras
					{ wch: 20 }, // Número de Parte
					{ wch: 30 }, // Descripción
					{ wch: 12 }, // Inventario Sistema
					{ wch: 12 }, // Inventario Físico
					{ wch: 12 }, // Stock Esperado
					{ wch: 15 }, // Diferencia Aparente
					{ wch: 12 }, // Diferencia Real
					{ wch: 20 }, // Estado Reconciliación
					{ wch: 15 }, // Entradas Pre-Conteo
					{ wch: 15 }, // Salidas Pre-Conteo
					{ wch: 20 }, // Net Movimientos Pre-Conteo
					{ wch: 15 }, // Entradas Post-Conteo
					{ wch: 15 }, // Salidas Post-Conteo
					{ wch: 20 }, // Fecha Inventario
					{ wch: 20 }, // Categoría Incidencia
					{ wch: 30 }, // Incidencia
					{ wch: 40 } // Explicación
				];

				worksheet['!cols'] = colWidths;

				// Add the worksheet to workbook
				XLSX.utils.book_append_sheet(workbook, worksheet, 'Reconciliación');

				// Create summary sheet
				const summaryData = [
					{ Métrica: 'Total de Registros', Valor: summary.totalRecords },
					{ Métrica: 'Registros con Movimientos', Valor: summary.withMovements },
					{ Métrica: 'Explicado por Movimientos', Valor: summary.movementExplained },
					{ Métrica: 'Discrepancias Reales', Valor: summary.trueDiscrepancies },
					{ Métrica: 'Sin Diferencia', Valor: summary.noDiscrepancy }
				];

				const summarySheet = XLSX.utils.json_to_sheet(summaryData);
				summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
				XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

				// Generate Excel file buffer
				const excelBuffer = XLSX.write(workbook, {
					type: 'buffer',
					bookType: 'xlsx',
					compression: true
				});

				// Generate filename with timestamp
				const timestamp = new Date().toISOString().split('T')[0];
				const filename = `reconciliacion_inventario_${timestamp}.xlsx`;

				// Return Excel file
				return new Response(excelBuffer, {
					status: 200,
					headers: {
						'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						'Content-Disposition': `attachment; filename="${filename}"`,
						'Content-Length': excelBuffer.length.toString()
					}
				});
			} catch (exportError) {
				console.error('Error generating Excel export:', exportError);
				return errorResponse(
					500,
					'EXPORT_ERROR',
					'Error generating Excel export',
					exportError.message
				);
			}
		}

		// Regular JSON response (not export)

		return successResponse(
			{
				records: reconciliationRecords,
				summary
			},
			'Reconciliation analysis completed successfully'
		);
	} catch (error) {
		console.error('Error in reconciliation analysis:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Error performing reconciliation analysis',
			error.message
		);
	}
}
