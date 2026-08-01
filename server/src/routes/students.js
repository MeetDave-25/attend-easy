import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Get all students
router.get('/', async (req, res) => {
    try {
        const { year } = req.query;

        let sql = 'SELECT * FROM students';
        const params = [];

        if (year) {
            sql += ' WHERE year = $1';
            params.push(year);
        }

        sql += ' ORDER BY roll_number';

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch students'
            }
        });
    }
});

// Get student by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM students WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Student not found'
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch student'
            }
        });
    }
});

// Create new student
router.post('/', async (req, res) => {
    try {
        const { name, rollNumber, year, email } = req.body;

        // Validation
        if (!name || !rollNumber || !year || !email) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields'
                }
            });
        }

        const result = await query(
            `INSERT INTO students (name, roll_number, year, email) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [name, rollNumber, year, email]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Student created successfully'
        });
    } catch (error) {
        console.error('Error creating student:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_ERROR',
                    message: 'Student with this roll number or email already exists'
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_ERROR',
                message: 'Failed to create student'
            }
        });
    }
});

// Update student
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rollNumber, year, email } = req.body;

        const result = await query(
            `UPDATE students 
       SET name = COALESCE($1, name),
           roll_number = COALESCE($2, roll_number),
           year = COALESCE($3, year),
           email = COALESCE($4, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
            [name, rollNumber, year, email, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Student not found'
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Student updated successfully'
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: 'Failed to update student'
            }
        });
    }
});

// Delete student
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM students WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Student not found'
                }
            });
        }

        res.json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: 'Failed to delete student'
            }
        });
    }
});

export default router;
