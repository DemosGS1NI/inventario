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
			return errorResponse(400, 'VALIDATION_ERROR', 'Categoria es requerida');
		}

		const result = await sql`
      INSERT INTO categorias_incidencias (categoria, descripcion)
      VALUES (${categoria}, ${descripcion})
      RETURNING *;
    `;

		return successResponse(result.rows[0], 'Categoria creada satisfactoriamente', { status: 201 });
	} catch (error) {
		console.error('Error creating category:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al crear una categoria',
			error.message
		);
	}
}

// Read all categories
export async function GET() {
	try {
		const result = await sql`SELECT * FROM categorias_incidencias ORDER BY id`;

		return successResponse(result.rows, 'Categories fetched successfully');
	} catch (error) {
		console.error('Error fetching categories:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al obtener categorias',
			error.message
		);
	}
}

// Update a category by ID
export async function PUT({ request }) {
	try {
		const { id, categoria, descripcion } = await request.json();

		// Validate input
		if (!id || !categoria) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID y categoria son requeridos');
		}

		const result = await sql`
      UPDATE categorias_incidencias
      SET categoria = ${categoria}, descripcion = ${descripcion}
      WHERE id = ${id}
      RETURNING *;
    `;

		if (result.rows.length === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Categoria no encontrada');
		}

		return successResponse(result.rows[0], 'Categoria actualizada satisfactoriamente');
	} catch (error) {
		console.error('Error updating category:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al actualizar categoria',
			error.message
		);
	}
}

// Delete a category by ID
export async function DELETE({ request }) {
	try {
		const { id } = await request.json();

		// Validate input
		if (!id) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID is requerido');
		}

		const result = await sql`
      DELETE FROM categorias_incidencias
      WHERE id = ${id}
      RETURNING *;
    `;

		if (result.rows.length === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Categoria no encontrada');
		}

		return successResponse(null, 'Categoria eliminada satisfactoriamente');
	} catch (error) {
		console.error('Error deleting category:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al eliminar categoria',
			error.message
		);
	}
}
