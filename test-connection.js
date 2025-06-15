// test-connections.js
import dotenv from 'dotenv';
dotenv.config();

async function testConnections() {
  console.log('🔍 Testing Database Connections...\n');
  
  // Show current environment
  console.log('📝 Current Environment:');
  console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET' : 'NOT SET');
  if (process.env.POSTGRES_URL) {
    console.log('URL (masked):', process.env.POSTGRES_URL.replace(/:[^:@]*@/, ':****@'));
  }
  
  // Test 1: @vercel/postgres (your current setup)
  console.log('\n🧪 Test 1: @vercel/postgres connection...');
  try {
    const { sql } = await import('@vercel/postgres');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ @vercel/postgres: SUCCESS', result.rows);
  } catch (error) {
    console.log('❌ @vercel/postgres: FAILED');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    if (error.cause) {
      console.log('Root cause:', error.cause.code, '-', error.cause.message);
    }
  }
  
  // Test 2: Direct pg connection (to confirm PostgreSQL is working)
  console.log('\n🧪 Test 2: Direct pg connection...');
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL
    });
    
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Direct pg: SUCCESS', result.rows);
    await pool.end();
  } catch (error) {
    console.log('❌ Direct pg: FAILED');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
  }
  
  // Test 3: Check if it's trying to make HTTP requests
  console.log('\n🧪 Test 3: Check connection method...');
  const url = process.env.POSTGRES_URL;
  if (url && url.includes('localhost')) {
    console.log('⚠️  ISSUE IDENTIFIED:');
    console.log('@vercel/postgres is designed for Neon databases (HTTP-based)');
    console.log('Your local PostgreSQL uses wire protocol, not HTTP');
    console.log('This is why you get ECONNREFUSED - it\'s trying HTTP on port 5432');
  }
}

testConnections().catch(console.error);