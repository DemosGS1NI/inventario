// src/lib/environment.js
import { building } from '$app/environment';

export function validateEnvironment() {
	if (building) {
		console.warn('⚠️ Skipping environment validation during build');
		return;
	}

	const required = ['JWT_SECRET', 'POSTGRES_URL'];
	const missing = [];

	for (const envVar of required) {
		if (!process.env[envVar]) {
			missing.push(envVar);
		}
	}

	if (missing.length > 0) {
		console.error('🚨 Missing required environment variables:');
		missing.forEach((envVar) => console.error(`  - ${envVar}`));
		console.error('\nPlease add these to your .env file');
		throw new Error(`Missing environment variables: ${missing.join(', ')}`);
	}

	console.log('✅ Environment validation passed');
}
