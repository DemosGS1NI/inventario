// src/routes/api/carga-datos-excel/+server.js
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAdmin } from '$lib/authMiddleware';

dotenv.config();

export const POST = async ({ request, locals }) => {
	const user = requireAdmin(locals);

	try {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!file) {
			return errorResponse(400, 'NO_FILE', 'No se ha seleccionado ningún archivo');
		}

		if (!file.name.toLowerCase().endsWith('.xlsx')) {
			return errorResponse(400, 'INVALID_FILE_TYPE', 'Solo se permiten archivos .xlsx');
		}

		// Check if table has existing data FIRST - before processing the file
		const existingDataCheck = await sql`SELECT COUNT(*) as record_count FROM inventario`;
		const existingRecordCount = parseInt(existingDataCheck.rows[0].record_count);

		if (existingRecordCount > 0) {
			return errorResponse(
				409,
				'TABLE_NOT_EMPTY',
				`La tabla contiene ${existingRecordCount} registros. Debe limpiar la tabla primero.`
			);
		}

		// Read Excel file with exceljs to avoid vulnerable xlsx dependency
		const buffer = Buffer.from(await file.arrayBuffer());
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);

		// Use first sheet or look for common names
		let worksheet = workbook.getWorksheet('Sheet1');
		if (!worksheet && workbook.worksheets.length > 0) {
			[worksheet] = workbook.worksheets;
		}

		if (!worksheet) {
			return errorResponse(400, 'NO_SHEETS', 'No se encontró ninguna hoja en el archivo Excel');
		}

		const headerRow = worksheet.getRow(1);
		const headers = headerRow.values
			.slice(1)
			.map((value) => {
				if (value === null || value === undefined) return null;
				if (typeof value === 'object' && value.text) return value.text.trim();
				return String(value).trim();
			})
			.filter(Boolean)
			.map((h) => h.toLowerCase());

		if (headers.length === 0) {
			return errorResponse(400, 'EMPTY_SHEET', 'La hoja no contiene encabezados');
		}

		const normalizeCellValue = (cellValue) => {
			if (cellValue === null || cellValue === undefined) return null;
			if (cellValue instanceof Date) return cellValue.toISOString();
			if (typeof cellValue === 'object' && cellValue.text) return cellValue.text;
			if (typeof cellValue === 'object' && Array.isArray(cellValue.richText)) {
				return cellValue.richText.map((part) => part.text).join('');
			}
			return cellValue;
		};

		const data = [];
		worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
			if (rowNumber === 1) return; // Skip headers

			const rowData = {};
			headers.forEach((header, index) => {
				const cellValue = normalizeCellValue(row.getCell(index + 1).value);
				rowData[header] = cellValue;
			});

			// Skip completely empty rows
			const hasValues = Object.values(rowData).some((value) => value !== null && value !== '');
			if (hasValues) {
				data.push(rowData);
			}
		});

		if (!data || data.length === 0) {
			return errorResponse(400, 'EMPTY_SHEET', 'El archivo está vacío');
		}

		try {
			await sql`BEGIN`;

			const hasIdHeader = headers.includes('id');
			const defaultId = { __unsafe: 'DEFAULT' };

			for (const row of data) {
				const rawId = hasIdHeader ? row.id : null;
				const trimmedId = rawId === undefined || rawId === null ? null : String(rawId).trim();
				const parsedId = trimmedId === '' ? null : Number(trimmedId);

				if (trimmedId !== null && trimmedId !== '' && Number.isNaN(parsedId)) {
					throw new Error('El valor de id debe ser numérico');
				}

				// Treat null, empty, or zero as "use default sequence"
				const useDefaultId = parsedId === null || parsedId === 0;

				const codigo = row.codigo || null;
				const gtin = row.gtin || null;
				const dun14 = row.dun14 || null;
				const lote = row.lote || null;
				const unidadMedida = row.unidad_medida || null;
				const tare = row.tare || null;
				const inventarioSistema = row.inventario_sistema || null;
				const inventarioFisico = row.inventario_fisico || null;
				const categoriaIncidencia = row.categoria_incidencia || null;
				const notas = row.notas || null;

				if (useDefaultId) {
					await sql`
						INSERT INTO inventario (
							codigo,
							gtin,
							dun14,
							bodega,
							ubicacion,
							marca,
							numero_parte,
							lote,
							unidad_medida,
							tare,
							descripcion,
							inventario_sistema,
							inventario_fisico,
							fecha_inventario,
							categoria_incidencia,
							notas,
							actualizado_por,
							validado,
							validado_por
						) VALUES (
							${codigo},
							${gtin},
							${dun14},
							${row.bodega || null},
							${row.ubicacion || null},
							${row.marca || null},
							${row.numero_parte || null},
							${lote},
							${unidadMedida},
							${tare},
							${row.descripcion || null},
							${inventarioSistema},
							${inventarioFisico},
							${row.fecha_inventario || null},
							${categoriaIncidencia},
							${notas},
							${row.actualizado_por || null},
							${row.validado || null},
							${row.validado_por || null}
						)
					`;
				} else {
					await sql`
						INSERT INTO inventario (
							id,
							codigo,
							gtin,
							dun14,
							bodega,
							ubicacion,
							marca,
							numero_parte,
							lote,
							unidad_medida,
							tare,
							descripcion,
							inventario_sistema,
							inventario_fisico,
							fecha_inventario,
							categoria_incidencia,
							notas,
							actualizado_por,
							validado,
							validado_por
						) VALUES (
							${parsedId},
							${codigo},
							${gtin},
							${dun14},
							${row.bodega || null},
							${row.ubicacion || null},
							${row.marca || null},
							${row.numero_parte || null},
							${lote},
							${unidadMedida},
							${tare},
							${row.descripcion || null},
							${inventarioSistema},
							${inventarioFisico},
							${row.fecha_inventario || null},
							${categoriaIncidencia},
							${notas},
							${row.actualizado_por || null},
							${row.validado || null},
							${row.validado_por || null}
						)
					`;
				}
			}
			await sql`COMMIT`;

			// Verify count
			const finalCount = await sql`SELECT COUNT(*) as count FROM inventario`;
			const insertedCount = parseInt(finalCount.rows[0].count);

			return successResponse(
				{ recordsImported: insertedCount },
				`${insertedCount} registros importados exitosamente`
			);
		} catch (error) {
			console.error('Error al procesar el archivo:', error);
			try {
				await sql`ROLLBACK`;
			} catch (rollbackErr) {
				console.error('Error durante el rollback:', rollbackErr);
			}

			let fullErrorMessage = error.message;
			if (error.detail) {
				fullErrorMessage += `. ${error.detail}`;
			}

			return errorResponse(500, 'DATABASE_ERROR', fullErrorMessage, error.detail);
		}
	} catch (error) {
		console.error('Error general:', error);
		return errorResponse(500, 'FILE_ERROR', 'Error al procesar el archivo Excel', error.message);
	}
};
