// scripts/test-connection.js
import { sql } from './database.js';  // Use standalone database

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    
    console.log('✅ Database connected successfully!');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('🗃️ Database version:', result.rows[0].db_version);
    
    // Test getting table list
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Found tables:', tables.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    if (sql.end) {
      await sql.end();
    }
    process.exit(0);
  }
}

testConnection().catch(console.error);