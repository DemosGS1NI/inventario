import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config();

export async function GET({ locals }) {
    // Check if user is logged in
    if (!locals.user) {
        return errorResponse(401, 'UNAUTHORIZED', 'You are not authorized to access this resource');
    }

    try {
        // Get menu items for user's role
        const result = await sql`
            SELECT 
                c.name as category,
                m.label,
                m.href,
                m.order_index
            FROM menu_categories c
            JOIN menu_items m ON c.id = m.category_id
            JOIN menu_item_roles r ON m.id = r.menu_item_id
            JOIN roles ro ON r.role_id = ro.id
            WHERE ro.nombre_rol = ${locals.user.userRole}
            AND m.is_active = true
            ORDER BY c.order_index, m.order_index
        `;

        // Group items by category
        const menu = {};
        for (const row of result.rows) {
            if (!menu[row.category]) {
                menu[row.category] = [];
            }
            menu[row.category].push({
                label: row.label,
                href: row.href
            });
        }

        return successResponse(menu, 'Menu items retrieved successfully');
    } catch (error) {
        console.error('Error fetching menu:', error);
        return errorResponse(
            500,
            'INTERNAL_SERVER_ERROR',
            'Error retrieving menu items',
            error.message
        );
    }
}
