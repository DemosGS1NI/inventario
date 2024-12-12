// src/routes/api/reporte-carga-excel/+server.js
import { sql } from '@vercel/postgres';

export const GET = async () => {
  try {
    const result = await sql`
      SELECT id, codigo_barras, gtin, bodega, ubicacion, marca, numero_parte, descripcion, inventario_sistema
      FROM inventario;
    `;

    console.log(result); // Log result to inspect the data

    return new Response(JSON.stringify(result.rows), { status: 200 });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch report data' }), { status: 500 });
  }
};
