// src/routes/api/carga-datos-excel/+server.js
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAdmin } from '$lib/authMiddleware';

dotenv.config();

// Validation functions
function validateInventoryRecord(row, rowIndex) {
	const errors = [];

	// Required fields validation
	if (!row.id || row.id === '') {
		errors.push(`Fila ${rowIndex}: ID es requerido`);
	} else if (!Number.isInteger(Number(row.id)) || Number(row.id) <= 0) {
		errors.push(`Fila ${rowIndex}: ID debe ser un número entero positivo`);
	}

	if (!row.codigo_barras || row.codigo_barras === '') {
		errors.push(`Fila ${rowIndex}: Código de barras es requerido`);
	}

	if (!row.bodega || row.bodega === '') {
		errors.push(`Fila ${rowIndex}: Bodega es requerida`);
	}

	// Optional field validations
	if (
		row.inventario_sistema !== null &&
		row.inventario_sistema !== undefined &&
		row.inventario_sistema !== ''
	) {
		const inventarioSistema = Number(row.inventario_sistema);
		if (isNaN(inventarioSistema) || inventarioSistema < 0) {
			errors.push(`Fila ${rowIndex}: Inventario sistema debe ser un número no negativo`);
		}
	}

	// EAN13 validation
	if (row.single_item_ean13 && row.single_item_ean13.toString().length > 20) {
		errors.push(`Fila ${rowIndex}: Single Item EAN13 no puede exceder 20 caracteres`);
	}

	if (row.master_carton_ean13 && row.master_carton_ean13.toString().length > 20) {
		errors.push(`Fila ${rowIndex}: Master Carton EAN13 no puede exceder 20 caracteres`);
	}

	return { errors };
}

function sanitizeValue(value) {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	return value.toString().trim();
}

