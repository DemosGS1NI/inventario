#!/usr/bin/env node
// Lightweight migration runner that loads .env and runs node-pg-migrate with the Neon URL
import 'dotenv/config';
import pgmigrate from 'node-pg-migrate';

const direction = process.argv[2] || 'up';

async function main() {
	const url = process.env.POSTGRES_URL;
	if (!url) {
		console.error('POSTGRES_URL is required (set it in .env)');
		process.exit(1);
	}

	console.log(`Running migrations: ${direction}`);
	console.log(`Using database: ${mask(url)}`);

	await pgmigrate({
		direction,
		databaseUrl: url,
		dir: 'migrations',
		migrationsTable: 'pgmigrations',
		verbose: true,
		// Use SQL files instead of JS
		sqlFile: true
	});

	console.log('Migrations completed');
}

function mask(url) {
	return url.replace(/:[^:@/]+@/, ':****@');
}

main().catch((err) => {
	console.error('Migration failed:', err.message || err);
	process.exit(1);
});
