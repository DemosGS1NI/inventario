// test-login-menu.js
import dotenv from 'dotenv';
dotenv.config();

async function testLoginAndMenu() {
	console.log('🧪 Testing Login & Menu with new SQL connection...\n');

	try {
		// Test the new sql function directly
		console.log('1. Testing direct SQL connection...');
		const { sql } = await import('./src/lib/sql.js');

		const testResult = await sql`SELECT 1 as test`;
		console.log('✅ Direct SQL test passed:', testResult.rows);

		// Test if usuarios table exists and is accessible
		console.log('\n2. Testing usuarios table...');
		const userCount = await sql`SELECT COUNT(*) as count FROM usuarios`;
		console.log('✅ Users table accessible, count:', userCount.rows[0].count);

		// Test if roles table exists (needed for menu)
		console.log('\n3. Testing roles/menu tables...');
		const roleCount = await sql`SELECT COUNT(*) as count FROM roles`;
		console.log('✅ Roles table accessible, count:', roleCount.rows[0].count);

		console.log('\n🎉 All database tests passed!');
		console.log('👍 You can now test login and menu in your app');

		await sql.end();
	} catch (error) {
		console.log('❌ Test failed:', error.message);
		console.log('Error details:', error);
	}
}

testLoginAndMenu().catch(console.error);
