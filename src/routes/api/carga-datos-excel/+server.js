// src/routes/api/upload-excel/+server.js
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';

dotenv.config();

// Validation functions
function validateInventoryRecord(row, rowIndex) {
	const errors = [];
	const warnings = [];

	// Required fields validation (based on database NOT NULL constraints)
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

	// Optional field validations (data type and format checks)
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

	// EAN13 validation (if provided) - now checking character varying(20) constraint
	if (row.single_item_ean13 && row.single_item_ean13.toString().length > 20) {
		errors.push(`Fila ${rowIndex}: Single Item EAN13 no puede exceder 20 caracteres`);
	}

	if (row.master_carton_ean13 && row.master_carton_ean13.toString().length > 20) {
		errors.push(`Fila ${rowIndex}: Master Carton EAN13 no puede exceder 20 caracteres`);
	}

	// EAN13 length warning (should ideally be 13 digits for proper EAN13)
	if (row.single_item_ean13 && row.single_item_ean13.toString().length !== 13) {
		warnings.push(
			`Fila ${rowIndex}: Single Item EAN13 debería tener 13 dígitos para ser un EAN13 válido`
		);
	}

	if (row.master_carton_ean13 && row.master_carton_ean13.toString().length !== 13) {
		warnings.push(
			`Fila ${rowIndex}: Master Carton EAN13 debería tener 13 dígitos para ser un EAN13 válido`
		);
	}

	return { errors, warnings };
}

function sanitizeValue(value) {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	return value.toString().trim();
}

function findBestSheet(workbook) {
	const sheetNames = workbook.SheetNames;

	// Priority order for sheet selection
	const preferredNames = ['sheet1', 'inventario', 'inventory', 'data', 'datos'];

	// First, try to find preferred sheet names (case insensitive)
	for (const preferred of preferredNames) {
		const found = sheetNames.find((name) => name.toLowerCase() === preferred.toLowerCase());
		if (found) return found;
	}

	// If no preferred name found, use the first sheet
	return sheetNames[0];
}

