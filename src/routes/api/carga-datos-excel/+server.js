// src/routes/api/carga-datos-excel/+server.js
import dotenv from 'dotenv';
import xlsx from 'xlsx';
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

		// Read Excel file
		const buffer = await file.arrayBuffer();
		const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });

		// Use first sheet or look for common names
		let sheet = workbook.Sheets['Sheet1'];
		if (!sheet && workbook.SheetNames.length > 0) {
			sheet = workbook.Sheets[workbook.SheetNames[0]];
		}

		if (!sheet) {
			return errorResponse(400, 'NO_SHEETS', 'No se encontró ninguna hoja en el archivo Excel');
		}

		const data = xlsx.utils.sheet_to_json(sheet);

		if (!data || data.length === 0) {
			return errorResponse(400, 'EMPTY_SHEET', 'El archivo está vacío');
		}

		try {
			// Batch insert all records using the working pattern
			const values = data
				.map(
					(row) => `(
				${row.id || 'NULL'},
				${row.codigo_barras ? `'${row.codigo_barras.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.gtin ? `'${row.gtin.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.bodega ? `'${row.bodega.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.ubicacion ? `'${row.ubicacion.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.marca ? `'${row.marca.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.numero_parte ? `'${row.numero_parte.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.descripcion ? `'${row.descripcion.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.inventario_sistema || 'NULL'},
				${row.master_carton_ean13 ? `'${row.master_carton_ean13.toString().replace(/'/g, "''")}'` : 'NULL'},
				${row.single_item_ean13 ? `'${row.single_item_ean13.toString().replace(/'/g, "''")}'` : 'NULL'}
			)`
				)
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
