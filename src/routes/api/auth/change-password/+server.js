import bcrypt from 'bcrypt';
import { sql } from '$lib/database';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';
import { AUTH } from '$lib/constants.js';

dotenv.config();

export async function POST({ request, locals }) {
	try {
		// Retrieve data from the request body
		const { newPassword, confirmNewPassword } = await request.json();

		// Get user ID from session
		const userId = locals.user?.userId;

		if (!userId) {
			console.error('Unauthorized: User session not found');
			return errorResponse(401, 'UNAUTHORIZED', 'User session not found');
		}

		console.log('Updating password for user ID:', userId);

		// Validate passwords
		if (!newPassword || !confirmNewPassword) {
			console.error('Missing newPassword or confirmNewPassword in request body');
			return errorResponse(400, 'VALIDATION_ERROR', 'Both password fields are required');
		}

		if (newPassword !== confirmNewPassword) {
			console.error('Passwords do not match');
			return errorResponse(400, 'VALIDATION_ERROR', 'Las contraseñas no coinciden');
		}

		if (newPassword.length < 4 || newPassword.length > 100) {
			return errorResponse(400, 'VALIDATION_ERROR', 'La contraseña debe tener entre 4 y 100 caracteres');
		}

		// Hash the new password
		console.log('Hashing the new password...');
		const hashedPassword = await bcrypt.hash(newPassword, AUTH.BCRYPT_ROUNDS);

		// Update the user's password in the database (also mirror to pin_hash for backward compatibility)
		console.log('Executing SQL query to update password...');
		const result = await sql`
      UPDATE usuarios 
      SET password_hash = ${hashedPassword}, pin_hash = ${hashedPassword}, debe_cambiar_pin = false 
      WHERE id = ${userId}
      RETURNING id, username
    `;

		console.log('Updated rows:', result.rowCount);

		if (result.rowCount === 0) {
			console.error('No rows updated. User ID may not exist.');
			return errorResponse(404, 'NOT_FOUND', 'User not found or password update failed');
		}

		// Log successful password change (without sensitive data)
		console.log(`Password updated successfully for user ${result.rows[0].username}`);

		return successResponse({}, 'Contraseña cambiada satisfactoriamente');
	} catch (error) {
		console.error('Error during password change:', error);
		return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Error al cambiar la contraseña');
	}
}
