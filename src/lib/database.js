// src/lib/database.js
// Environment-aware database adapter with connection pooling and query caching
import { dev } from '$app/environment';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Cache configuration
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000,  // 5 minutes in milliseconds
  MAX_SIZE: 100,       // Maximum number of cached queries
  ENABLED: true        // Toggle caching on/off
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
    
    // Create a stable key that ignores parameter order
    const paramKey = params ? JSON.stringify(params.sort()) : '';
    
    return `${normalizedQuery}:${paramKey}`;
  }

  get(query, params) {
    if (!CACHE_CONFIG.ENABLED) return null;

    const key = this.generateKey(query, params);
    const timestamp = this.timestamps.get(key);
    
    if (timestamp && (Date.now() - timestamp < CACHE_CONFIG.TTL)) {
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
      const oldestKey = this.timestamps.entries()
        .reduce((a, b) => a[1] < b[1] ? a : b)[0];
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

let pool;
let connectionInfo = {};
const queryCache = new QueryCache();

// Initialize based on environment
async function initializeDatabase() {
  // Validate POSTGRES_URL exists
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is required');
  }

  let dbClient;

  if (dev) {
    // Development: Use pg with local PostgreSQL
    console.log('🔧 Initializing LOCAL database connection...');
    
    const { Pool } = await import('pg');
    
    // Connection configuration for local development
    const connectionConfig = {
      connectionString: process.env.POSTGRES_URL,
      // Connection pool settings for local development
      max: 20,                    // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Return error after 5 seconds if connection fails
      allowExitOnIdle: true,      // Allow the pool to close when no queries are running
      ssl: false                  // Disable SSL for local development
    };
    
    pool = new Pool(connectionConfig);
    
    // Connection event handlers for monitoring
    pool.on('connect', (client) => {
      console.log('🟢 New database client connected');
    });
    
    pool.on('error', (err, client) => {
      console.error('🔴 Database pool error:', err);
    });
    
    // Test connection
    try {
      const testResult = await pool.query('SELECT 1 as test, NOW() as timestamp');
      console.log('✅ Local database connected successfully');
      connectionInfo = {
        environment: 'development',
        type: 'postgresql',
        poolSize: connectionConfig.max,
        status: 'connected',
        connectionString: process.env.POSTGRES_URL.replace(/:[^:@]*@/, ':****@') // Masked for security
      };
    } catch (error) {
      console.error('❌ Local database connection failed:', error.message);
      throw new Error(`Local database connection failed: ${error.message}`);
    }
    
    // Create sql function that mimics @vercel/postgres template literal syntax
    dbClient = async function(strings, ...values) {
      if (Array.isArray(strings)) {
        // Handle template literals: sql`SELECT * FROM users WHERE id = ${id}`
        let query = '';
        const params = [];
        
        for (let i = 0; i < strings.length; i++) {
          query += strings[i];
          if (i < values.length) {
            const value = values[i];
            // Handle unsafe raw SQL
            if (value && typeof value === 'object' && value.__unsafe) {
              query += value.__unsafe;
            } else {
              params.push(value);
              query += `$${params.length}`;
            }
          }
        }
        
        // Check if this is a cacheable SELECT query
        const isCacheable = query.trim().toLowerCase().startsWith('select') &&
                           !query.toLowerCase().includes('now()') &&
                           !query.toLowerCase().includes('current_timestamp');

        if (isCacheable) {
          const cachedResult = queryCache.get(query, params);
          if (cachedResult) {
            return cachedResult;
          }
        }

        try {
          const result = await pool.query(query, params);
          const formattedResult = {
            rows: result.rows,
            rowCount: result.rowCount
          };

          if (isCacheable) {
            queryCache.set(query, params, formattedResult);
          }

          return formattedResult;
        } catch (error) {
          console.error('🔴 SQL Query Error (DEV):', error.message);
          console.error('Query:', query);
          console.error('Params:', params);
          throw error;
        }
      }
      
      // Handle direct string queries (fallback)
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
        console.error('🔴 SQL Query Error (DEV):', error.message);
        console.error('Query:', text);
        console.error('Params:', params);
        throw error;
      }
    };
    
  } else {
    // Production: Use @vercel/postgres with Neon
    console.log('🚀 Initializing PRODUCTION database connection...');
    
    try {
      const vercelPg = await import('@vercel/postgres');
      const originalSql = vercelPg.sql;
      
      // Wrap the original sql function to add caching
      dbClient = async function(strings, ...values) {
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

          // Check if this is a cacheable SELECT query
          const isCacheable = query.trim().toLowerCase().startsWith('select') &&
                             !query.toLowerCase().includes('now()') &&
                             !query.toLowerCase().includes('current_timestamp');

          if (isCacheable) {
            const cachedResult = queryCache.get(query, params);
            if (cachedResult) {
              return cachedResult;
            }
          }

          const result = await originalSql(strings, ...values);
          
          if (isCacheable) {
            queryCache.set(query, params, result);
          }

          return result;
        }
        
        return await originalSql(strings, ...values);
      };
      
      // Test connection
      const testResult = await dbClient`SELECT 1 as test, NOW() as timestamp`;
      console.log('✅ Production database connected successfully');
      connectionInfo = {
        environment: 'production',
        type: 'neon',
        status: 'connected'
      };
      
    } catch (error) {
      console.error('❌ Production database connection failed:', error.message);
      throw new Error(`Production database connection failed: ${error.message}`);
    }
  }
  
  // Add connection info method
  dbClient.getConnectionInfo = () => connectionInfo;
  
  // Add cache control methods
  dbClient.invalidateCache = (tableName) => queryCache.invalidateTable(tableName);
  dbClient.clearCache = () => queryCache.clear();
  
  // Add graceful shutdown method
  dbClient.end = async () => {
    if (dev && pool) {
      console.log('🔄 Closing local database pool...');
      await pool.end();
      console.log('✅ Local database pool closed');
    }
    // Note: @vercel/postgres doesn't need explicit cleanup
  };
  
  return dbClient;
}

// Create and export the database client
const db = await initializeDatabase();
export { db as sql };

// Graceful shutdown
export async function shutdownDatabase() {
  if (pool) {
    console.log('🛑 Closing database connection pool...');
    await pool.end();
    console.log('✅ Database connection pool closed');
  }
}