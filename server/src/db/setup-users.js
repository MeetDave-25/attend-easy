import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

async function setupUsers() {
    console.log('Setting up seed users...');

    try {
        await pool.query('TRUNCATE TABLE attendance_records, attendance_sessions, test_marks, timetable_entries, students, subjects, users RESTART IDENTITY CASCADE');

        const passwordHash = await bcrypt.hash('password123', 10);

        const studentResult = await pool.query(
            `INSERT INTO students (name, roll_number, year, email, semester, division)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            ['Student User', '2024CS001', 1, 'student@attend.com', 1, 'A']
        );

        await pool.query(
            `INSERT INTO subjects (name, code, year, semester, division)
             VALUES
             ('Data Structures', 'CS201', 1, 1, 'A'),
             ('Database Systems', 'CS301', 1, 1, 'A')`
        );

        await pool.query(
            `INSERT INTO users (name, email, password_hash, role, student_id)
             VALUES
             ($1, $2, $3, 'hod', NULL),
             ($4, $5, $3, 'faculty', NULL),
             ($6, $7, $3, 'student', $8)`,
            [
                'Admin User', 'admin@attend.com', passwordHash,
                'Faculty User', 'faculty@attend.com',
                'Student User', 'student@attend.com', studentResult.rows[0].id
            ]
        );

        const result = await pool.query('SELECT name, email, role FROM users ORDER BY role');
        console.log('Seed users created:');
        result.rows.forEach((user) => {
            console.log(`- ${user.role}: ${user.email} / password123`);
        });
    } catch (error) {
        console.error('Error setting up users:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

setupUsers();
