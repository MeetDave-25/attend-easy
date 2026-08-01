import express from 'express';
import pool from '../config/database.js';

const router = express.createElement ? express.Router() : express.Router();

// GET all data to populate the frontend store
router.get('/', async (req, res) => {
    try {
        const [
            facultyRes,
            subjectsRes,
            classroomsRes,
            semestersRes,
            divisionsRes,
            collegeConfigRes
        ] = await Promise.all([
            pool.query('SELECT * FROM faculty'),
            pool.query('SELECT * FROM subjects'),
            pool.query('SELECT * FROM classrooms'),
            pool.query('SELECT * FROM semesters'),
            pool.query('SELECT * FROM divisions'),
            pool.query('SELECT * FROM college_config LIMIT 1')
        ]);

        // Map snake_case to camelCase
        const toCamel = (rows) => rows.map(row => {
            const newRow = {};
            for (let key in row) {
                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                newRow[camelKey] = row[key];
            }
            return newRow;
        });

        // Reconstruct semesters with their divisions
        const divisions = toCamel(divisionsRes.rows);
        const semesters = toCamel(semestersRes.rows).map(sem => ({
            ...sem,
            divisions: divisions.filter(d => d.semesterId === sem.id)
        }));

        res.json({
            success: true,
            data: {
                faculty: toCamel(facultyRes.rows),
                subjects: toCamel(subjectsRes.rows),
                classrooms: toCamel(classroomsRes.rows),
                semesters: semesters,
                collegeConfig: toCamel(collegeConfigRes.rows)[0] || null
            }
        });
    } catch (error) {
        console.error('Error fetching sync data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST to sync state (replace all or upsert)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { faculty, subjects, classrooms, semesters, collegeConfig } = req.body;
        await client.query('BEGIN');

        // Note: For a robust app, we would use INSERT ... ON CONFLICT (upsert)
        // or a sync queue. For this migration bridge, we truncate and re-insert 
        // to match the exact Zustand state dump.
        
        await client.query('TRUNCATE TABLE divisions, semesters, classrooms, subjects, faculty, college_config CASCADE');

        // Insert College Config
        if (collegeConfig && collegeConfig.id) {
            await client.query(
                `INSERT INTO college_config (id, college_name, working_days, start_time, end_time, lecture_duration, lunch_break_start, lunch_break_end, short_break_duration, max_lectures_per_day, max_lectures_per_faculty, semester_count, division_count, is_configured)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [
                    collegeConfig.id, collegeConfig.collegeName, collegeConfig.workingDays, 
                    collegeConfig.startTime, collegeConfig.endTime, collegeConfig.lectureDuration, 
                    collegeConfig.lunchBreakStart, collegeConfig.lunchBreakEnd, 
                    collegeConfig.shortBreakDuration, collegeConfig.maxLecturesPerDay, 
                    collegeConfig.maxLecturesPerFaculty, collegeConfig.semesterCount, 
                    collegeConfig.divisionCount, collegeConfig.isConfigured
                ]
            );
        }

        // Insert Faculty
        if (faculty && faculty.length) {
            for (let f of faculty) {
                await client.query(
                    `INSERT INTO faculty (id, name, email, department, designation, subject_ids, preferred_slots, unavailable_slots, weekly_load, daily_load, status, avatar, phone)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [f.id, f.name, f.email, f.department, f.designation, f.subjectIds || [], f.preferredSlots || [], f.unavailableSlots || [], f.weeklyLoad || 0, f.dailyLoad || 0, f.status || 'active', f.avatar, f.phone]
                );
            }
        }

        // Insert Classrooms
        if (classrooms && classrooms.length) {
            for (let c of classrooms) {
                await client.query(
                    `INSERT INTO classrooms (id, room_number, capacity, room_type, equipment, status, floor, block)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [c.id, c.roomNumber, c.capacity, c.roomType, c.equipment || [], c.status, c.floor, c.block]
                );
            }
        }

        // Insert Subjects
        if (subjects && subjects.length) {
            for (let s of subjects) {
                await client.query(
                    `INSERT INTO subjects (id, name, code, semester, division, faculty_id, lecture_count_per_week, lab_required, theory_hours, lab_hours, credits, type, year)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [s.id, s.name, s.code, s.semester, s.division, s.facultyId, s.lectureCountPerWeek, s.labRequired, s.theoryHours, s.labHours, s.credits, s.type, s.year]
                );
            }
        }

        // Insert Semesters & Divisions
        if (semesters && semesters.length) {
            for (let s of semesters) {
                await client.query(
                    `INSERT INTO semesters (id, number, year, is_active) VALUES ($1, $2, $3, $4)`,
                    [s.id, s.number, s.year, s.isActive]
                );
                if (s.divisions && s.divisions.length) {
                    for (let d of s.divisions) {
                        await client.query(
                            `INSERT INTO divisions (id, semester_id, name, student_count, subject_ids) VALUES ($1, $2, $3, $4, $5)`,
                            [d.id, d.semesterId || s.id, d.name, d.studentCount, d.subjectIds || []]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during sync commit:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

export default router;
