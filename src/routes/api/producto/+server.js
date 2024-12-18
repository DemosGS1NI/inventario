import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// GET Endpoint - Fetch Product Details
export async function GET({ url }) {
  const bodega = url.searchParams.get('bodega');
  const marca = url.searchParams.get('marca');
  const codigoBarras = url.searchParams.get('codigo_barras');

  // Validate query parameters
  if (!bodega || !marca || !codigoBarras) {
    return errorResponse(400, 'BAD_REQUEST', 'Bodega, Marca, and Codigo de Barras are required');
  }

  try {
    // Fetch product details
    const result = await sql`
      SELECT 
        numero_parte, descripcion, inventario_fisico, fecha_inventario, categoria_incidencia, incidencia
      FROM inventario
      WHERE 
        bodega = ${bodega} AND 
        marca = ${marca} AND 
        codigo_barras = ${codigoBarras}
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
export async function PUT({ request }) {
  try {
    const {
      bodega,
      ubicacion,
      marca,
      codigo_barras,
      inventario_fisico,
      categoria_incidencia,
      incidencia,
      actualizado_por,
    } = await request.json();

    // Validate required fields
    if (!bodega || !marca || !codigo_barras) {
      return errorResponse(400, 'BAD_REQUEST', 'Bodega, Marca, and Codigo de Barras are required');
    }

    console.log('Updating product:', { bodega, ubicacion, marca, codigo_barras });

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
        actualizado_por = ${actualizado_por}
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
