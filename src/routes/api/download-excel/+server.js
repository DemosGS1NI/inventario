import { sql } from '$lib/database';
import XLSX from 'xlsx';
import { format } from 'date-fns';
import { requireAdmin } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

export async function GET({ locals }) {
	requireAdmin(locals);

	try {
		// Fetch inventory records with user names
		const inventarioResult = await sql`
       SELECT i.bodega, i.ubicacion, i.marca, i.id, i.codigo_barras, i.numero_parte, i.descripcion,
              i.inventario_sistema, i.inventario_fisico,
              timezone('America/Chicago', i.fecha_inventario) as fecha_inventario, 
              i.categoria_incidencia, i.incidencia, i.single_item_ean13, i.master_carton_ean13,
              u1.nombre || ' ' || u1.apellido AS actualizado,
              u2.nombre || ' ' || u2.apellido AS validado
        FROM inventario i 
        LEFT JOIN usuarios u1 ON i.actualizado_por = u1.id
        LEFT JOIN usuarios u2 ON i.validado_por = u2.id
        ORDER BY i.bodega, i.ubicacion, i.marca, i.id
    `;

		// Fetch movements records with user names
		const movimientosResult = await sql`
       SELECT m.bodega, m.ubicacion, m.marca, m.codigo_barras, m.numero_parte, m.descripcion,
              m.tipo_movimiento, m.cantidad, m.numero_documento, m.comentarios,
              timezone('America/Chicago', m.fecha_movimiento) as fecha_movimiento,
              u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM movimientos m 
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        ORDER BY m.fecha_movimiento DESC, m.bodega, m.ubicacion, m.marca
    `;

		// Create a workbook
		const workbook = XLSX.utils.book_new();

		// Build a map for quick lookup of net movements by product
		const netMovementsMap = new Map();
		if (movimientosResult.rows && movimientosResult.rows.length > 0) {
			for (const mov of movimientosResult.rows) {
				const key = `${mov.bodega}||${mov.ubicacion || ''}||${mov.marca}||${mov.codigo_barras}`;
				const sign = mov.tipo_movimiento === 'IN' ? 1 : -1;
				netMovementsMap.set(key, (netMovementsMap.get(key) || 0) + sign * mov.cantidad);
			}
		}

		// Process Inventory Data
		if (inventarioResult.rows && inventarioResult.rows.length > 0) {
			const inventarioData = inventarioResult.rows.map((row) => {
				const key = `${row.bodega}||${row.ubicacion || ''}||${row.marca}||${row.codigo_barras}`;
				return {
					Bodega: row.bodega,
					Ubicación: row.ubicacion,
					Marca: row.marca,
					ID: row.id,
					'Código de Barras': row.codigo_barras,
					'Número de Parte': row.numero_parte,
					Descripción: row.descripcion,
					'Inventario Sistema': row.inventario_sistema,
					'Inventario Físico': row.inventario_fisico,
					'Movimientos Netos': netMovementsMap.get(key) || '', // Use net movements from the map
					'Fecha Inventario': row.fecha_inventario ? new Date(row.fecha_inventario) : null,
					'Categoría Incidencia': row.categoria_incidencia || '',
					Incidencia: row.incidencia || '',
					'EAN13 Unidad': row.single_item_ean13 || '',
					'EAN13 Caja Master': row.master_carton_ean13 || '',
					'Actualizado Por': row.actualizado || '',
					'Validado Por': row.validado || ''
				};
			});

			const inventarioWorksheet = XLSX.utils.json_to_sheet(inventarioData);

			// Set column widths for inventory sheet (add one for Movimientos Netos)
			const inventarioColWidths = [
				{ wch: 15 }, // Bodega
				{ wch: 12 }, // Ubicación
				{ wch: 15 }, // Marca
				{ wch: 8 }, // ID
				{ wch: 15 }, // Código de Barras
				{ wch: 20 }, // Número de Parte
				{ wch: 30 }, // Descripción
				{ wch: 12 }, // Inventario Sistema
				{ wch: 12 }, // Inventario Físico
				{ wch: 18 }, // Movimientos Netos
				{ wch: 20 }, // Fecha Inventario
				{ wch: 20 }, // Categoría Incidencia
				{ wch: 30 }, // Incidencia
				{ wch: 15 }, // EAN13 Unidad
				{ wch: 15 }, // EAN13 Caja Master
				{ wch: 20 }, // Actualizado Por
				{ wch: 20 } // Validado Por
			];

			inventarioWorksheet['!cols'] = inventarioColWidths;
			XLSX.utils.book_append_sheet(workbook, inventarioWorksheet, 'Inventario');
		}

		// Process Movements Data
		if (movimientosResult.rows && movimientosResult.rows.length > 0) {
			const movimientosData = movimientosResult.rows.map((row) => ({
				Bodega: row.bodega,
				Ubicación: row.ubicacion || '',
				Marca: row.marca,
				'Código de Barras': row.codigo_barras,
				'Número de Parte': row.numero_parte || '',
				Descripción: row.descripcion || '',
				'Tipo Movimiento': row.tipo_movimiento === 'IN' ? 'Entrada' : 'Salida',
				Cantidad: row.cantidad,
				'Número Documento': row.numero_documento || '',
				Comentarios: row.comentarios || '',
				'Fecha Movimiento': row.fecha_movimiento ? new Date(row.fecha_movimiento) : null,
				Usuario: row.usuario_nombre || ''
			}));

			const movimientosWorksheet = XLSX.utils.json_to_sheet(movimientosData);

			// Set column widths for movements sheet
			const movimientosColWidths = [
				{ wch: 15 }, // Bodega
				{ wch: 12 }, // Ubicación
				{ wch: 15 }, // Marca
				{ wch: 15 }, // Código de Barras
				{ wch: 20 }, // Número de Parte
				{ wch: 25 }, // Descripción
				{ wch: 12 }, // Tipo Movimiento
				{ wch: 10 }, // Cantidad
				{ wch: 15 }, // Número Documento
				{ wch: 25 }, // Comentarios
				{ wch: 20 }, // Fecha Movimiento
				{ wch: 20 } // Usuario
			];

			movimientosWorksheet['!cols'] = movimientosColWidths;
			XLSX.utils.book_append_sheet(workbook, movimientosWorksheet, 'Movimientos');
		}

		// Create summary sheet
		// const summaryData = [
		// 	{ Métrica: 'Total Registros Inventario', Valor: inventarioResult.rows?.length || 0 },
		// 	{ Métrica: 'Total Registros Movimientos', Valor: movimientosResult.rows?.length || 0 },
		// 	{ Métrica: 'Fecha Generación', Valor: new Date().toLocaleString('es-ES') }
		// ];

		// const summarySheet = XLSX.utils.json_to_sheet(summaryData);
		// summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
		// XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

		// Generate file name with timestamp
		const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
		const fileName = `inventario_${timestamp}.xlsx`;

		// Write workbook to a buffer with explicit options
		const buffer = XLSX.write(workbook, {
			type: 'buffer',
			bookType: 'xlsx',
			cellDates: true,
			numbers: Number
		});

		// Prepare file for download
		console.log(`Generated Excel file: ${fileName}`);
		return new Response(buffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename=${fileName}`
			}
		});
	} catch (error) {
		console.error('Error generating Excel file:', error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
