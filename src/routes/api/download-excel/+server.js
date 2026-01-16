import { sql } from '$lib/database';
import ExcelJS from 'exceljs';
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
		const workbook = new ExcelJS.Workbook();

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
					'Movimientos Netos': netMovementsMap.get(key) || '',
					'Fecha Inventario': row.fecha_inventario ? new Date(row.fecha_inventario) : null,
					'Categoría Incidencia': row.categoria_incidencia || '',
					Incidencia: row.incidencia || '',
					'EAN13 Unidad': row.single_item_ean13 || '',
					'EAN13 Caja Master': row.master_carton_ean13 || '',
					'Actualizado Por': row.actualizado || '',
					'Validado Por': row.validado || ''
				};
			});

			const inventarioSheet = workbook.addWorksheet('Inventario');
			inventarioSheet.columns = [
				{ header: 'Bodega', key: 'Bodega', width: 15 },
				{ header: 'Ubicación', key: 'Ubicación', width: 12 },
				{ header: 'Marca', key: 'Marca', width: 15 },
				{ header: 'ID', key: 'ID', width: 8 },
				{ header: 'Código de Barras', key: 'Código de Barras', width: 15 },
				{ header: 'Número de Parte', key: 'Número de Parte', width: 20 },
				{ header: 'Descripción', key: 'Descripción', width: 30 },
				{ header: 'Inventario Sistema', key: 'Inventario Sistema', width: 12 },
				{ header: 'Inventario Físico', key: 'Inventario Físico', width: 12 },
				{ header: 'Movimientos Netos', key: 'Movimientos Netos', width: 18 },
				{ header: 'Fecha Inventario', key: 'Fecha Inventario', width: 20 },
				{ header: 'Categoría Incidencia', key: 'Categoría Incidencia', width: 20 },
				{ header: 'Incidencia', key: 'Incidencia', width: 30 },
				{ header: 'EAN13 Unidad', key: 'EAN13 Unidad', width: 15 },
				{ header: 'EAN13 Caja Master', key: 'EAN13 Caja Master', width: 15 },
				{ header: 'Actualizado Por', key: 'Actualizado Por', width: 20 },
				{ header: 'Validado Por', key: 'Validado Por', width: 20 }
			];

			inventarioSheet.addRows(inventarioData);
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

			const movimientosSheet = workbook.addWorksheet('Movimientos');
			movimientosSheet.columns = [
				{ header: 'Bodega', key: 'Bodega', width: 15 },
				{ header: 'Ubicación', key: 'Ubicación', width: 12 },
				{ header: 'Marca', key: 'Marca', width: 15 },
				{ header: 'Código de Barras', key: 'Código de Barras', width: 15 },
				{ header: 'Número de Parte', key: 'Número de Parte', width: 20 },
				{ header: 'Descripción', key: 'Descripción', width: 25 },
				{ header: 'Tipo Movimiento', key: 'Tipo Movimiento', width: 12 },
				{ header: 'Cantidad', key: 'Cantidad', width: 10 },
				{ header: 'Número Documento', key: 'Número Documento', width: 15 },
				{ header: 'Comentarios', key: 'Comentarios', width: 25 },
				{ header: 'Fecha Movimiento', key: 'Fecha Movimiento', width: 20 },
				{ header: 'Usuario', key: 'Usuario', width: 20 }
			];

			movimientosSheet.addRows(movimientosData);
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
		const buffer = await workbook.xlsx.writeBuffer();

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
