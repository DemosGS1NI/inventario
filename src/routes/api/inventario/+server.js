import { sql } from '@vercel/postgres';  // Importing the sql function from @vercel/postgres
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

export async function GET({ url, locals }) {
    // Check authentication first
    const user = locals?.user;
    if (!user) {
        return errorResponse(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Check user role
    if (user.userRole !== 'Admin') {
        return errorResponse(403, 'FORBIDDEN', 'Admin access required');
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 10));

    if (isNaN(page) || isNaN(limit)) {
        return errorResponse(400, 'INVALID_PARAMS', 'Invalid pagination parameters');
    }

    const offset = (page - 1) * limit;

    try {
        // Let's log the query results at each step
        console.log('Executing query with params:', { page, limit, offset });

        const result = await sql`
            SELECT * FROM inventario
            ORDER BY id
            LIMIT ${limit} 
            OFFSET ${offset};
        `;

     
        // Get total count in a separate query for now
        const countResult = await sql`SELECT COUNT(*) as total FROM inventario;`;
        console.log('Count result:', countResult);

        const totalRecords = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalRecords / limit);

        return successResponse({
            items: result.rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords,
                limit
            }
        }, 'Inventory items retrieved successfully');

    } catch (error) {
        console.error('Error fetching inventory:', error);
        return errorResponse(500, 'DATABASE_ERROR', 'Failed to fetch inventory items', {
            error: error.message,
            stack: error.stack
        });
    }
}


export async function DELETE({ locals }) {
  // Check if the user is authenticated and has the correct role
  const user = locals?.user; //
  if (!user) {
    return errorResponse(401, 'UNAUTHORIZED', 'You must be logged in to delete inventory.');
  }

  // Optional: Check for specific role (e.g., admin)
  if (user.userRole !== 'Admin') {
    return errorResponse(403, 'FORBIDDEN', 'You do not have permission to delete inventory.');
  }

  try {
    // Delete all rows from the table
    await sql`DELETE FROM inventario`;

    return successResponse(null, 'TODOS los registros fueron eliminados.');
  } catch (error) {
    console.error('Error deleting rows:', error);
    return errorResponse(500, 'DELETE_ERROR', 'Failed to delete rows.', error.message);
  }
}
