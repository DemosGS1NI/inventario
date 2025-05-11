import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

dotenv.config();

export async function PUT({ request, locals }) {

      //get the session user id
  const userId = locals.user?.userId; // Get the user ID from session
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }


  try {
    const { id, validado_por } = await request.json();


    console.log(id, userId);
    
    // Validate input
    if (!id || !userId) {
      return errorResponse(400, 'INVALID_INPUT', 'Invalid or missing input data');
    }

    // Update the record in the database
    const result = await sql`
      UPDATE inventario
      SET 
        validado = true, 
        validado_por = ${userId}
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.rowCount === 0) {
      return errorResponse(404, 'RECORD_NOT_FOUND', 'Record not found');
    }

    return successResponse(
      { record: result.rows[0] },
      'Record validated successfully'
    );
  } catch (error) {
    console.error('Error validating record:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'An error occurred while validating the record', error.message);
  }
}
