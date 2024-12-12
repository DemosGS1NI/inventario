import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export async function GET({ url }) {
    const bodega = url.searchParams.get('bodega'); // Get the bodega parameter from the query string

    if (!bodega) {
        return new Response(
            JSON.stringify({ success: false, message: 'Bodega is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Query to get distinct marcas based on bodega
        const result = await sql`
            SELECT DISTINCT marca 
            FROM inventario 
            WHERE bodega = ${bodega}
        `;

        if (result.rows.length > 0) {
            return new Response(
                JSON.stringify({ marcas: result.rows.map(row => row.marca) }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        } else {
            return new Response(
                JSON.stringify({ success: false, message: 'No marcas found for the specified bodega' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }
    } catch (error) {
        console.error('Error fetching marcas:', error);
        return new Response(
            JSON.stringify({ success: false, message: 'Error fetching marcas' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
