import { sql } from '@vercel/postgres';

export async function GET({ url }) {
  const warehouse = url.searchParams.get('warehouse');
  const brand = url.searchParams.get('brand');

  if (!warehouse || !brand) {
    return new Response(
      JSON.stringify({ error: 'Warehouse and brand are required parameters.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch locations based on warehouse and brand
    const { rows: locations } = await sql`
      SELECT DISTINCT ubicacion 
      FROM inventario
      WHERE bodega = ${warehouse} AND marca = ${brand}
    `;

    return new Response(
      JSON.stringify({ success: true, locations }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching locations:', error);
    return new Response(
      JSON.stringify({ error: 'Error fetching locations.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
