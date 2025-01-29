import { json } from '@sveltejs/kit';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import xlsx from 'xlsx';

dotenv.config();

export const POST = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return json({ error: 'No se ha seleccionado ningún archivo' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
        const sheet = workbook.Sheets['Sheet1'];
        
        if (!sheet) {
            return json({ error: 'No se encontró la hoja "Sheet1" en el archivo Excel' }, { status: 400 });
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
                ${row.inventario_sistema || 'NULL'}
            )`).join(',');

            await sql.query(`
                INSERT INTO inventario (
                    id, codigo_barras, gtin, bodega, ubicacion, marca,
                    numero_parte, descripcion, inventario_sistema
                ) VALUES ${values};
            `);

            return json({ success: 'Datos cargados exitosamente en la base de datos' });
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            
            // Handle duplicate key error
            if (error.code === '23505') {  // Unique violation
                return json({ 
                    error: 'Error: Registro duplicado encontrado. Corrija los datos e intente nuevamente.',
                    details: error.detail  // This will show the exact duplicate key values
                }, { status: 400 });
            }

            return json({ 
                error: 'Error al procesar el archivo. Verifique el formato de los datos.',
                details: error.message 
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error general:', error);
        return json({ 
            error: 'Error al procesar el archivo Excel',
            details: error.message
        }, { status: 500 });
    }
};