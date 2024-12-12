import { json } from '@sveltejs/kit';
import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
config();
import xlsx from 'xlsx';

export const POST = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
        const sheet = workbook.Sheets['Sheet1'];
        if (!sheet) {
            return json({ error: 'Sheet1 not found in the Excel file' }, { status: 400 });
        }

        const data = xlsx.utils.sheet_to_json(sheet);

        for (const row of data) {
            const {
                id,
                codigo_barras,
                gtin,
                bodega,
                ubicacion,
                marca,
                numero_parte,
                descripcion,
                inventario_sistema,
            } = row;

            await sql`
                INSERT INTO inventario (
                    id, codigo_barras, gtin, bodega, ubicacion, marca,
                    numero_parte, descripcion, inventario_sistema
                )
                VALUES (
                    ${id}, ${codigo_barras}, ${gtin}, ${bodega}, ${ubicacion}, ${marca},
                    ${numero_parte}, ${descripcion}, ${inventario_sistema}
                )
                ON CONFLICT (id) DO NOTHING;
            `;
        }

        return json({ success: 'Data successfully loaded into the database' });
    } catch (error) {
        console.error(error);
        return json({ error: 'Failed to process the file' }, { status: 500 });
    }
};
