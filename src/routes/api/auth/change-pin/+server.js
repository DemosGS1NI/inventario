import bcrypt from 'bcrypt';
import { sql } from '$lib/database';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { json } from '@sveltejs/kit';
import { AUTH } from '$lib/constants.js';

dotenv.config();

export async function POST({ request, locals }) {
	try {
		// Retrieve data from the request body
		const { newPin, confirmNewPin } = await request.json();

		// Get user ID from session
		const userId = locals.user?.userId;

		if (!userId) {
			console.error('Unauthorized: User session not found');
			return errorResponse(json, 401, 'UNAUTHORIZED', 'User session not found');
		}

		console.log('Updating PIN for user ID:', userId);

		// Validate PINs
		if (!newPin || !confirmNewPin) {
			console.error('Missing newPin or confirmNewPin in request body');
			return errorResponse(
				json,
				400,
				'VALIDATION_ERROR',
				'Both newPin and confirmNewPin are required'
			);
		}

		if (newPin !== confirmNewPin) {
			console.error('PINs do not match');
			return errorResponse(json, 400, 'VALIDATION_ERROR', 'PINs do not match');
		}

		// Hash the new PIN
		console.log('Hashing the new PIN...');
		const hashedPin = await bcrypt.hash(newPin, AUTH.BCRYPT_ROUNDS);

		// Update the user's PIN in the database
		console.log('Executing SQL query to update PIN...');
		const result = await sql`
      UPDATE usuarios 
      SET pin_hash = ${hashedPin}, debe_cambiar_pin = false 
      WHERE id = ${userId}
      RETURNING id, numero_telefono
    `;

		console.log('Updated rows:', result.rowCount);

		if (result.rowCount === 0) {
			console.error('No rows updated. User ID may not exist.');
			return errorResponse(json, 404, 'NOT_FOUND', 'User not found or PIN update failed');
		}

		// Log successful PIN change (without sensitive data)
		console.log(`PIN updated successfully for user ${result.rows[0].numero_telefono}`);

		return successResponse(json, null, 'PIN cambiado satisfactoriamente');
	} catch (error) {
		console.error('Error during PIN change:', error);
		return errorResponse(json, statusCode, 'INTERNAL_SERVER_ERROR', errorMessage, errorDetails);
	}
}
