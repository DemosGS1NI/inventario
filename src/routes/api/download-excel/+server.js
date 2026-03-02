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
			SELECT i.id,
			       i.bodega,
			       i.marca,
			       i.ubicacion,
			       i.descripcion,
			       i.codigo,
			       i.numero_parte,
			       i.inventario_sistema,
			       i.inventario_fisico,
			       i.gtin,
			       i.dun14,
			       i.lote,
			       i.unidad_medida,
			       i.tare,
			       i.categoria_incidencia,
			       i.notas,
			       timezone('America/Chicago', i.fecha_inventario) as fecha_inventario,
			       u1.nombre || ' ' || u1.apellido AS actualizado,
			       u2.nombre || ' ' || u2.apellido AS validado
			FROM inventario i 
			LEFT JOIN usuarios u1 ON i.actualizado_por = u1.id
			LEFT JOIN usuarios u2 ON i.validado_por = u2.id
			ORDER BY i.bodega, i.ubicacion, i.marca, i.id
		`;

		// Fetch movements records with user names
		const movimientosResult = await sql`
				SELECT 
					m.inventario_id,
					m.bodega,
					m.ubicacion,
					m.marca,
					COALESCE(i.codigo, '') as codigo,
					COALESCE(i.numero_parte, m.numero_parte) as numero_parte,
					COALESCE(i.descripcion, m.descripcion) as descripcion,
					m.tipo_movimiento,
					m.cantidad,
					m.numero_documento,
					m.comentarios,
					timezone('America/Chicago', m.fecha_movimiento) as fecha_movimiento,
					u.nombre || ' ' || u.apellido AS usuario_nombre
				FROM movimientos m 
				LEFT JOIN usuarios u ON m.usuario_id = u.id
				LEFT JOIN inventario i ON m.inventario_id = i.id
				ORDER BY m.fecha_movimiento DESC, m.bodega, m.ubicacion, m.marca
		`;

		// Create a workbook
		const workbook = new ExcelJS.Workbook();

		// Build a map for quick lookup of net movements by product
		const netMovementsMap = new Map();
		if (movimientosResult.rows && movimientosResult.rows.length > 0) {
			for (const mov of movimientosResult.rows) {
				const key = mov.inventario_id || `${mov.bodega}||${mov.ubicacion || ''}||${mov.marca}||${mov.codigo}`;
				const sign = mov.tipo_movimiento === 'IN' ? 1 : -1;
				netMovementsMap.set(key, (netMovementsMap.get(key) || 0) + sign * mov.cantidad);
			}
		}

		// Process Inventory Data
		if (inventarioResult.rows && inventarioResult.rows.length > 0) {
			const inventarioData = inventarioResult.rows.map((row) => {
				const key = row.id || `${row.bodega}||${row.ubicacion || ''}||${row.marca}||${row.codigo}`;
				return {
					id: row.id,
					bodega: row.bodega,
					marca: row.marca,
					ubicacion: row.ubicacion,
					codigo: row.codigo,
					numero_parte: row.numero_parte,
					descripcion: row.descripcion,
					inventario_sistema: row.inventario_sistema,
					gtin: row.gtin || '',
					dun14: row.dun14 || '',
					lote: row.lote || '',
					unidad_medida: row.unidad_medida || '',
					tare: row.tare || '',
					inventario_fisico: row.inventario_fisico,
					movimientos_netos: netMovementsMap.get(key) || '',
					fecha_inventario: row.fecha_inventario ? new Date(row.fecha_inventario) : null,
					categoria_incidencia: row.categoria_incidencia || '',
					notas: row.notas || '',
					actualizado_por: row.actualizado || '',
					validado_por: row.validado || ''
				};
			});

			const inventarioSheet = workbook.addWorksheet('Inventario');
			inventarioSheet.columns = [
				{ header: 'id', key: 'id', width: 10 },
				{ header: 'bodega', key: 'bodega', width: 15 },
				{ header: 'marca', key: 'marca', width: 15 },
				{ header: 'ubicacion', key: 'ubicacion', width: 15 },
				{ header: 'codigo', key: 'codigo', width: 18 },
				{ header: 'numero_parte', key: 'numero_parte', width: 18 },
				{ header: 'descripcion', key: 'descripcion', width: 30 },
				{ header: 'inventario_sistema', key: 'inventario_sistema', width: 18 },
				{ header: 'gtin', key: 'gtin', width: 18 },
				{ header: 'dun14', key: 'dun14', width: 18 },
				{ header: 'lote', key: 'lote', width: 14 },
				{ header: 'unidad_medida', key: 'unidad_medida', width: 18 },
				{ header: 'tare', key: 'tare', width: 12 },
				{ header: 'inventario_fisico', key: 'inventario_fisico', width: 18 },
				{ header: 'movimientos_netos', key: 'movimientos_netos', width: 18 },
				{ header: 'fecha_inventario', key: 'fecha_inventario', width: 20 },
				{ header: 'categoria_incidencia', key: 'categoria_incidencia', width: 22 },
				{ header: 'notas', key: 'notas', width: 28 },
				{ header: 'actualizado_por', key: 'actualizado_por', width: 20 },
				{ header: 'validado_por', key: 'validado_por', width: 20 }
			];

			inventarioSheet.addRows(inventarioData);
		}

		// Process Movements Data
		if (movimientosResult.rows && movimientosResult.rows.length > 0) {
			const movimientosData = movimientosResult.rows.map((row) => ({
				Bodega: row.bodega,
				Ubicación: row.ubicacion || '',
				Marca: row.marca,
				Código: row.codigo,
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
				{ header: 'Código', key: 'Código', width: 15 },
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
