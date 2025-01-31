// src/routes/api/fetch-marcas/+server.js
import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function GET({ url, locals }) {
    // Get user ID from session for security
    const userId = locals.user?.userId;
    if (!userId) {
        console.error('Unauthorized: User session not found');
        return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
    }

    // Get query parameters
    const bodega = url.searchParams.get('bodega');
    const ubicacion = url.searchParams.get('ubicacion');

    // Debug logging
    console.log('API received parameters:', { bodega, ubicacion });

    // Validate required parameters
    if (!bodega || !ubicacion) {
        return errorResponse(400, 'BAD_REQUEST', 'Bodega and Ubicacion are required');
    }

    try {
        // Query to get unique marcas for the given bodega and ubicacion
        const result = await sql`
            SELECT DISTINCT marca 
            FROM inventario 
            WHERE bodega = ${bodega} 
            AND ubicacion = ${ubicacion}
            ORDER BY marca
        `;

        // Debug logging
        console.log('Query results:', result.rows);
        
        // Extract marcas from the result
        const marcas = result.rows.map(row => row.marca);

        return successResponse(marcas, 'Marcas fetched successfully');
    } catch (error) {
        console.error('Error fetching marcas:', error);
        return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error fetching marcas', error.message);
    }
}