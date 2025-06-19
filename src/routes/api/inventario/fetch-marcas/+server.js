import { json } from '@sveltejs/kit';
import { sql } from '$lib/database.js';

export async function GET({ url }) {
	console.log('🔍 [fetch-marcas] Received request');
	const bodega = url.searchParams.get('bodega');
	const ubicacion = url.searchParams.get('ubicacion');

	if (!bodega) {
		console.log('⚠️ [fetch-marcas] Missing required parameter: bodega');
		return json({
			status: 'error',
			message: 'Bodega is required'
		}, { status: 400 });
	}

	console.log('✅ [fetch-marcas] Using parameters:', { bodega, ubicacion });

	try {
		let result;
		if (ubicacion) {
			// If ubicacion is provided, filter by both bodega and ubicacion
			console.log('🔍 [fetch-marcas] Executing query with bodega and ubicacion:', { bodega, ubicacion });
			result = await sql`
				SELECT DISTINCT marca
				FROM inventario
				WHERE bodega = ${bodega}
				AND ubicacion = ${ubicacion}
				AND marca IS NOT NULL
				ORDER BY marca ASC
			`;
		} else {
			// If only bodega is provided, get all marcas for that bodega
			console.log('🔍 [fetch-marcas] Executing query with bodega only:', { bodega });
			result = await sql`
				SELECT DISTINCT marca
				FROM inventario
				WHERE bodega = ${bodega}
				AND marca IS NOT NULL
				ORDER BY marca ASC
			`;
		}
		
		console.log('✅ [fetch-marcas] Query executed successfully:', { 
			rowCount: result.rows?.length,
			firstRow: result.rows?.[0]
		});

		return json({
			status: 'success',
			data: result.rows.map(row => row.marca)
		});
	} catch (error) {
		console.error('❌ [fetch-marcas] Database error:', error);
		return json({
			status: 'error',
			message: 'Error fetching marcas: ' + error.message
		}, { status: 500 });
	}
}