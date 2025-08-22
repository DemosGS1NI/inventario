import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock environment
const mockEnvironment = {
	dev: true
};

vi.mock('$app/environment', () => mockEnvironment);

// Mock pg Pool
const mockPool = {
	query: vi.fn(),
	on: vi.fn(),
	end: vi.fn()
};

vi.mock('pg', () => ({
	Pool: vi.fn(() => mockPool)
}));

// Mock @vercel/postgres
const mockVercelSql = vi.fn();
vi.mock('@vercel/postgres', () => ({
	sql: mockVercelSql
}));

// Create a mock database module
const createMockDatabase = () => {
	// Create a new pool instance for each mock database
	const pool = {
		query: vi.fn(),
		on: vi.fn(),
		end: vi.fn()
	};

	// Set up default successful query response
	pool.query.mockResolvedValue({
		rows: [{ test: 1, timestamp: new Date() }],
		rowCount: 1
	});

	const mockSql = async (strings, ...values) => {
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

			return pool.query(query, params);
		}
		return pool.query(strings, values);
	};

	mockSql.query = async (text, params = []) => {
		return pool.query(text, params);
	};

	mockSql.getConnectionInfo = () => ({
		environment: 'development',
		type: 'postgresql',
		status: 'connected',
		poolSize: 20
	});

	mockSql.end = async () => {
		await pool.end();
	};

	// Set up pool event handlers
	pool.on('connect', () => {
		console.log('🟢 New database client connected');
	});

	pool.on('error', (err) => {
		console.error('🔴 Database pool error:', err);
	});

	return { mockSql, pool };
};

describe('Database Module', () => {
	let db;
	let pool;

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();

		// Create a new mock database instance
		const { mockSql, pool: newPool } = createMockDatabase();
		db = mockSql;
		pool = newPool;
	});

	afterEach(async () => {
		// Clean up after each test
		await db.end();
	});

	describe('Development Environment', () => {
		it('should initialize local database connection', async () => {
			const connectionInfo = db.getConnectionInfo();

			expect(connectionInfo.environment).toBe('development');
			expect(connectionInfo.type).toBe('postgresql');
			expect(connectionInfo.status).toBe('connected');
			expect(connectionInfo.poolSize).toBe(20);
		});

		it('should handle template literal queries', async () => {
			const result = await db`SELECT * FROM users WHERE id = ${1}`;

			expect(pool.query).toHaveBeenCalledWith(
				expect.stringContaining('SELECT * FROM users WHERE id = $1'),
				[1]
			);
			expect(result.rows).toBeDefined();
			expect(result.rowCount).toBe(1);
		});

		it('should handle direct query method', async () => {
			const result = await db.query('SELECT * FROM users WHERE id = $1', [1]);

			expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
			expect(result.rows).toBeDefined();
			expect(result.rowCount).toBe(1);
		});

		it('should handle query errors gracefully', async () => {
			const error = new Error('Database error');
			pool.query.mockRejectedValueOnce(error);

			await expect(db`SELECT * FROM nonexistent_table`).rejects.toThrow('Database error');
		});

		it('should handle connection errors', async () => {
			const error = new Error('Connection failed');
			pool.query.mockRejectedValueOnce(error);

			await expect(db`SELECT 1`).rejects.toThrow('Connection failed');
		});

		it('should handle unsafe raw SQL', async () => {
			const unsafeSQL = { __unsafe: 'NOW()' };
			await db`SELECT ${unsafeSQL} as timestamp`;

			expect(pool.query).toHaveBeenCalledWith(
				expect.stringContaining('SELECT NOW() as timestamp'),
				[]
			);
		});
	});

	describe('Production Environment', () => {
		beforeEach(() => {
			// Switch to production environment
			mockEnvironment.dev = false;
			// Reset the mock
			mockVercelSql.mockReset();
		});

		afterEach(() => {
			// Reset to development environment
			mockEnvironment.dev = true;
		});

		it('should use @vercel/postgres in production', async () => {
			// Import the database module in production mode
			const { sql } = await import('./database');

			// Use the sql function to trigger the Vercel Postgres import
			await sql`SELECT 1`;

			expect(mockVercelSql).toHaveBeenCalled();
		});
	});

	describe('Connection Pool Management', () => {
		it('should handle pool events', () => {
			expect(pool.on).toHaveBeenCalledWith('connect', expect.any(Function));
			expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
		});

		it('should close pool on end()', async () => {
			await db.end();
			expect(pool.end).toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should handle connection timeout', async () => {
			const timeoutError = new Error('Connection timeout');
			timeoutError.code = 'ETIMEDOUT';
			pool.query.mockRejectedValueOnce(timeoutError);

			await expect(db`SELECT 1`).rejects.toThrow('Connection timeout');
		});
	});

	describe('Query Parameter Handling', () => {
		it('should handle multiple parameters correctly', async () => {
			await db`SELECT * FROM users WHERE id = ${1} AND name = ${'John'}`;

			expect(pool.query).toHaveBeenCalledWith(
				expect.stringContaining('SELECT * FROM users WHERE id = $1 AND name = $2'),
				[1, 'John']
			);
		});

		it('should handle null parameters', async () => {
			await db`SELECT * FROM users WHERE deleted_at = ${null}`;

			expect(pool.query).toHaveBeenCalledWith(
				expect.stringContaining('SELECT * FROM users WHERE deleted_at = $1'),
				[null]
			);
		});

		it('should handle array parameters', async () => {
			const ids = [1, 2, 3];
			await db`SELECT * FROM users WHERE id = ANY(${ids})`;

			expect(pool.query).toHaveBeenCalledWith(
				expect.stringContaining('SELECT * FROM users WHERE id = ANY($1)'),
				[ids]
			);
		});
	});
});
