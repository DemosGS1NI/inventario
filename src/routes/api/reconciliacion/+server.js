import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import ExcelJS from 'exceljs';
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
		const inventoryFilters = [sql`i.fecha_inventario IS NOT NULL`];
		if (bodega) inventoryFilters.push(sql`i.bodega = ${bodega}`);
		if (marca) inventoryFilters.push(sql`i.marca = ${marca}`);
		if (ubicacion) inventoryFilters.push(sql`i.ubicacion = ${ubicacion}`);

		const inventoryResult = await sql`
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
			WHERE ${sql.join(inventoryFilters, sql` AND `)}
			ORDER BY i.fecha_inventario DESC NULLS LAST, i.bodega, i.ubicacion, i.marca, i.codigo_barras
		`;

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

		const movementFilters = [sql`m.codigo_barras = ANY(${productCodes})`];
		if (bodega) movementFilters.push(sql`m.bodega = ${bodega}`);
		if (marca && ubicacion) movementFilters.push(sql`m.marca = ${marca} AND m.ubicacion = ${ubicacion}`);

		const movementsResult = await sql`
			SELECT 
				m.*,
				u.nombre || ' ' || u.apellido AS usuario_nombre
			FROM movimientos m
			LEFT JOIN usuarios u ON m.usuario_id = u.id
			WHERE ${sql.join(movementFilters, sql` AND `)}
			ORDER BY m.fecha_movimiento ASC
		`;

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
				const workbook = new ExcelJS.Workbook();
				const worksheet = workbook.addWorksheet('Reconciliación');
				worksheet.columns = [
					{ header: 'Bodega', key: 'Bodega', width: 15 },
					{ header: 'Ubicación', key: 'Ubicación', width: 12 },
					{ header: 'Marca', key: 'Marca', width: 15 },
					{ header: 'Código de Barras', key: 'Código de Barras', width: 15 },
					{ header: 'Número de Parte', key: 'Número de Parte', width: 20 },
					{ header: 'Descripción', key: 'Descripción', width: 30 },
					{ header: 'Inventario Sistema', key: 'Inventario Sistema', width: 12 },
					{ header: 'Inventario Físico', key: 'Inventario Físico', width: 12 },
					{ header: 'Stock Esperado', key: 'Stock Esperado', width: 12 },
					{ header: 'Diferencia Aparente', key: 'Diferencia Aparente', width: 15 },
					{ header: 'Diferencia Real', key: 'Diferencia Real', width: 12 },
					{ header: 'Estado Reconciliación', key: 'Estado Reconciliación', width: 20 },
					{ header: 'Entradas Pre-Conteo', key: 'Entradas Pre-Conteo', width: 15 },
					{ header: 'Salidas Pre-Conteo', key: 'Salidas Pre-Conteo', width: 15 },
					{ header: 'Net Movimientos Pre-Conteo', key: 'Net Movimientos Pre-Conteo', width: 20 },
					{ header: 'Entradas Post-Conteo', key: 'Entradas Post-Conteo', width: 15 },
					{ header: 'Salidas Post-Conteo', key: 'Salidas Post-Conteo', width: 15 },
					{ header: 'Fecha Inventario', key: 'Fecha Inventario', width: 20 },
					{ header: 'Categoría Incidencia', key: 'Categoría Incidencia', width: 20 },
					{ header: 'Incidencia', key: 'Incidencia', width: 30 },
					{ header: 'Explicación', key: 'Explicación', width: 40 }
				];

				worksheet.addRows(excelData);

				// Create summary sheet
				const summaryData = [
					{ Métrica: 'Total de Registros', Valor: summary.totalRecords },
					{ Métrica: 'Registros con Movimientos', Valor: summary.withMovements },
					{ Métrica: 'Explicado por Movimientos', Valor: summary.movementExplained },
					{ Métrica: 'Discrepancias Reales', Valor: summary.trueDiscrepancies },
					{ Métrica: 'Sin Diferencia', Valor: summary.noDiscrepancy }
				];

				const summarySheet = workbook.addWorksheet('Resumen');
				summarySheet.columns = [
					{ header: 'Métrica', key: 'Métrica', width: 25 },
					{ header: 'Valor', key: 'Valor', width: 15 }
				];
				summarySheet.addRows(summaryData);

				// Generate Excel file buffer
				const excelBuffer = await workbook.xlsx.writeBuffer();

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
