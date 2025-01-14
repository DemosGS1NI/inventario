import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// GET Endpoint - Fetch Product Details
export async function GET({ url, locals }) {
  const bodega = url.searchParams.get('bodega');
  const marca = url.searchParams.get('marca');
  const codigoBarras = url.searchParams.get('codigo_barras');

  // Debug logging
  //console.log('API received parameters:', {bodega, marca, codigoBarras });

  // Get user ID from session
  const userId = locals.user?.userId;
   
  if (!userId) {
    console.error('Unauthorized: User session not found');
    return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
  }

  // Validate query parameters
  if (!bodega || !marca || !codigoBarras) {
    return errorResponse(400, 'BAD_REQUEST', 'Bodega, Marca, and Codigo de Barras are required');
  }

  try {
  
    // Your original query with logging
    const result = await sql`
      SELECT 
        codigo_barras, numero_parte, descripcion, inventario_sistema, 
        inventario_fisico, fecha_inventario::TEXT AS fecha_inventario, 
        categoria_incidencia, incidencia
      FROM inventario
      WHERE 
        bodega = ${bodega} AND 
        marca = ${marca} AND 
        codigo_barras = ${codigoBarras}
      UNION
      SELECT 
        codigo_barras, numero_parte, descripcion, inventario_sistema, 
        inventario_fisico, fecha_inventario::TEXT AS fecha_inventario, 
        categoria_incidencia, incidencia
      FROM inventario
      WHERE 
        bodega = ${bodega} AND 
        marca = ${marca} AND 
        numero_parte = ${codigoBarras}
    `;
    
    //console.log('Query results:', result.rows);

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
// PUT Endpoint - Update Product Details
export async function PUT({ request, locals }) {
  const userId = locals.user?.userId;
  if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
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
      if (!bodega || !marca || !codigo_barras) {
          return errorResponse(400, 'BAD_REQUEST', 'Bodega, Marca, and Codigo de Barras are required');
      }

      // Create the current date
      const now = new Date();
     // Create a date string that properly handles timezone
     const currentDateTime = now.toLocaleString('en-US', { 
         timeZone: 'America/Guatemala',  // or your specific timezone
         year: 'numeric',
         month: '2-digit',
         day: '2-digit',
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit',
         hour12: false  // Use 24-hour format for storage
      }).replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');

      // Update product details - now checking both codigo_barras and numero_parte
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
              (codigo_barras = ${codigo_barras} OR numero_parte = ${codigo_barras})
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