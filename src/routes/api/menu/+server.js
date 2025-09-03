//import { sql } from '@vercel/postgres';
import { sql } from '$lib/database';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

export async function GET({ locals }) {
	requireAuth(locals);

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

		// Enhanced error handling
		let errorMessage = 'Error retrieving menu items';
		let errorDetails = error.message;

		// Check for specific database errors
		if (error.code === '42P01') {
			errorMessage = 'Database table not found';
			errorDetails = 'Required database tables are missing';
		} else if (error.code === '23505') {
			errorMessage = 'Database constraint violation';
			errorDetails = 'Duplicate entry found';
		} else if (error.code === '23503') {
			errorMessage = 'Database foreign key violation';
			errorDetails = 'Referenced record does not exist';
		}

		return errorResponse(500, 'INTERNAL_SERVER_ERROR', errorMessage, errorDetails);
	}
}
