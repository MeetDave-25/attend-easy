import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Get all marks
router.get('/', async (req, res) => {
    try {
        const { studentId, subjectId, testName } = req.query;

        let sql = `
      SELECT m.*, 
             st.name as student_name, st.roll_number,
             sub.name as subject_name, sub.code as subject_code
      FROM test_marks m
      JOIN students st ON m.student_id = st.id
      JOIN subjects sub ON m.subject_id = sub.id
    `;

        const params = [];
        const conditions = [];

        if (studentId) {
            conditions.push(`m.student_id = $${params.length + 1}`);
            params.push(studentId);
        }

        if (subjectId) {
            conditions.push(`m.subject_id = $${params.length + 1}`);
            params.push(subjectId);
        }

        if (testName) {
            conditions.push(`m.test_name = $${params.length + 1}`);
            params.push(testName);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY m.test_date DESC, st.roll_number';

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error fetching marks:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch marks'
            }
        });
    }
});

// Create test marks
router.post('/', async (req, res) => {
    try {
        const { studentId, subjectId, testName, maxMarks, obtainedMarks, testDate } = req.body;

        if (!studentId || !subjectId || !testName || !maxMarks || obtainedMarks === undefined) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields'
                }
            });
        }

        const result = await query(
            `INSERT INTO test_marks 
       (student_id, subject_id, test_name, max_marks, obtained_marks, test_date) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
            [studentId, subjectId, testName, maxMarks, obtainedMarks, testDate || new Date()]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Marks created successfully'
        });
    } catch (error) {
        console.error('Error creating marks:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_ERROR',
                message: 'Failed to create marks'
            }
        });
    }
});

// Update marks
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { obtainedMarks, maxMarks, testName } = req.body;

        const result = await query(
            `UPDATE test_marks 
       SET obtained_marks = COALESCE($1, obtained_marks),
           max_marks = COALESCE($2, max_marks),
           test_name = COALESCE($3, test_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
            [obtainedMarks, maxMarks, testName, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Marks not found'
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Marks updated successfully'
        });
    } catch (error) {
        console.error('Error updating marks:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: 'Failed to update marks'
            }
        });
    }
});

// Delete marks
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM test_marks WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Marks not found'
                }
            });
        }

        res.json({
            success: true,
            message: 'Marks deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting marks:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: 'Failed to delete marks'
            }
        });
    }
});

// Get student marks summary
router.get('/student/:studentId/summary', async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await query(
            `SELECT 
         sub.name as subject_name,
         sub.code as subject_code,
         COUNT(m.id) as total_tests,
         AVG(m.obtained_marks * 100.0 / m.max_marks) as average_percentage,
         SUM(m.obtained_marks) as total_obtained,
         SUM(m.max_marks) as total_max
       FROM test_marks m
       JOIN subjects sub ON m.subject_id = sub.id
       WHERE m.student_id = $1
       GROUP BY sub.id, sub.name, sub.code
       ORDER BY sub.code`,
            [studentId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching marks summary:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch marks summary'
            }
        });
    }
});

export default router;
