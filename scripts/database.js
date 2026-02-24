// scripts/database.js
// Standalone database connection for scripts (without SvelteKit dependencies)
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let pool;
let dbClient;

// Check if we're in development by environment variable
const isDev = process.env.NODE_ENV !== 'production';

async function initializeDatabase() {
	// Validate POSTGRES_URL exists
	if (!process.env.POSTGRES_URL) {
		throw new Error('POSTGRES_URL environment variable is required');
	}

	if (isDev) {
		// Development: Use pg with local PostgreSQL
		console.log('🔧 Initializing LOCAL database connection...');

		const { Pool } = await import('pg');

		const connectionConfig = {
			connectionString: process.env.POSTGRES_URL,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000,
			allowExitOnIdle: true,
			ssl: { rejectUnauthorized: false }
		};

		pool = new Pool(connectionConfig);

		// Test connection
		try {
			const testResult = await pool.query('SELECT 1 as test, NOW() as timestamp');
			console.log('✅ Local database connected successfully');
		} catch (error) {
			console.error('❌ Local database connection failed:', error.message);
			throw new Error(`Local database connection failed: ${error.message}`);
		}

		// Create sql function that mimics @vercel/postgres template literal syntax
		dbClient = async function (strings, ...values) {
			if (Array.isArray(strings)) {
				let query = '';
				const params = [];

				for (let i = 0; i < strings.length; i++) {
					query += strings[i];
					if (i < values.length) {
						const value = values[i];
						if (value && typeof value === 'object' && value.__unsafe) {
							query += value.__unsafe;
						} else {
							params.push(value);
							query += `$${params.length}`;
						}
					}
				}

				try {
					const result = await pool.query(query, params);
					return {
						rows: result.rows,
						rowCount: result.rowCount
					};
				} catch (error) {
					console.error('🔴 SQL Query Error:', error.message);
					console.error('Query:', query);
					console.error('Params:', params);
					throw error;
				}
			}

			const result = await pool.query(strings, values);
			return {
				rows: result.rows,
				rowCount: result.rowCount
			};
		};

		// Add query method for compatibility
		dbClient.query = async (text, params = []) => {
			try {
				const result = await pool.query(text, params);
				return {
					rows: result.rows,
					rowCount: result.rowCount
				};
			} catch (error) {
				console.error('🔴 SQL Query Error:', error.message);
				console.error('Query:', text);
				console.error('Params:', params);
				throw error;
			}
		};
	} else {
		// Production: Use @vercel/postgres
		console.log('🚀 Initializing PRODUCTION database connection...');

		try {
			const vercelPg = await import('@vercel/postgres');
			dbClient = vercelPg.sql;

			const testResult = await dbClient`SELECT 1 as test, NOW() as timestamp`;
			console.log('✅ Production database connected successfully');
		} catch (error) {
			console.error('❌ Production database connection failed:', error.message);
			throw new Error(`Production database connection failed: ${error.message}`);
		}
	}

	// Add graceful shutdown method
	dbClient.end = async () => {
		if (isDev && pool) {
			console.log('🔄 Closing local database pool...');
			await pool.end();
			console.log('✅ Local database pool closed');
		}
	};

	return dbClient;
}

// Create and export the database client
const db = await initializeDatabase();
export { db as sql };
