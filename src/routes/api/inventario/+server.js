import { sql } from '@vercel/postgres';  // Importing the sql function from @vercel/postgres
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

export async function GET({ url }) {
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    try {
        // Fetch paginated records
        const dataResult = await sql`
            SELECT * FROM inventario
            ORDER BY id
            LIMIT ${limit}
            OFFSET ${offset};
        `;

        // Count total records
        const countResult = await sql`
            SELECT COUNT(*) AS total FROM inventario;
        `;

        // Log countResult to see the structure
        console.log('The total rows in inventario table is: ', countResult.rows);

        // Convert total to an integer
        const totalRecords = parseInt(countResult.rows[0].total, 10);
        
        if (isNaN(totalRecords)) {
            throw new Error("Invalid total record count");
        }

        const totalPages = Math.ceil(totalRecords / limit);

        // Return JSON response
        return new Response(
            JSON.stringify({
                data: dataResult.rows,
                totalPages,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (error) {
        console.error('Error fetching data:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}


export async function DELETE({ locals }) {
  // Check if the user is authenticated and has the correct role
  const user = locals?.userId; //
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

    return successResponse(null, 'All rows deleted successfully.');
  } catch (error) {
    console.error('Error deleting rows:', error);
    return errorResponse(500, 'DELETE_ERROR', 'Failed to delete rows.', error.message);
  }
}
