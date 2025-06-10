import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config();

// DELETE a specific movement by ID
export async function DELETE({ params, locals }) {
	// Authentication check
	const userId = locals.user?.userId;
	if (!userId) {
		return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
	}

	// Authorization check - only Admin can delete movements
	if (locals.user?.userRole !== 'Admin') {
		return errorResponse(403, 'FORBIDDEN', 'Only administrators can delete movements');
	}

	try {
		const movementId = parseInt(params.id);

		// Validate movement ID
		if (isNaN(movementId) || movementId <= 0) {
			return errorResponse(400, 'INVALID_ID', 'Invalid movement ID');
		}

		// First, check if the movement exists and get its details for logging
		const checkResult = await sql`
      SELECT 
        m.*,
        u.nombre || ' ' || u.apellido AS usuario_nombre
      FROM movimientos m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.id = ${movementId}
    `;

		if (checkResult.rows.length === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Movement not found');
		}

		const movement = checkResult.rows[0];

		// Delete the movement
		const deleteResult = await sql`
      DELETE FROM movimientos
      WHERE id = ${movementId}
      RETURNING id, codigo_barras, tipo_movimiento, cantidad
    `;

		if (deleteResult.rowCount === 0) {
			return errorResponse(404, 'NOT_FOUND', 'Movement not found or already deleted');
		}

		// Log the deletion in audit log (if you have one)
		try {
			await sql`
        INSERT INTO audit_log (
          action_type,
          performed_by,
          action_details,
          timestamp
        ) VALUES (
          'MOVEMENT_DELETED',
          ${userId},
          ${`Deleted movement: ${movement.tipo_movimiento} ${movement.cantidad} units of ${movement.codigo_barras} (Doc: ${movement.numero_documento || 'N/A'})`},
          CURRENT_TIMESTAMP
        )
      `;
		} catch (auditError) {
			// Log audit error but don't fail the deletion
			console.error('Failed to log movement deletion:', auditError);
		}

		return successResponse(
			{
				deletedMovement: deleteResult.rows[0],
				deletedBy: userId,
				timestamp: new Date().toISOString()
			},
			'Movement deleted successfully'
		);
	} catch (error) {
		console.error('Error deleting movement:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error deleting movement', error.message);
	}
}
