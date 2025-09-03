import jwt from 'jsonwebtoken';
import { jwtConfig } from '$lib/jwt';
import { isTokenRevoked } from '$lib/services/tokenService';
import { validateEnvironment } from '$lib/environment'; // Clear what this validates

// Validate environment on startup
validateEnvironment();

export async function handle({ event, resolve }) {
	// Handle Chrome DevTools requests
	if (event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(null, { status: 204 });
	}

	const token = event.cookies.get(jwtConfig.cookie.name);

	if (token) {
		try {
			// Verify the token with the shared configuration
			const user = jwt.verify(token, jwtConfig.secret, jwtConfig.getVerifyOptions());

			// Check if token has been revoked
			if (user.jti && (await isTokenRevoked(user.jti))) {
				console.log('Revoked token detected, clearing cookie');
				// Clear the revoked token cookie
				event.cookies.delete(jwtConfig.cookie.name, { path: jwtConfig.cookie.path });
				// Don't set user data - treat as unauthenticated
				return resolve(event);
			}

			// Token is valid and not revoked - set user data
			event.locals.user = {
				userId: user.userId,
				userName: user.userName,
				userRole: user.userRole,
				tokenId: user.jti
			};
		} catch (error) {
			// Handle different types of JWT errors
			if (error.name === 'TokenExpiredError') {
				console.log('Token expired');
				// Clear the expired token
				event.cookies.delete(jwtConfig.cookie.name, { path: jwtConfig.cookie.path });
			} else if (error.name === 'JsonWebTokenError') {
				console.log('Invalid token');
				// Clear the invalid token
				event.cookies.delete(jwtConfig.cookie.name, { path: jwtConfig.cookie.path });
			} else {
				console.error('JWT verification error:', error.message);
			}
		}
	}

	// Only log in development and check if user exists
	if (process.env.NODE_ENV === 'development' && event.locals.user) {
		console.log('User authenticated:', event.locals.user.userId);
	}

	const response = await resolve(event);

	// Security headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'same-origin');
	// Uncomment and set your allowed origin for CORS if needed:
	// response.headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com');
	// response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
	// response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	return response;
}

// Global error handlers for unhandled promise rejections and uncaught exceptions
if (typeof process !== 'undefined' && process.on) {
	process.on('unhandledRejection', (reason, promise) => {
		console.error('Unhandled Rejection:', reason);
	});
	process.on('uncaughtException', (err) => {
		console.error('Uncaught Exception:', err);
		process.exit(1); // Optional: exit to avoid unknown state
	});
}
