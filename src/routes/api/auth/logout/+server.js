import jwt from 'jsonwebtoken';
import { jwtConfig } from '$lib/jwt';
import { revokeToken } from '$lib/services/tokenService';
import { successResponse, errorResponse } from '$lib/responseUtils';

export async function POST({ cookies }) {
	const token = cookies.get(jwtConfig.cookie.name);

	if (!token) {
		return errorResponse(400, 'NO_TOKEN', 'No active session found to log out.');
	}

	try {
		// Verify and decode the token to get its claims
		// We need the jti and exp claims to revoke it properly
		const payload = jwt.verify(token, jwtConfig.secret, jwtConfig.getVerifyOptions());

		// Revoke the token if it has a jti (token ID)
		if (payload.jti && payload.exp) {
			await revokeToken(payload.jti, payload.exp);
			console.log(`Token ${payload.jti} revoked for user ${payload.userId}`);
		}

		// Invalidate the JWT by removing it from the cookies
		cookies.delete(jwtConfig.cookie.name, { path: jwtConfig.cookie.path });

		// Also send a cookie deletion header to ensure the cookie is cleared
		return successResponse(null, 'Logout successful', {
			headers: {
				'Set-Cookie': `${jwtConfig.cookie.name}=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0`
			}
		});
	} catch (error) {
		console.error('Error during logout:', error);

		// Even if token verification fails, we should still clear the cookie
		cookies.delete(jwtConfig.cookie.name, { path: jwtConfig.cookie.path });

		// If it's a JWT error, the token might be invalid but we should still "succeed" the logout
		if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
			return successResponse(null, 'Logout successful (invalid token cleared)', {
				headers: {
					'Set-Cookie': `${jwtConfig.cookie.name}=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0`
				}
			});
		}

		return errorResponse(
			500,
			'INTERNAL_SERVER_ERROR',
			'Failed to log out due to a server error.',
			error.message
		);
	}
}
