import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Create attendance session (QR code generation)
router.post('/sessions', async (req, res) => {
    try {
        const {
            subjectId,
            qrCode,
            startTime,
            endTime,
            locationLat,
            locationLng,
            allowedRadius
        } = req.body;

        if (!subjectId || !qrCode || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields'
                }
            });
        }

        const result = await query(
            `INSERT INTO attendance_sessions 
       (subject_id, qr_code, start_time, end_time, location_lat, location_lng, allowed_radius, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) 
       RETURNING *`,
            [subjectId, qrCode, startTime, endTime, locationLat, locationLng, allowedRadius || 50]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Attendance session created successfully'
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_ERROR',
                message: 'Failed to create attendance session'
            }
        });
    }
});

// Get all sessions
router.get('/sessions', async (req, res) => {
    try {
        const { subjectId, isActive } = req.query;

        let sql = `
      SELECT s.*, sub.name as subject_name, sub.code as subject_code,
             COUNT(ar.id) as students_present
      FROM attendance_sessions s
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN attendance_records ar ON s.id = ar.session_id
    `;

        const params = [];
        const conditions = [];

        if (subjectId) {
            conditions.push(`s.subject_id = $${params.length + 1}`);
            params.push(subjectId);
        }

        if (isActive !== undefined) {
            conditions.push(`s.is_active = $${params.length + 1}`);
            params.push(isActive === 'true');
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' GROUP BY s.id, sub.name, sub.code ORDER BY s.start_time DESC';

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch sessions'
            }
        });
    }
});

// Get session details with student list
router.get('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get session info
        const sessionResult = await query(
            `SELECT s.*, sub.name as subject_name, sub.code as subject_code
       FROM attendance_sessions s
       LEFT JOIN subjects sub ON s.subject_id = sub.id
       WHERE s.id = $1`,
            [id]
        );

        if (sessionResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Session not found'
                }
            });
        }

        // Get students who attended
        const studentsResult = await query(
            `SELECT ar.*, st.name as student_name, st.roll_number, st.year
       FROM attendance_records ar
       JOIN students st ON ar.student_id = st.id
       WHERE ar.session_id = $1
       ORDER BY ar.marked_at`,
            [id]
        );

        const session = sessionResult.rows[0];
        session.students_present = studentsResult.rows;
        session.total_present = studentsResult.rowCount;

        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Error fetching session details:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch session details'
            }
        });
    }
});

// Mark attendance (student scans QR)
router.post('/mark', async (req, res) => {
    try {
        const {
            sessionId,
            studentId,
            locationLat,
            locationLng,
            locationAccuracy
        } = req.body;

        if (!sessionId || !studentId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields'
                }
            });
        }

        // Check if session is active and not expired
        const sessionCheck = await query(
            'SELECT * FROM attendance_sessions WHERE id = $1 AND is_active = true AND end_time > NOW()',
            [sessionId]
        );

        if (sessionCheck.rowCount === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'SESSION_EXPIRED',
                    message: 'Session is not active or has expired'
                }
            });
        }

        // Mark attendance
        const result = await query(
            `INSERT INTO attendance_records 
       (session_id, student_id, location_lat, location_lng, location_accuracy) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
            [sessionId, studentId, locationLat, locationLng, locationAccuracy]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Attendance marked successfully'
        });
    } catch (error) {
        console.error('Error marking attendance:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                error: {
                    code: 'ALREADY_MARKED',
                    message: 'Attendance already marked for this session'
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'MARK_ERROR',
                message: 'Failed to mark attendance'
            }
        });
    }
});

// Get student attendance records
router.get('/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { subjectId } = req.query;

        let sql = `
      SELECT ar.*, s.start_time, s.end_time,
             sub.name as subject_name, sub.code as subject_code
      FROM attendance_records ar
      JOIN attendance_sessions s ON ar.session_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE ar.student_id = $1
    `;

        const params = [studentId];

        if (subjectId) {
            sql += ` AND s.subject_id = $2`;
            params.push(subjectId);
        }

        sql += ' ORDER BY ar.marked_at DESC';

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch attendance records'
            }
        });
    }
});

// Stop/deactivate session
router.patch('/sessions/:id/stop', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'UPDATE attendance_sessions SET is_active = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Session not found'
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Session stopped successfully'
        });
    } catch (error) {
        console.error('Error stopping session:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: 'Failed to stop session'
            }
        });
    }
});

export default router;
