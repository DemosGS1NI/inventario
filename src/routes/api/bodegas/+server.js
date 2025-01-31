import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const GET = async () => {
  try {
    // Log the connection string for debugging
    console.log('Connection String:', process.env.POSTGRES_URL);

    // Query to fetch distinct bodega names
    const { rows } = await sql`
      SELECT DISTINCT bodega
      FROM inventario;
    `;

    // Extract the bodega names into an array
    const bodegas = rows.map((row) => row.bodega);

    // Return the standardized success response
    console.log('fetching bodegas', bodegas);
    return successResponse(bodegas, 'Bodegas fetched successfully');
  } catch (error) {
    console.error('Full Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });

    // Return a standardized error response
    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch bodegas',
      error.message
    );
  }
};