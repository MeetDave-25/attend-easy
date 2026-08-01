import pool from './src/config/database.js';

async function checkUsers() {
    try {
        console.log('=== CHECKING DATABASE USERS ===\n');

        const result = await pool.query('SELECT id, email, role, created_at FROM users ORDER BY created_at');

        if (result.rows.length === 0) {
            console.log('❌ No users found in database!');
            console.log('\nYou need to run the user setup script.');
        } else {
            console.log(`✅ Found ${result.rows.length} user(s):\n`);
            result.rows.forEach((user, index) => {
                console.log(`${index + 1}. Email: ${user.email}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   ID: ${user.id}`);
                console.log(`   Created: ${user.created_at}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers();
