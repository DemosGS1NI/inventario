// src/routes/api/inventario/+server.js
import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config();

// This endpoint handles deletion of ALL inventory records AND movements
// It should be used with extreme caution
export async function DELETE({ request, locals }) {
	// Get user ID from session for security
	const userId = locals.user?.userId;
	if (!userId) {
		console.error('No autorizado: Sesión de usuario no encontrada');
		return errorResponse(401, 'UNAUTHORIZED', 'Sesión de usuario no encontrada');
	}

	// Verify user has Admin role
	if (locals.user?.userRole !== 'Admin') {
		console.error('Rol de usuario:', locals.user.userRole);
		return errorResponse(403, 'FORBIDDEN', 'Solo los administradores pueden limpiar las tablas');
	}

	try {
		// Require a confirmation header for safety
		const confirmHeader = request.headers.get('X-Confirm-Delete');
		if (confirmHeader !== 'DELETE-ALL-INVENTORY') {
			return errorResponse(
				400,
				'CONFIRMATION_REQUIRED',
				'Esta operación requiere confirmación. Por favor incluya el encabezado X-Confirm-Delete con el valor "DELETE-ALL-INVENTORY"'
			);
		}

		// First, get the counts for logging purposes
		const inventarioCountResult = await sql`
            SELECT COUNT(*) as count FROM inventario
        `;
		const movimientosCountResult = await sql`
            SELECT COUNT(*) as count FROM movimientos
        `;

		const inventarioCount = inventarioCountResult.rows[0].count;
		const movimientosCount = movimientosCountResult.rows[0].count;

		// Delete in correct order (movimientos first to avoid any potential FK constraint issues)
		await sql`
            DELETE FROM movimientos 
            WHERE 1=1
        `;

		await sql`
            DELETE FROM inventario 
            WHERE 1=1
        `;

		// Log the cleanup operation in the audit log
		await sql`
            INSERT INTO audit_log (
                action_type,
                performed_by,
                action_details,
                timestamp
            ) VALUES (
                'INVENTORY_CLEANUP',
                ${userId},
                ${`Limpieza de tablas de inventario y movimientos. Registros de inventario eliminados: ${inventarioCount}, Registros de movimientos eliminados: ${movimientosCount}`},
                CURRENT_TIMESTAMP
            )
        `;

		return successResponse(
			{
				deletedInventarioCount: parseInt(inventarioCount),
				deletedMovimientosCount: parseInt(movimientosCount),
				totalDeleted: parseInt(inventarioCount) + parseInt(movimientosCount),
				timestamp: new Date().toISOString(),
				user: {
					id: userId,
					role: locals.user.userRole
				}
			},
			`Tablas limpiadas satisfactoriamente: ${inventarioCount} registros de inventario y ${movimientosCount} registros de movimientos eliminados`
		);
	} catch (error) {
		console.error('Error al limpiar tablas:', error);
		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Fallo al limpiar las tablas',
			error.message
		);
	}
}
