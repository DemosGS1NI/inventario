// src/lib/database.js
// Environment-aware database adapter using @vercel/postgres with query caching
import dotenv from 'dotenv';
import { sql as vercelSql } from '@vercel/postgres';

// Cache configuration
const CACHE_CONFIG = {
	TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
	MAX_SIZE: 100, // Maximum number of cached queries
	ENABLED: true // Toggle caching on/off
};

// Cache implementation
class QueryCache {
	constructor() {
		this.cache = new Map();
		this.timestamps = new Map();
	}

	generateKey(query, params) {
		// Normalize query by removing extra whitespace and converting to lowercase
		const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');

		// Handle parameters more carefully
		let paramKey = '';
		if (params && params.length > 0) {
			// Convert each parameter to a string representation
			const paramStrings = params.map((param) => {
				if (param === null) return 'null';
				if (param === undefined) return 'undefined';
				if (typeof param === 'string') return `"${param}"`; // Preserve string values exactly
				return String(param);
			});
			paramKey = paramStrings.join('|');
		}

		return `${normalizedQuery}:${paramKey}`;
	}

	get(query, params) {
		if (!CACHE_CONFIG.ENABLED) return null;

		const key = this.generateKey(query, params);
		const timestamp = this.timestamps.get(key);

		if (timestamp && Date.now() - timestamp < CACHE_CONFIG.TTL) {
			console.log('📦 Cache hit for query');
			return this.cache.get(key);
		}

		if (timestamp) {
			this.cache.delete(key);
			this.timestamps.delete(key);
		}

		return null;
	}

	set(query, params, result) {
		if (!CACHE_CONFIG.ENABLED) return;

		const key = this.generateKey(query, params);

		if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
			const oldestKey = this.timestamps.entries().reduce((a, b) => (a[1] < b[1] ? a : b))[0];
			this.cache.delete(oldestKey);
			this.timestamps.delete(oldestKey);
		}

		this.cache.set(key, result);
		this.timestamps.set(key, Date.now());
		console.log('💾 Cached query result');
	}

	invalidateTable(tableName) {
		const normalizedTableName = tableName.toLowerCase();
		let invalidatedCount = 0;

		for (const [key] of this.cache) {
			if (key.toLowerCase().includes(normalizedTableName)) {
				this.cache.delete(key);
				this.timestamps.delete(key);
				invalidatedCount++;
			}
		}
		console.log(`🗑️ Invalidated ${invalidatedCount} cache entries for table: ${tableName}`);
	}

	clear() {
		const size = this.cache.size;
		this.cache.clear();
		this.timestamps.clear();
		console.log(`🧹 Cache cleared (${size} entries removed)`);
	}
}

// Helper function to detect modified tables in a query
function detectModifiedTables(query) {
	const normalizedQuery = query.trim().toLowerCase();
	const modifiedTables = new Set();

	// Check for UPDATE statements
	if (normalizedQuery.startsWith('update')) {
		const match = normalizedQuery.match(/update\s+([^\s,;]+)/i);
		if (match) {
			modifiedTables.add(match[1]);
		}
	}

	// Check for INSERT statements
	if (normalizedQuery.startsWith('insert')) {
		const match = normalizedQuery.match(/insert\s+into\s+([^\s,;]+)/i);
		if (match) {
			modifiedTables.add(match[1]);
		}
	}

	// Check for DELETE statements
	if (normalizedQuery.startsWith('delete')) {
		const match = normalizedQuery.match(/delete\s+from\s+([^\s,;]+)/i);
		if (match) {
			modifiedTables.add(match[1]);
		}
	}

	return Array.from(modifiedTables);
}

let connectionInfo = {};
const queryCache = new QueryCache();

// Initialize single client using @vercel/postgres everywhere
async function initializeDatabase() {
	if (!process.env.POSTGRES_URL) {
		throw new Error('POSTGRES_URL environment variable is required');
	}

	const dbClient = async function (strings, ...values) {
		if (!Array.isArray(strings)) {
			throw new Error('sql must be used as a tagged template: sql`...`');
		}

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

		const normalized = query.trim().toLowerCase();
		const isCacheable =
			normalized.startsWith('select') &&
			!normalized.includes('now()') &&
			!normalized.includes('current_timestamp');

		if (isCacheable) {
			const cachedResult = queryCache.get(query, params);
			if (cachedResult) return cachedResult;
		}

		try {
			const result = await vercelSql(strings, ...values);
			const formattedResult = { rows: result.rows, rowCount: result.rowCount };

			if (isCacheable) {
				queryCache.set(query, params, formattedResult);
			} else {
				const modifiedTables = detectModifiedTables(query);
				modifiedTables.forEach((table) => queryCache.invalidateTable(table));
			}

			return formattedResult;
		} catch (error) {
			console.error('🔴 SQL Query Error:', error.message);
			console.error('Query:', query);
			console.error('Params:', params);
			throw error;
		}
	};

	dbClient.invalidateCache = async (tableName) => {
		queryCache.invalidateTable(tableName);
	};

	connectionInfo = {
		environment: process.env.NODE_ENV || 'production',
		type: 'neon',
		status: 'connected'
	};

	console.log('✅ Database initialized with @vercel/postgres');
	return dbClient;
}

const sql = await initializeDatabase();

export { sql, connectionInfo };

export async function shutdownDatabase() {
	// No persistent pool to close with @vercel/postgres
	console.log('🛑 shutdownDatabase called (no-op for vercel/postgres)');
}
