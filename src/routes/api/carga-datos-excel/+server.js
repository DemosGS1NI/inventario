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
		const existingDataCheck = await sql.query('SELECT COUNT(*) as record_count FROM inventario');
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
			.filter(Boolean);

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
			// Allow legacy headers and new headers (codigo, GTIN, DUN)
			const values = data
				.map((row) => {
					const codigoBarras = row.codigo || row.codigo_barras || null;
					const gtin = row.GTIN || row.gtin || row.gtin13 || row.GTIN13 ||row.single_item_ean13 || null;
					const masterCarton = row.DUN || row.dun14 || row.master_carton_ean13 || null;
					const singleItem = row.GTIN || row.gtin13 || row.GTIN13 || row.gtin || row.single_item_ean13 || null;

					const esc = (v) => `'${v.toString().replace(/'/g, "''")}'`;

					return `(
				${row.id || 'NULL'},
				${codigoBarras ? esc(codigoBarras) : 'NULL'},
				${gtin ? esc(gtin) : 'NULL'},
				${row.bodega ? esc(row.bodega) : 'NULL'},
				${row.ubicacion ? esc(row.ubicacion) : 'NULL'},
				${row.marca ? esc(row.marca) : 'NULL'},
				${row.numero_parte ? esc(row.numero_parte) : 'NULL'},
				${row.descripcion ? esc(row.descripcion) : 'NULL'},
				${row.inventario_sistema || 'NULL'},
				${masterCarton ? esc(masterCarton) : 'NULL'},
				${singleItem ? esc(singleItem) : 'NULL'}
			)`;
				})
				.join(',');

			await sql.query(`
				INSERT INTO inventario (
					id, codigo_barras, gtin, bodega, ubicacion, marca,
					numero_parte, descripcion, inventario_sistema, master_carton_ean13, single_item_ean13
				) VALUES ${values}
			`);

			// Verify count
			const finalCount = await sql.query('SELECT COUNT(*) as count FROM inventario');
			const insertedCount = parseInt(finalCount.rows[0].count);

			return successResponse(
				{ recordsImported: insertedCount },
				`${insertedCount} registros importados exitosamente`
			);
		} catch (error) {
			console.error('Error al procesar el archivo:', error);

			// Show both error message and detail to the user
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
