import { sql } from '@vercel/postgres';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { requireAuth } from '$lib/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();

/**
 * GET Progress Statistics
 * Returns progress tracking data for both current view and overall exercise
 */
export async function GET({ url, locals }) {
	requireAuth(locals);

	const bodega = url.searchParams.get('bodega');
	const marca = url.searchParams.get('marca');
	const ubicacion = url.searchParams.get('ubicacion');

	try {
		// Get overall exercise statistics (all inventory)
		const overallStats = await sql`
			SELECT 
				COUNT(*) as total_products,
				COUNT(CASE WHEN fecha_inventario IS NOT NULL THEN 1 END) as counted_products,
				COUNT(CASE WHEN validado = true THEN 1 END) as validated_products
			FROM inventario
		`;

		const overall = overallStats.rows[0];
		const overallData = {
			totalProducts: parseInt(overall.total_products),
			countedProducts: parseInt(overall.counted_products),
			validatedProducts: parseInt(overall.validated_products),
			percentageCounted: overall.total_products > 0 
				? Math.round((overall.counted_products / overall.total_products) * 100 * 10) / 10 
				: 0,
			percentageValidated: overall.total_products > 0 
				? Math.round((overall.validated_products / overall.total_products) * 100 * 10) / 10 
				: 0
		};

		// Get current view statistics (filtered by selection)
		let currentViewData = null;
		
		if (bodega && marca && ubicacion) {
			const currentStats = await sql`
				SELECT 
					COUNT(*) as total_products,
					COUNT(CASE WHEN fecha_inventario IS NOT NULL THEN 1 END) as counted_products,
					COUNT(CASE WHEN validado = true THEN 1 END) as validated_products
				FROM inventario
				WHERE bodega = ${bodega} AND marca = ${marca} AND ubicacion = ${ubicacion}
			`;

			const current = currentStats.rows[0];
			currentViewData = {
				totalProducts: parseInt(current.total_products),
				countedProducts: parseInt(current.counted_products),
				validatedProducts: parseInt(current.validated_products),
				percentageCounted: current.total_products > 0 
					? Math.round((current.counted_products / current.total_products) * 100 * 10) / 10 
					: 0,
				percentageValidated: current.total_products > 0 
					? Math.round((current.validated_products / current.total_products) * 100 * 10) / 10 
					: 0
			};
		}

		// Get additional summary statistics
		const summaryStats = await sql`
			SELECT 
				COUNT(DISTINCT bodega) as total_bodegas,
				COUNT(DISTINCT CONCAT(bodega, '|', ubicacion)) as total_ubicaciones,
				COUNT(DISTINCT CONCAT(bodega, '|', ubicacion, '|', marca)) as total_locations,
				COUNT(CASE WHEN fecha_inventario IS NOT NULL AND validado = false THEN 1 END) as pending_validation
			FROM inventario
		`;

		const summary = summaryStats.rows[0];
		const additionalStats = {
			totalBodegas: parseInt(summary.total_bodegas),
			totalUbicaciones: parseInt(summary.total_ubicaciones),
			totalLocations: parseInt(summary.total_locations),
			pendingValidation: parseInt(summary.pending_validation)
		};

		return successResponse({
			overallExercise: overallData,
			currentView: currentViewData,
			summary: additionalStats,
			lastUpdated: new Date().toISOString()
		}, 'Progress statistics retrieved successfully');

	} catch (error) {
		console.error('Error fetching progress statistics:', error);
		return errorResponse(
			500, 
			'INTERNAL_SERVER_ERROR', 
			'Error fetching progress statistics', 
			error.message
		);
	}
}