import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
    console.log('🚀 Starting database setup...\n');

    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        // Windows editors may save SQL with a UTF-8 BOM; PostgreSQL rejects it
        // when it appears before the first statement.
        const schema = fs.readFileSync(schemaPath, 'utf8').replace(/^\uFEFF/, '');

        console.log('📄 Executing schema.sql...');
        await pool.query(schema);

        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📊 Created tables:');
        console.log('  - users');
        console.log('  - students');
        console.log('  - subjects');
        console.log('  - attendance_sessions');
        console.log('  - attendance_records');
        console.log('  - test_marks');
        console.log('  - timetable_entries');

        console.log('\n🌱 Sample data inserted:');
        console.log('  - 1 teacher user');
        console.log('  - 8 subjects');
        console.log('  - 8 students');
        console.log('  - 5 test marks');

        // Verify the setup
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log('\n📋 Verified tables in database:');
        result.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

    } catch (error) {
        console.error('\n❌ Error setting up database:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n👋 Database connection closed');
    }
}

// Run the setup
setupDatabase();
