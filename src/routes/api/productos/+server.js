import { sql } from '@vercel/postgres';

export async function GET({ url }) {
    const barcode = url.searchParams.get('barcode');

    try {
        const rows = await sql`SELECT * FROM productos WHERE codigo_barras = ${barcode}`;

        return {
            status: 200,
            body: rows[0] || {}, // Return the product details if found
        };
    } catch (error) {
        console.error('Database query error:', error);
        return {
            status: 500,
            body: { error: 'Internal server error' },
        };
    }
}
