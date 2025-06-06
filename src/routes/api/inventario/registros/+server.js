import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// GET Endpoint - Fetch Product Details
/**
 * Retrieves inventory records for a specific bodega, marca, and ubicacion
 * @param {Object} params - Request parameters
 * @param {URL} params.url - Request URL with search parameters
 * @returns {Promise<Response>} JSON response with inventory records
 */
export async function GET({ url }) {
  const bodega = url.searchParams.get('bodega');
  const marca = url.searchParams.get('marca');
  const ubicacion = url.searchParams.get('ubicacion');

  // Validate query parameters
  if (!bodega || !marca || !ubicacion) {
    return errorResponse(400, 'BAD_REQUEST', 'Bodega, Marca, and Ubicacion are required');
  }

  try {
    // Fetch product details
    const result = await sql`
      SELECT 
        i.*, u.nombre, u.apellido
      FROM inventario i LEFT join usuarios u on i.actualizado_por = u.id
      WHERE 
        i.bodega = ${bodega} AND 
        i.marca = ${marca} AND 
        i.ubicacion = ${ubicacion}
    `;

    if (result.rows.length > 0) {
      return successResponse(result.rows, 'Product fetched successfully');
    } else {
      return errorResponse(404, 'NOT_FOUND', 'Product not found');
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error fetching product', error.message);
  }
}

// PUT Endpoint - Update Product Details
/**
 * Updates inventory records with physical count and incident information
 * @param {Object} params - Request parameters
 * @param {Request} params.request - HTTP request object
 * @param {Object} params.locals - Local variables including user session
 * @returns {Promise<Response>} JSON response confirming update
 */
export async function PUT({ request, locals }) {

  //get the session user id
  const userId = locals.user?.userId; // Get the user ID from session
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  

  try {
    const {
      bodega,
      ubicacion,
      marca,
      codigo_barras,
      inventario_fisico,
      categoria_incidencia,
      incidencia,
     } = await request.json();

    // Validate required fields
    if (!bodega || !marca || !ubicacion) {
      return errorResponse(400, 'BAD_REQUEST', 'Bodega, Marca, and Codigo de Barras are required');
    }

    console.log('Updating product:', { bodega, ubicacion, marca,  userId });

    const currentDateTime = new Date().toISOString();

    // Update product details
    const result = await sql`
      UPDATE inventario
      SET 
        ubicacion = ${ubicacion},
        inventario_fisico = ${inventario_fisico},
        fecha_inventario = ${currentDateTime},
        categoria_incidencia = ${categoria_incidencia},
        incidencia = ${incidencia},
        actualizado_por = ${userId}
      WHERE 
        bodega = ${bodega} AND 
        marca = ${marca} AND 
        codigo_barras = ${codigo_barras}
    `;

    if (result.rowCount > 0) {
      return successResponse(null, 'Product updated successfully');
    } else {
      return errorResponse(404, 'NOT_FOUND', 'Product not found or no changes made');
    }
  } catch (error) {
    console.error('Error updating product:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error updating product', error.message);
  }
}
