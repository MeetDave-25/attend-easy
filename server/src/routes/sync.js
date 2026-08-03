import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = express.Router();

const requireSyncUser = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        return next();
    } catch {
        return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
    }
};

const toCamel = (rows) => rows.map(row => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        value,
    ])
));

const asArray = (value) => Array.isArray(value) ? value : [];
const cleanText = (value, fallback = '') => String(value ?? fallback).trim();
const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const generatedId = (prefix, index) => `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
const notificationTypes = new Set(['timetable_published', 'lecture_changed', 'replacement_assigned', 'leave_approved', 'request_rejected', 'conflict_detected', 'system']);
const notificationRoles = new Set(['hod', 'faculty', 'student', 'all']);

const ensureNotificationsTable = (client) => client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type VARCHAR(80) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        for_role VARCHAR(50) NOT NULL,
        for_user_id TEXT,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        scheduled_for TIMESTAMPTZ
    )
`);

const uniqueValue = (value, used, fallback, maxLength = 255) => {
    const base = cleanText(value, fallback).slice(0, maxLength);
    let candidate = base || fallback;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
        const suffixText = `-${suffix}`;
        candidate = `${base.slice(0, maxLength - suffixText.length)}${suffixText}`;
        suffix += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
};

const normalizeSnapshot = (snapshot) => {
    const facultyEmails = new Set();
    const subjectCodes = new Set();
    const faculty = asArray(snapshot.faculty).map((member, index) => {
        const id = cleanText(member?.id, generatedId('faculty', index));
        return {
            ...member,
            id,
            name: cleanText(member?.name, `Faculty ${index + 1}`),
            email: uniqueValue(member?.email, facultyEmails, `faculty-${id}@imported.local`),
            subjectIds: asArray(member?.subjectIds),
            preferredSlots: asArray(member?.preferredSlots),
            unavailableSlots: asArray(member?.unavailableSlots),
            weeklyLoad: safeNumber(member?.weeklyLoad, 0),
            dailyLoad: safeNumber(member?.dailyLoad, 0),
        };
    });
    const facultyIds = new Set(faculty.map((member) => member.id));

    const classrooms = asArray(snapshot.classrooms).map((room, index) => ({
        ...room,
        id: cleanText(room?.id, generatedId('room', index)),
        roomNumber: cleanText(room?.roomNumber, `Room ${index + 1}`),
        capacity: safeNumber(room?.capacity, 1),
        equipment: asArray(room?.equipment),
    }));
    const classroomIds = new Set(classrooms.map((room) => room.id));

    const semesters = asArray(snapshot.semesters).map((semester, semesterIndex) => {
        const semesterId = cleanText(semester?.id, generatedId('semester', semesterIndex));
        return {
            ...semester,
            id: semesterId,
            number: safeNumber(semester?.number, semesterIndex + 1),
            year: safeNumber(semester?.year, 1),
            divisions: asArray(semester?.divisions).map((division, divisionIndex) => ({
                ...division,
                id: cleanText(division?.id, generatedId(`division-${semesterIndex}`, divisionIndex)),
                semesterId,
                name: cleanText(division?.name, `Division ${divisionIndex + 1}`),
                studentCount: safeNumber(division?.studentCount, 0),
                subjectIds: asArray(division?.subjectIds),
            })),
        };
    });
    const semesterIds = new Set(semesters.map((semester) => semester.id));
    const divisionIds = new Set(semesters.flatMap((semester) => semester.divisions.map((division) => division.id)));

    const timeSlots = asArray(snapshot.timeSlots).map((slot, index) => ({
        ...slot,
        id: cleanText(slot?.id, generatedId('slot', index)),
        day: cleanText(slot?.day, 'Monday'),
        startTime: cleanText(slot?.startTime, '09:00'),
        endTime: cleanText(slot?.endTime, '10:00'),
        order: safeNumber(slot?.order, index + 1),
    }));
    const timeSlotIds = new Set(timeSlots.map((slot) => slot.id));

    const subjects = asArray(snapshot.subjects).map((subject, index) => ({
        ...subject,
        id: cleanText(subject?.id, generatedId('subject', index)),
        name: cleanText(subject?.name, `Subject ${index + 1}`),
        code: uniqueValue(subject?.code, subjectCodes, `IMPORTED-${index + 1}`, 50),
        semester: safeNumber(subject?.semester, 1),
        facultyId: facultyIds.has(subject?.facultyId) ? subject.facultyId : null,
        lectureCountPerWeek: safeNumber(subject?.lectureCountPerWeek, 0),
        theoryHours: safeNumber(subject?.theoryHours, 0),
        labHours: safeNumber(subject?.labHours, 0),
        credits: safeNumber(subject?.credits, 0),
        year: subject?.year == null ? null : safeNumber(subject.year, null),
    }));
    const subjectIds = new Set(subjects.map((subject) => subject.id));

    const timetableEntries = asArray(snapshot.timetableEntries).filter((entry) =>
        subjectIds.has(entry?.subjectId) &&
        facultyIds.has(entry?.facultyId) &&
        classroomIds.has(entry?.classroomId) &&
        semesterIds.has(entry?.semesterId) &&
        divisionIds.has(entry?.divisionId) &&
        timeSlotIds.has(entry?.timeSlotId)
    );

    const notifications = asArray(snapshot.notifications).map((notification, index) => {
        const scheduledAt = notification?.scheduledFor ? new Date(notification.scheduledFor) : null;
        return {
            id: cleanText(notification?.id, generatedId('notification', index)),
            type: notificationTypes.has(notification?.type) ? notification.type : 'system',
            title: cleanText(notification?.title, 'College update').slice(0, 255),
            message: cleanText(notification?.message, 'There is an update in the college workspace.'),
            forRole: notificationRoles.has(notification?.forRole) ? notification.forRole : 'all',
            forUserId: cleanText(notification?.forUserId) || null,
            isRead: Boolean(notification?.isRead),
            createdAt: Number.isNaN(new Date(notification?.createdAt).getTime()) ? new Date().toISOString() : notification.createdAt,
            scheduledFor: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt.toISOString() : null,
        };
    });

    return { faculty, subjects, classrooms, semesters, timeSlots, timetableEntries, notifications };
};

