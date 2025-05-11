// src/routes/api/inventario/+server.js
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config();

// This endpoint handles deletion of ALL inventory records
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

        // First, get the count for logging purposes
        const countResult = await sql`
            SELECT COUNT(*) as count FROM inventario
        `;
        const count = countResult.rows[0].count;

        // Then delete the records
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
                ${'Inventory table cleaned up. Records deleted: ' + count},
                CURRENT_TIMESTAMP
            )
        `;

        return successResponse(
            { 
                deletedCount: count,
                timestamp: new Date().toISOString(),
                user: {
                    id: userId,
                    role: locals.user.userRole
                }
            },
            'Inventory cleaned successfully'
        );
    } catch (error) {
        console.error('Error cleaning inventory:', error);
        return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error cleaning inventory', error.message);
    }
}