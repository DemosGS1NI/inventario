// External dependencies
import dotenv from 'dotenv';
import xlsx from 'xlsx';

// Database
import { sql } from '@vercel/postgres';

// Internal utilities  
import { successResponse, errorResponse } from '$lib/responseUtils';

dotenv.config();

export const POST = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return errorResponse(400, 'NO_FILE', 'No se ha seleccionado ningún archivo');
        }

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
        const sheet = workbook.Sheets['Sheet1'];
        
        if (!sheet) {
            return errorResponse(400, 'INVALID_SHEET', 'No se encontró la hoja "Sheet1" en el archivo Excel');
        }

        const data = xlsx.utils.sheet_to_json(sheet);

        try {
            // Batch insert all records
            const values = data.map(row => `(
                ${row.id},
                ${row.codigo_barras ? `'${row.codigo_barras}'` : 'NULL'},
                ${row.gtin ? `'${row.gtin}'` : 'NULL'},
                ${row.bodega ? `'${row.bodega}'` : 'NULL'},
                ${row.ubicacion ? `'${row.ubicacion}'` : 'NULL'},
                ${row.marca ? `'${row.marca}'` : 'NULL'},
                ${row.numero_parte ? `'${row.numero_parte}'` : 'NULL'},
                ${row.descripcion ? `'${row.descripcion}'` : 'NULL'},
                ${row.inventario_sistema || 'NULL'},
                ${row.master_carton_ean13 || 'NULL'},
                ${row.single_item_ean13 || 'NULL'}
            )`).join(',');

            await sql.query(`
                INSERT INTO inventario (
                    id, codigo_barras, gtin, bodega, ubicacion, marca,
                    numero_parte, descripcion, inventario_sistema, master_carton_ean13, single_item_ean13
                ) VALUES ${values};
            `);

            return successResponse(null,'Datos cargados exitosamente en la base de datos');
        } catch (error) {
    console.error('Error al procesar el archivo:', error);
    
    // Handle duplicate key error
    if (error.code === '23505') {  // Unique violation
        return errorResponse(
            409, 
            'DUPLICATE_ENTRY',
            'Registro duplicado encontrado. Corrija los datos e intente nuevamente.',
            error.detail
        );
    }

    return errorResponse(
        500,
        'FILE_PROCESSING_ERROR',
        'Error al procesar el archivo. Verifique el formato de los datos.',
        error.message
    );
}
    } catch (error) {
        console.error('Error general:', error);
        return errorResponse( 500,'FILE_PROCESSING_ERROR', 'Error al procesar el archivo Excel', error.message);
    }
};