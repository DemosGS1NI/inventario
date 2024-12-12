import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config();

// Create a new category
export async function POST({ request }) {
  const { categoria, descripcion } = await request.json();

  try {
    const result = await sql`
      INSERT INTO categorias_incidencias (categoria, descripcion)
      VALUES (${categoria}, ${descripcion})
      RETURNING *;
    `;

    return new Response(JSON.stringify(result.rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error inserting category:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// Read all categories
export async function GET() {
  try {
    const result = await sql`SELECT * FROM categorias_incidencias ORDER BY id`;

    return new Response(JSON.stringify(result.rows), { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// Update a category by ID
export async function PUT({ request }) {
  const { id, categoria, descripcion } = await request.json();

  try {
    const result = await sql`
      UPDATE categorias_incidencias
      SET categoria = ${categoria}, descripcion = ${descripcion}
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(result.rows[0]), { status: 200 });
  } catch (error) {
    console.error('Error updating category:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// Delete a category by ID
export async function DELETE({ request }) {
  const { id } = await request.json();

  try {
    const result = await sql`
      DELETE FROM categorias_incidencias
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: 'Category deleted successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error deleting category:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