function findBestSheet(workbook) {
	const sheetNames = workbook.SheetNames;
	const preferredNames = ['sheet1', 'inventario', 'inventory', 'data', 'datos'];

	for (const preferred of preferredNames) {
		const found = sheetNames.find((name) => name.toLowerCase() === preferred.toLowerCase());
		if (found) return found;
	}

	return sheetNames[0];
}

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

		// Read Excel file
		const buffer = await file.arrayBuffer();
		const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });

		if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
			return errorResponse(400, 'NO_SHEETS', 'El archivo Excel no contiene hojas de trabajo');
		}

		const sheetName = findBestSheet(workbook);
		const sheet = workbook.Sheets[sheetName];

		if (!sheet) {
			return errorResponse(400, 'INVALID_SHEET', `No se pudo acceder a la hoja "${sheetName}"`);
		}

		const data = xlsx.utils.sheet_to_json(sheet);

		if (!data || data.length === 0) {
			return errorResponse(
				400,
				'EMPTY_SHEET',
				'La hoja de Excel está vacía o no contiene datos válidos'
			);
		}

		// Check if inventory table has existing data
		const existingDataCheck = await sql`
            SELECT COUNT(*) as record_count FROM inventario
        `;
		const existingRecordCount = parseInt(existingDataCheck.rows[0].record_count);

		if (existingRecordCount > 0) {
			return errorResponse(
				409,
				'TABLE_NOT_EMPTY',
				`La tabla de inventario contiene ${existingRecordCount} registros existentes. Debe ejecutar "Limpieza de Tablas" en el menú de Administración antes de cargar nuevos datos.`,
				{
					existingRecordCount,
					instructions:
						'Vaya a Administración → Limpieza de Tablas para limpiar los datos existentes antes de importar.'
				}
			);
		}

		// Simple validation - just count errors, don't return details
		let validRecords = 0;
		let invalidRecords = 0;
		const duplicateIds = new Set();
		const duplicateCodigosBarras = new Set();
		const idsInFile = new Map();
		const codigosBarrasInFile = new Map();

		for (let index = 0; index < data.length; index++) {
			const row = data[index];
			const rowNumber = index + 2;
			let hasErrors = false;

			// Check for duplicates
			if (row.id) {
				if (idsInFile.has(row.id)) {
					duplicateIds.add(row.id);
					hasErrors = true;
				} else {
					idsInFile.set(row.id, rowNumber);
				}
			}

			if (row.codigo_barras) {
				if (codigosBarrasInFile.has(row.codigo_barras)) {
					duplicateCodigosBarras.add(row.codigo_barras);
					hasErrors = true;
				} else {
					codigosBarrasInFile.set(row.codigo_barras, rowNumber);
				}
			}

			// Validate record
			const validation = validateInventoryRecord(row, rowNumber);
			if (validation.errors.length > 0) {
				hasErrors = true;
			}

			if (hasErrors) {
				invalidRecords++;
			} else {
				validRecords++;
			}
		}

		// Stop if validation errors found
		if (invalidRecords > 0) {
			return errorResponse(
				400,
				'VALIDATION_FAILED',
				`Se encontraron ${invalidRecords} errores de validación. El archivo no se importó.`,
				{
					summary: {
						totalRows: data.length,
						validRows: validRecords,
						invalidRows: invalidRecords
					}
				}
			);
		}

		// Database operations - insert all records
		try {
			// Log import start
			const importLogResult = await sql`
                INSERT INTO audit_log (
                    action_type,
                    performed_by,
                    action_details,
                    timestamp
                ) VALUES (
                    'EXCEL_IMPORT_START',
                    ${user.userId},
                    ${JSON.stringify({
											fileName: file.name,
											sheetName,
											recordCount: validRecords
										})},
                    CURRENT_TIMESTAMP
                )
                RETURNING id
            `;

			// Insert all records
			for (const row of data) {
				const cleanData = {
					id: parseInt(row.id),
					codigo_barras: sanitizeValue(row.codigo_barras),
					gtin: sanitizeValue(row.gtin),
					bodega: sanitizeValue(row.bodega),
					ubicacion: sanitizeValue(row.ubicacion),
					marca: sanitizeValue(row.marca),
					numero_parte: sanitizeValue(row.numero_parte),
					descripcion: sanitizeValue(row.descripcion),
					inventario_sistema: row.inventario_sistema ? parseFloat(row.inventario_sistema) : null,
					master_carton_ean13: sanitizeValue(row.master_carton_ean13),
					single_item_ean13: sanitizeValue(row.single_item_ean13)
				};

				await sql`
                    INSERT INTO inventario (
                        id, codigo_barras, gtin, bodega, ubicacion, marca,
                        numero_parte, descripcion, inventario_sistema, 
                        master_carton_ean13, single_item_ean13
                    ) VALUES (
                        ${cleanData.id}, ${cleanData.codigo_barras}, ${cleanData.gtin},
                        ${cleanData.bodega}, ${cleanData.ubicacion}, ${cleanData.marca},
                        ${cleanData.numero_parte}, ${cleanData.descripcion}, 
                        ${cleanData.inventario_sistema}, ${cleanData.master_carton_ean13}, 
                        ${cleanData.single_item_ean13}
                    )
                `;
			}

			// Verify the import
			const newCountResult = await sql`
                SELECT COUNT(*) as new_count FROM inventario
            `;
			const newCount = parseInt(newCountResult.rows[0].new_count);

			if (newCount !== validRecords) {
				throw new Error(`Insert verification failed: expected ${validRecords}, got ${newCount}`);
			}

			// Log successful completion
			await sql`
                UPDATE audit_log 
                SET action_details = ${JSON.stringify({
									fileName: file.name,
									sheetName,
									recordCount: validRecords,
									newCount: newCount,
									status: 'SUCCESS'
								})}
                WHERE id = ${importLogResult.rows[0].id}
            `;

			return successResponse(
				{
					summary: {
						totalRows: data.length,
						validRows: validRecords,
						invalidRows: 0
					},
					sheetProcessed: sheetName
				},
				`Importación completada exitosamente: ${validRecords} registros importados.`
			);
		} catch (dbError) {
			console.error('Database operation failed:', dbError);

			// Log the failed import
			try {
				await sql`
                    INSERT INTO audit_log (
                        action_type,
                        performed_by,
                        action_details,
                        timestamp
                    ) VALUES (
                        'EXCEL_IMPORT_FAILED',
                        ${user.userId},
                        ${JSON.stringify({
													fileName: file.name,
													sheetName,
													recordCount: validRecords,
													error: dbError.message,
													status: 'FAILED'
												})},
                        CURRENT_TIMESTAMP
                    )
                `;
			} catch (auditError) {
				console.error('Failed to log import failure:', auditError);
			}

			return errorResponse(
				500,
				'DATABASE_ERROR',
				'Error en la base de datos durante la importación. No se realizaron cambios.',
				dbError.message
			);
		}
	} catch (error) {
		console.error('Error general en importación Excel:', error);
		return errorResponse(
			500,
			'FILE_PROCESSING_ERROR',
			'Error al procesar el archivo Excel',
			error.message
		);
	}
};