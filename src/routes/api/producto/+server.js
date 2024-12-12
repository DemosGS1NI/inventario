import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export async function GET({ url }) {
    const bodega = url.searchParams.get('bodega');
    const marca = url.searchParams.get('marca');
    const codigoBarras = url.searchParams.get('codigo_barras');

    if (!bodega || !marca || !codigoBarras) {
        return new Response(
            JSON.stringify({ success: false, message: 'Bodega, Marca, and Codigo de Barras are required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const result = await sql`
            SELECT numero_parte, descripcion, inventario_fisico, fecha_inventario, categoria_incidencia, incidencia 
            FROM inventario 
            WHERE bodega = ${bodega} AND marca = ${marca} AND codigo_barras = ${codigoBarras}
        `;
        
        if (result.rows.length > 0) {
            return new Response(
                JSON.stringify({ product: result.rows }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        } else {
            return new Response(
                JSON.stringify({ success: false, message: 'Product not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }
    } catch (error) {
        console.error('Error fetching product:', error);
        return new Response(
            JSON.stringify({ success: false, message: 'Error fetching product' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function PUT({ request }) {
    try {
        const { bodega, ubicacion, marca, codigo_barras, inventario_fisico, categoria_incidencia, incidencia, actualizado_por } = await request.json();

        console.log(bodega);
        console.log(ubicacion);
        console.log(marca);
        console.log(codigo_barras);
        console.log(inventario_fisico);
        console.log(categoria_incidencia);
        console.log(incidencia);
        console.log(actualizado_por);



        if (!bodega || !marca || !codigo_barras ) {
            return new Response(
                JSON.stringify({ success: false, message: 'All fields except fecha_inventario are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('Updating product with the following details:');
        console.log({ bodega, marca, codigo_barras, ubicacion, inventario_fisico, categoria_incidencia,incidencia, actualizado_por });

        const currentDateTime = new Date().toISOString();

        const result = await sql`
            UPDATE inventario
            SET 
                ubicacion = ${ubicacion},
                inventario_fisico = ${inventario_fisico},
                fecha_inventario = ${currentDateTime},
                categoria_incidencia = ${categoria_incidencia},
                incidencia = ${incidencia},
                actualizado_por =  ${actualizado_por}
            WHERE 
                bodega = ${bodega} AND 
                marca = ${marca} AND 
                codigo_barras = ${codigo_barras}
        `;

        console.log('SQL Result:', result);

        // Check rowCount to confirm rows were affected
        if (result.rowCount > 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'Product updated successfully' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        } else {
            return new Response(
                JSON.stringify({ success: false, message: 'Product not found or no changes made' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }
    } catch (error) {
        console.error('Error updating product:', error);
        return new Response(
            JSON.stringify({ success: false, message: 'Error updating product' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

