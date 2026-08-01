import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

const toCamel = (rows) => rows.map(row => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        value,
    ])
));

// Load the shared college workspace for a new device/browser.
router.get('/', async (req, res) => {
    try {
        const [
            facultyRes,
            subjectsRes,
            classroomsRes,
            semestersRes,
            divisionsRes,
            timeSlotsRes,
            timetableEntriesRes,
            collegeConfigRes,
        ] = await Promise.all([
            pool.query('SELECT * FROM faculty ORDER BY name'),
            pool.query('SELECT * FROM subjects ORDER BY semester, division, name'),
            pool.query('SELECT * FROM classrooms ORDER BY room_number'),
            pool.query('SELECT * FROM semesters ORDER BY number'),
            pool.query('SELECT * FROM divisions ORDER BY semester_id, name'),
            pool.query('SELECT * FROM time_slots ORDER BY day, order_idx, start_time'),
            pool.query('SELECT * FROM timetable_entries ORDER BY day, start_time'),
            pool.query('SELECT * FROM college_config LIMIT 1'),
        ]);

        const divisions = toCamel(divisionsRes.rows);
        const semesters = toCamel(semestersRes.rows).map(semester => ({
            ...semester,
            divisions: divisions.filter(division => division.semesterId === semester.id),
        }));

        res.json({
            success: true,
            data: {
                faculty: toCamel(facultyRes.rows),
                subjects: toCamel(subjectsRes.rows),
                classrooms: toCamel(classroomsRes.rows),
                semesters,
                timeSlots: toCamel(timeSlotsRes.rows),
                timetableEntries: toCamel(timetableEntriesRes.rows),
                collegeConfig: toCamel(collegeConfigRes.rows)[0] || null,
            },
        });
    } catch (error) {
        console.error('Error fetching sync data:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to load shared workspace' } });
    }
});

// Replace the shared workspace with the latest complete Zustand snapshot.
// This app currently has one college workspace, so every authenticated device
// sees the same data. The transaction prevents half an import being visible.
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            faculty = [],
            subjects = [],
            classrooms = [],
            semesters = [],
            timeSlots = [],
            timetableEntries = [],
            collegeConfig = null,
        } = req.body || {};

        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE timetable_entries, time_slots, divisions, semesters, classrooms, subjects, faculty, college_config CASCADE');

        if (collegeConfig) {
            await client.query(
                `INSERT INTO college_config
                 (college_name, working_days, start_time, end_time, lecture_duration,
                  lunch_break_start, lunch_break_end, short_break_duration,
                  max_lectures_per_day, max_lectures_per_faculty, semester_count,
                  division_count, is_configured)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    collegeConfig.collegeName,
                    collegeConfig.workingDays || [],
                    collegeConfig.startTime,
                    collegeConfig.endTime,
                    collegeConfig.lectureDuration,
                    collegeConfig.lunchBreakStart,
                    collegeConfig.lunchBreakEnd,
                    collegeConfig.shortBreakDuration,
                    collegeConfig.maxLecturesPerDay,
                    collegeConfig.maxLecturesPerFaculty,
                    collegeConfig.semesterCount,
                    collegeConfig.divisionCount,
                    Boolean(collegeConfig.isConfigured),
                ]
            );
        }

        for (const member of faculty) {
            await client.query(
                `INSERT INTO faculty
                 (id, name, email, department, designation, subject_ids, preferred_slots,
                  unavailable_slots, weekly_load, daily_load, status, avatar, phone)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    member.id, member.name, member.email, member.department || 'General',
                    member.designation || 'Faculty', member.subjectIds || [], member.preferredSlots || [],
                    member.unavailableSlots || [], member.weeklyLoad || 0, member.dailyLoad || 0,
                    member.status || 'active', member.avatar || null, member.phone || null,
                ]
            );
        }

        for (const room of classrooms) {
            await client.query(
                `INSERT INTO classrooms
                 (id, room_number, capacity, room_type, equipment, status, floor, block)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [room.id, room.roomNumber, room.capacity, room.roomType, room.equipment || [], room.status || 'available', room.floor || null, room.block || null]
            );
        }

        for (const subject of subjects) {
            await client.query(
                `INSERT INTO subjects
                 (id, name, code, semester, division, faculty_id, lecture_count_per_week,
                  lab_required, theory_hours, lab_hours, credits, type, year)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    subject.id, subject.name, subject.code, subject.semester, subject.division || 'A',
                    subject.facultyId || null, subject.lectureCountPerWeek || 0,
                    Boolean(subject.labRequired), subject.theoryHours || 0, subject.labHours || 0,
                    subject.credits || 0, subject.type || 'theory', subject.year || null,
                ]
            );
        }

        for (const semester of semesters) {
            await client.query(
                'INSERT INTO semesters (id, number, year, is_active) VALUES ($1, $2, $3, $4)',
                [semester.id, semester.number, semester.year, semester.isActive !== false]
            );
            for (const division of semester.divisions || []) {
                await client.query(
                    'INSERT INTO divisions (id, semester_id, name, student_count, subject_ids) VALUES ($1, $2, $3, $4, $5)',
                    [division.id, semester.id, division.name, division.studentCount || 0, division.subjectIds || []]
                );
            }
        }

        for (const slot of timeSlots) {
            await client.query(
                `INSERT INTO time_slots (id, day, start_time, end_time, slot_type, order_idx)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [slot.id, slot.day, slot.startTime, slot.endTime, slot.slotType, slot.order || 0]
            );
        }

        for (const entry of timetableEntries) {
            await client.query(
                `INSERT INTO timetable_entries
                 (id, time_slot_id, subject_id, faculty_id, classroom_id, semester_id,
                  division_id, day, start_time, end_time, week, is_published, is_modified,
                  replacement_faculty_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [
                    entry.id, entry.timeSlotId, entry.subjectId, entry.facultyId, entry.classroomId,
                    entry.semesterId, entry.divisionId, entry.day, entry.startTime, entry.endTime,
                    entry.week || null, Boolean(entry.isPublished), Boolean(entry.isModified),
                    entry.replacementFacultyId || null,
                ]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, data: null });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during sync commit:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to save shared workspace' } });
    } finally {
        client.release();
    }
});

export default router;
