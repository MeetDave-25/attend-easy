import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

console.log('Testing database connection...\n');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
});

async function testConnection() {
    try {
        console.log('\nAttempting to connect...');
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('\n✅ SUCCESS! Database connected!');
        console.log('Current time:', result.rows[0].current_time);
        console.log('PostgreSQL version:', result.rows[0].pg_version);

        // Test if tables exist
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        console.log('\nExisting tables:', tables.rows.length);
        tables.rows.forEach(row => console.log('  -', row.table_name));

    } catch (error) {
        console.error('\n❌ CONNECTION FAILED!');
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
    } finally {
        await pool.end();
        console.log('\nConnection closed.');
    }
}

testConnection();
