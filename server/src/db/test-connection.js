import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

console.log('🔍 Testing database connection...\n');

// Test with original connection string
console.log('📝 Connection string from .env (masked):');
const connStr = process.env.DATABASE_URL;
if (connStr) {
    const masked = connStr.replace(/:[^:@]+@/, ':****@');
    console.log(masked);
} else {
    console.error('❌ DATABASE_URL not found in .env file!');
    process.exit(1);
}

// Try connection with different SSL modes
async function testConnection(sslConfig, description) {
    console.log(`\n🧪 Testing: ${description}`);

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL.split('?')[0], // Remove query params
        ssl: sslConfig,
        connectionTimeoutMillis: 10000,
    });

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Connection successful!');
        console.log('   Time:', result.rows[0].current_time);
        console.log('   PostgreSQL:', result.rows[0].pg_version.split(' ')[0], result.rows[0].pg_version.split(' ')[1]);
        client.release();
        await pool.end();
        return true;
    } catch (error) {
        console.log('❌ Connection failed');
        console.log('   Error:', error.message);
        await pool.end();
        return false;
    }
}

async function runTests() {
    // Test 1: SSL with rejectUnauthorized: false
    const test1 = await testConnection(
        { rejectUnauthorized: false },
        'SSL with rejectUnauthorized: false'
    );

    if (test1) {
        console.log('\n✅ Solution found! Update database.js to use:');
        console.log('   ssl: { rejectUnauthorized: false }');
        return;
    }

    // Test 2: SSL true
    const test2 = await testConnection(
        true,
        'SSL: true'
    );

    if (test2) {
        console.log('\n✅ Solution found! Update database.js to use:');
        console.log('   ssl: true');
        return;
    }

    // Test 3: No SSL
    const test3 = await testConnection(
        false,
        'No SSL'
    );

    if (test3) {
        console.log('\n✅ Solution found! Update database.js to use:');
        console.log('   ssl: false');
        return;
    }

    console.log('\n❌ All connection attempts failed.');
    console.log('\n💡 Possible issues:');
    console.log('   1. Database is paused/inactive (check Neon dashboard)');
    console.log('   2. Incorrect credentials');
    console.log('   3. Network/firewall blocking connection');
    console.log('   4. Database region/endpoint changed');
    console.log('\n📋 Next steps:');
    console.log('   1. Visit https://console.neon.tech/');
    console.log('   2. Check if database is active');
    console.log('   3. Get fresh connection string');
    console.log('   4. Update .env file');
}

runTests().catch(console.error);
