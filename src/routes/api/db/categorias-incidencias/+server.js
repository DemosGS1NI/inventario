import { sql } from '$lib/database';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth, requireAdmin } from '$lib/authMiddleware';

dotenv.config();

// Create a new category
export async function POST({ request, locals }) {
	// Require admin for creating categories
	requireAdmin(locals);

	try {
		const { categoria, descripcion } = await request.json();

		// Validate input
		if (!categoria) {
			return errorResponse(400, 'VALIDATION_ERROR', 'Categoría es requerida');
		}

		// Check if category already exists
		const existingCategory = await sql`
      SELECT id FROM categorias_incidencias WHERE categoria = ${categoria}
    `;

		if (existingCategory.rows.length > 0) {
			return errorResponse(409, 'CONFLICT', 'Ya existe una categoría con ese nombre');
		}

		const result = await sql`
      INSERT INTO categorias_incidencias (categoria, descripcion)
      VALUES (${categoria}, ${descripcion})
      RETURNING id, categoria, descripcion;
    `;

		return successResponse(result.rows[0], 'Categoria creada satisfactoriamente', { status: 201 });
	} catch (error) {
		console.error('Error creating category:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al crear una categoría',
			error.message
		);
	}
}

// Read all categories
export async function GET({ locals }) {
	// All authenticated users can read categories
	requireAuth(locals);

	try {
		const result = await sql`
      SELECT id, categoria, descripcion
      FROM categorias_incidencias 
      ORDER BY id
    `;

		return successResponse(result.rows, 'Categorías obtenidas satisfactoriamente');
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
export async function PUT({ request, locals }) {
	// Require admin for updating categories
	requireAdmin(locals);

	try {
		const { id, categoria, descripcion } = await request.json();

		// Validate input
		if (!id || !categoria) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID y categoría son requeridos');
		}

		// Check if category exists
		const existingCategory = await sql`
      SELECT id FROM categorias_incidencias WHERE id = ${id}
    `;

		if (existingCategory.rows.length === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Categoría no encontrada');
		}

		// Check if new name conflicts with another category
		const nameConflict = await sql`
      SELECT id FROM categorias_incidencias 
      WHERE categoria = ${categoria} AND id != ${id}
    `;

		if (nameConflict.rows.length > 0) {
			return errorResponse(409, 'CONFLICT', 'Ya existe una categoría con ese nombre');
		}

		const result = await sql`
      UPDATE categorias_incidencias
      SET categoria = ${categoria}, descripcion = ${descripcion}
      WHERE id = ${id}
      RETURNING id, categoria, descripcion;
    `;

		return successResponse(result.rows[0], 'Categoría actualizada satisfactoriamente');
	} catch (error) {
		console.error('Error updating category:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al actualizar categoría',
			error.message
		);
	}
}

// Delete a category by ID
export async function DELETE({ request, locals }) {
	// Require admin for deleting categories
	requireAdmin(locals);

	try {
		const { id } = await request.json();

		// Validate input
		if (!id) {
			return errorResponse(400, 'VALIDATION_ERROR', 'ID es requerido');
		}

		// Check if category exists
		const existingCategory = await sql`
      SELECT id, categoria FROM categorias_incidencias WHERE id = ${id}
    `;

		if (existingCategory.rows.length === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Categoría no encontrada');
		}

		const result = await sql`
      DELETE FROM categorias_incidencias
      WHERE id = ${id}
      RETURNING id, categoria;
    `;

		console.log(`Categoría ${result.rows[0].categoria} eliminada por ${locals.user.userId}`);

		return successResponse(null, 'Categoría eliminada satisfactoriamente');
	} catch (error) {
		console.error('Error deleting category:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al eliminar categoría',
			error.message
		);
	}
}
