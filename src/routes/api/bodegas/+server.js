import { json } from '@sveltejs/kit';
import { sql } from '@vercel/postgres';
import { config } from 'dotenv';

config(); // Load environment variables


export const GET = async () => {
    try {
        // Query to fetch distinct bodega names
        const { rows } = await sql`
            SELECT DISTINCT bodega
            FROM inventario;
        `;

        // Extract the bodega names into an array
        const bodegas = rows.map((row) => row.bodega);

        console.log('Fetched bodegas:', bodegas);

        // Return the response with the bodegas
        return json({ bodegas }, { status: 200 });
    } catch (error) {
        console.error('Error fetching bodegas:', error);

        return json({ error: 'Failed to fetch bodegas' }, { status: 500 });
    }
};

