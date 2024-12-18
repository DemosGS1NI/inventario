import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';

dotenv.config();

// Create a new category
export async function POST({ request }) {
  try {
    const { categoria, descripcion } = await request.json();

    // Validate input
    if (!categoria) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Categoria is required');
    }

    const result = await sql`
      INSERT INTO categorias_incidencias (categoria, descripcion)
      VALUES (${categoria}, ${descripcion})
      RETURNING *;
    `;

    return successResponse(result.rows[0], 'Category created successfully', { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Failed to create category', error.message);
  }
}

// Read all categories
export async function GET() {
  try {
    const result = await sql`SELECT * FROM categorias_incidencias ORDER BY id`;

    return successResponse(result.rows, 'Categories fetched successfully');
  } catch (error) {
    console.error('Error fetching categories:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch categories', error.message);
  }
}

// Update a category by ID
export async function PUT({ request }) {
  try {
    const { id, categoria, descripcion } = await request.json();

    // Validate input
    if (!id || !categoria) {
      return errorResponse(400, 'VALIDATION_ERROR', 'ID and Categoria are required');
    }

    const result = await sql`
      UPDATE categorias_incidencias
      SET categoria = ${categoria}, descripcion = ${descripcion}
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.rows.length === 0) {
      return errorResponse(404, 'NOT_FOUND', 'Category not found');
    }

    return successResponse(result.rows[0], 'Category updated successfully');
  } catch (error) {
    console.error('Error updating category:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Failed to update category', error.message);
  }
}

// Delete a category by ID
export async function DELETE({ request }) {
  try {
    const { id } = await request.json();

    // Validate input
    if (!id) {
      return errorResponse(400, 'VALIDATION_ERROR', 'ID is required');
    }

    const result = await sql`
      DELETE FROM categorias_incidencias
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.rows.length === 0) {
      return errorResponse(404, 'NOT_FOUND', 'Category not found');
    }

    return successResponse(null, 'Category deleted successfully');
  } catch (error) {
    console.error('Error deleting category:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete category', error.message);
  }
}