const syncErrorMessage = (error) => {
    if (error?.code === '23505') return `Duplicate ${error.constraint || 'record'} in the uploaded data. Use unique faculty emails and subject codes.`;
    if (error?.code === '23503') return 'Some timetable rows refer to missing faculty, room, subject, semester, division, or time slot data.';
    if (error?.code === '23502') return `A required field is missing: ${error.column || 'unknown field'}.`;
    if (error?.code === '22P02') return 'One of the uploaded values has an invalid number or format.';
    return `Failed to save shared workspace${error?.code ? ` (${error.code})` : ''}.`;
};

// Load the shared college workspace for a new device/browser.
router.get('/', requireSyncUser, async (req, res) => {
    try {
        await ensureNotificationsTable(pool);
        const [
            facultyRes,
            subjectsRes,
            classroomsRes,
            semestersRes,
            divisionsRes,
            timeSlotsRes,
            timetableEntriesRes,
            collegeConfigRes,
            notificationsRes,
        ] = await Promise.all([
            pool.query('SELECT * FROM faculty ORDER BY name'),
            pool.query('SELECT * FROM subjects ORDER BY semester, division, name'),
            pool.query('SELECT * FROM classrooms ORDER BY room_number'),
            pool.query('SELECT * FROM semesters ORDER BY number'),
            pool.query('SELECT * FROM divisions ORDER BY semester_id, name'),
            pool.query('SELECT * FROM time_slots ORDER BY day, order_idx, start_time'),
            pool.query('SELECT * FROM timetable_entries ORDER BY day, start_time'),
            pool.query('SELECT * FROM college_config LIMIT 1'),
            pool.query('SELECT * FROM notifications ORDER BY created_at DESC'),
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
                notifications: toCamel(notificationsRes.rows),
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
router.post('/', requireSyncUser, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            faculty: rawFaculty = [],
            subjects: rawSubjects = [],
            classrooms: rawClassrooms = [],
            semesters: rawSemesters = [],
            timeSlots: rawTimeSlots = [],
            timetableEntries: rawTimetableEntries = [],
            notifications: rawNotifications = [],
            collegeConfig = null,
        } = req.body || {};
        const {
            faculty,
            subjects,
            classrooms,
            semesters,
            timeSlots,
            timetableEntries,
            notifications,
        } = normalizeSnapshot({
            faculty: rawFaculty,
            subjects: rawSubjects,
            classrooms: rawClassrooms,
            semesters: rawSemesters,
            timeSlots: rawTimeSlots,
            timetableEntries: rawTimetableEntries,
            notifications: rawNotifications,
        });

        await ensureNotificationsTable(client);
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE timetable_entries, time_slots, divisions, semesters, classrooms, subjects, faculty, college_config CASCADE');
        await client.query('DELETE FROM notifications');

        if (collegeConfig) {
            await client.query(
                `INSERT INTO college_config
                 (college_name, working_days, start_time, end_time, lecture_duration,
                  lunch_break_start, lunch_break_end, short_break_duration,
                  max_lectures_per_day, max_lectures_per_faculty, semester_count,
                  division_count, is_configured)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    cleanText(collegeConfig.collegeName, 'My College'),
                    asArray(collegeConfig.workingDays),
                    cleanText(collegeConfig.startTime, '09:00'),
                    cleanText(collegeConfig.endTime, '17:00'),
                    safeNumber(collegeConfig.lectureDuration, 60),
                    cleanText(collegeConfig.lunchBreakStart, '13:00'),
                    cleanText(collegeConfig.lunchBreakEnd, '14:00'),
                    safeNumber(collegeConfig.shortBreakDuration, 0),
                    safeNumber(collegeConfig.maxLecturesPerDay, 0),
                    safeNumber(collegeConfig.maxLecturesPerFaculty, 0),
                    safeNumber(collegeConfig.semesterCount, 0),
                    safeNumber(collegeConfig.divisionCount, 0),
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

        for (const notification of notifications) {
            await client.query(
                `INSERT INTO notifications
                 (id, type, title, message, for_role, for_user_id, is_read, created_at, scheduled_for)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    notification.id, notification.type, notification.title, notification.message,
                    notification.forRole, notification.forUserId, notification.isRead, notification.createdAt,
                    notification.scheduledFor,
                ]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, data: null });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during sync commit:', error);
        res.status(500).json({ success: false, error: { message: syncErrorMessage(error) } });
    } finally {
        client.release();
    }
});

export default router;