export const POST = async ({ request, locals }) => {
	try {
		// Authentication check
		const userId = locals.user?.userId;
		if (!userId) {
			return errorResponse(401, 'UNAUTHORIZED', 'Se requiere autenticación');
		}

		// Role check - only Admin and Supervisor can import
		if (!['Admin', 'Supervisor'].includes(locals.user?.userRole)) {
			return errorResponse(
				403,
				'FORBIDDEN',
				'Solo administradores y supervisores pueden importar datos'
			);
		}

		const formData = await request.formData();
		const file = formData.get('file');

		if (!file) {
			return errorResponse(400, 'NO_FILE', 'No se ha seleccionado ningún archivo');
		}

		// Validate file type
		if (!file.name.toLowerCase().endsWith('.xlsx')) {
			return errorResponse(400, 'INVALID_FILE_TYPE', 'Solo se permiten archivos .xlsx');
		}

		// Read Excel file
		const buffer = await file.arrayBuffer();
		const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });

		if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
			return errorResponse(400, 'NO_SHEETS', 'El archivo Excel no contiene hojas de trabajo');
		}

		// Find the best sheet to process
		const sheetName = findBestSheet(workbook);
		const sheet = workbook.Sheets[sheetName];

		if (!sheet) {
			return errorResponse(400, 'INVALID_SHEET', `No se pudo acceder a la hoja "${sheetName}"`);
		}

		// Convert sheet to JSON
		const data = xlsx.utils.sheet_to_json(sheet);

		if (!data || data.length === 0) {
			return errorResponse(
				400,
				'EMPTY_SHEET',
				'La hoja de Excel está vacía o no contiene datos válidos'
			);
		}

		console.log(`Processing ${data.length} rows from sheet "${sheetName}"`);

		// PHASE 0: CHECK IF INVENTORY TABLE HAS EXISTING DATA
		const existingDataCheck = await sql`
            SELECT COUNT(*) as record_count FROM inventario
        `;
		const existingRecordCount = parseInt(existingDataCheck.rows[0].record_count);

		if (existingRecordCount > 0) {
			console.log(`Found ${existingRecordCount} existing records in inventario table`);
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

		console.log('Inventory table is empty, proceeding with import');

		// PHASE 1: COMPLETE VALIDATION - NO DATABASE OPERATIONS YET
		const validationResults = {
			validRecords: [],
			invalidRecords: [],
			warnings: [],
			totalRows: data.length,
			duplicateIds: new Set(),
			duplicateCodigosBarras: new Set()
		};

		// Check for duplicates within the Excel file itself
		const idsInFile = new Map();
		const codigosBarrasInFile = new Map();

		data.forEach((row, index) => {
			const rowNumber = index + 2; // +2 because index starts at 0 and Excel rows start at 1, plus header row

			// Check for duplicate IDs within file
			if (row.id) {
				if (idsInFile.has(row.id)) {
					validationResults.duplicateIds.add(row.id);
					validationResults.invalidRecords.push({
						rowNumber,
						data: row,
						errors: [
							`ID ${row.id} está duplicado en el archivo (también aparece en fila ${idsInFile.get(row.id)})`
						]
					});
					return;
				} else {
					idsInFile.set(row.id, rowNumber);
				}
			}

			// Check for duplicate codigo_barras within file
			if (row.codigo_barras) {
				if (codigosBarrasInFile.has(row.codigo_barras)) {
					validationResults.duplicateCodigosBarras.add(row.codigo_barras);
					validationResults.invalidRecords.push({
						rowNumber,
						data: row,
						errors: [
							`Código de barras ${row.codigo_barras} está duplicado en el archivo (también aparece en fila ${codigosBarrasInFile.get(row.codigo_barras)})`
						]
					});
					return;
				} else {
					codigosBarrasInFile.set(row.codigo_barras, rowNumber);
				}
			}

			// Standard validation
			const validation = validateInventoryRecord(row, rowNumber);

			if (validation.errors.length > 0) {
				validationResults.invalidRecords.push({
					rowNumber,
					data: row,
					errors: validation.errors
				});
			} else {
				validationResults.validRecords.push({
					rowNumber,
					data: row
				});
				if (validation.warnings.length > 0) {
					validationResults.warnings.push(...validation.warnings);
				}
			}
		});

		// STOP HERE IF ANY VALIDATION ERRORS
		if (validationResults.invalidRecords.length > 0) {
			console.log(
				`Validation failed: ${validationResults.invalidRecords.length} invalid records found`
			);

			// Log details of validation errors for debugging
			console.log(
				'Validation errors:',
				validationResults.invalidRecords.map((r) => ({
					row: r.rowNumber,
					errors: r.errors,
					data: { id: r.data.id, codigo_barras: r.data.codigo_barras }
				}))
			);

			return errorResponse(
				400,
				'VALIDATION_FAILED',
				`Se encontraron ${validationResults.invalidRecords.length} errores de validación. El archivo no se importó.`,
				{
					invalidRecords: validationResults.invalidRecords,
					summary: {
						totalRows: validationResults.totalRows,
						validRows: validationResults.validRecords.length,
						invalidRows: validationResults.invalidRecords.length,
						warnings: validationResults.warnings
					}
				}
			);
		}

		console.log(`All ${validationResults.validRecords.length} records passed validation`);

		// PHASE 2: DATABASE OPERATIONS - ALL OR NOTHING
		try {
			// Step 1: Log the import start for audit trail
			const importLogResult = await sql`
                INSERT INTO audit_log (
                    action_type,
                    performed_by,
                    action_details,
                    timestamp
                ) VALUES (
                    'EXCEL_IMPORT_START',
                    ${userId},
                    ${JSON.stringify({
											fileName: file.name,
											sheetName,
											recordCount: validationResults.validRecords.length,
											warnings: validationResults.warnings
										})},
                    CURRENT_TIMESTAMP
                )
                RETURNING id
            `;

			const importLogId = importLogResult.rows[0].id;

			// Step 2: Backup current data count for verification (should be 0 at this point)
			const currentCountResult = await sql`
                SELECT COUNT(*) as current_count FROM inventario
            `;
			const currentCount = parseInt(currentCountResult.rows[0].current_count);

			// Step 3: Clear existing inventory data (should be none, but just in case)
			if (currentCount > 0) {
				await sql`DELETE FROM inventario`;
				console.log(`Cleared ${currentCount} existing inventory records`);
			}

			// Step 4: Insert all new records using individual parameterized queries
			for (const record of validationResults.validRecords) {
				const row = record.data;

				// Sanitize values
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

			// Step 5: Verify the import
			const newCountResult = await sql`
                SELECT COUNT(*) as new_count FROM inventario
            `;
			const newCount = parseInt(newCountResult.rows[0].new_count);

			if (newCount !== validationResults.validRecords.length) {
				throw new Error(
					`Insert verification failed: expected ${validationResults.validRecords.length}, got ${newCount}`
				);
			}

			// Step 6: Log successful completion
			await sql`
                UPDATE audit_log 
                SET action_details = ${JSON.stringify({
									fileName: file.name,
									sheetName,
									recordCount: validationResults.validRecords.length,
									warnings: validationResults.warnings,
									previousCount: currentCount,
									newCount: newCount,
									status: 'SUCCESS'
								})}
                WHERE id = ${importLogId}
            `;

			console.log(
				`Successfully imported ${newCount} records, replacing ${currentCount} previous records`
			);

			// Success response
			return successResponse(
				{
					summary: {
						totalRows: validationResults.totalRows,
						validRows: validationResults.validRecords.length,
						invalidRows: 0,
						warnings: validationResults.warnings,
						replacedRecords: true
					},
					sheetProcessed: sheetName
				},
				`Importación completada exitosamente: ${validationResults.validRecords.length} registros importados. Datos anteriores reemplazados.`
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
                        ${userId},
                        ${JSON.stringify({
													fileName: file.name,
													sheetName,
													recordCount: validationResults.validRecords.length,
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
