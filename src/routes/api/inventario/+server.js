// src/routes/api/inventario/+server.js
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config();

// This endpoint handles deletion of ALL inventory records AND movements
// It should be used with extreme caution
export async function DELETE({ request, locals }) {
	// Get user ID from session for security
	const userId = locals.user?.userId;
	if (!userId) {
		console.error('Unauthorized: User session not found');
		return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
	}

	// Verify user has Admin role
	if (locals.user?.userRole !== 'Admin') {
		console.error('User role:', locals.user.userRole);
		return errorResponse(403, 'FORBIDDEN', 'Only administrators can clean tables');
	}

	try {
		// Require a confirmation header for safety
		const confirmHeader = request.headers.get('X-Confirm-Delete');
		if (confirmHeader !== 'DELETE-ALL-INVENTORY') {
			return errorResponse(
				400,
				'CONFIRMATION_REQUIRED',
				'This operation requires confirmation. Please include the X-Confirm-Delete header with the value "DELETE-ALL-INVENTORY"'
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
                ${`Inventory and movements tables cleaned up. Inventario records deleted: ${inventarioCount}, Movimientos records deleted: ${movimientosCount}`},
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
			`Tables cleaned successfully: ${inventarioCount} inventory records and ${movimientosCount} movement records deleted`
		);
	} catch (error) {
		console.error('Error cleaning tables:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error cleaning tables', error.message);
	}
}
