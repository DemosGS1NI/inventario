import { sql } from '$lib/database.js';
import { requireAuth } from '$lib/authMiddleware';
import { successResponse, errorResponse } from '$lib/responseUtils';

function validateFetchMarcasParams(bodega, ubicacion) {
	const errors = {};
	if (!bodega || typeof bodega !== 'string' || bodega.trim() === '') {
		errors.bodega = 'El parámetro "bodega" es requerido y debe ser un string no vacío';
	}
	if (ubicacion && typeof ubicacion !== 'string') {
		errors.ubicacion = 'El parámetro "ubicacion" debe ser un string';
	}
	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}

export async function GET({ url, locals }) {
	requireAuth(locals);

	const bodega = url.searchParams.get('bodega');
	const ubicacion = url.searchParams.get('ubicacion');

	const { isValid, errors } = validateFetchMarcasParams(bodega, ubicacion);
	if (!isValid) {
		return errorResponse(400, 'BAD_REQUEST', 'Parámetros inválidos', errors);
	}

	try {
		let result;
		if (ubicacion) {
			result = await sql`
				SELECT DISTINCT marca
				FROM inventario
				WHERE bodega = ${bodega}
				AND ubicacion = ${ubicacion}
				AND marca IS NOT NULL
				ORDER BY marca ASC
			`;
		} else {
			result = await sql`
				SELECT DISTINCT marca
				FROM inventario
				WHERE bodega = ${bodega}
				AND marca IS NOT NULL
				ORDER BY marca ASC
			`;
		}

		const marcas = result.rows.map((row) => row.marca);
		const message =
			marcas.length > 0
				? `Se encontraron ${marcas.length} marcas para la bodega "${bodega}"${ubicacion ? ` y ubicación "${ubicacion}"` : ''}`
				: `No hay marcas configuradas para la bodega "${bodega}"${ubicacion ? ` y ubicación "${ubicacion}"` : ''}`;

		return successResponse(marcas, message);
	} catch (error) {
		console.error('❌ [fetch-marcas] Database error:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error fetching marcas', error.message);
	}
}
