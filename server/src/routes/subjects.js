import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Get all subjects
router.get('/', async (req, res) => {
    try {
        const { year, semester } = req.query;

        let sql = 'SELECT * FROM subjects';
        const params = [];
        const conditions = [];

        if (year) {
            conditions.push(`year = $${params.length + 1}`);
            params.push(year);
        }

        if (semester) {
            conditions.push(`semester = $${params.length + 1}`);
            params.push(semester);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY year, semester, code';

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch subjects'
            }
        });
    }
});

// Get subject by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM subjects WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Subject not found'
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching subject:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch subject'
            }
        });
    }
});

// Create new subject
router.post('/', async (req, res) => {
    try {
        const { name, code, year, semester } = req.body;

        if (!name || !code || !year || !semester) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields'
                }
            });
        }

        const result = await query(
            `INSERT INTO subjects (name, code, year, semester) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [name, code, year, semester]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Subject created successfully'
        });
    } catch (error) {
        console.error('Error creating subject:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_ERROR',
                    message: 'Subject with this code already exists'
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_ERROR',
                message: 'Failed to create subject'
            }
        });
    }
});

// Update subject
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, year, semester } = req.body;

        const result = await query(
            `UPDATE subjects 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           year = COALESCE($3, year),
           semester = COALESCE($4, semester),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
            [name, code, year, semester, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Subject not found'
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Subject updated successfully'
        });
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: 'Failed to update subject'
            }
        });
    }
});

// Delete subject
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM subjects WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Subject not found'
                }
            });
        }

        res.json({
            success: true,
            message: 'Subject deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: 'Failed to delete subject'
            }
        });
    }
});

export default router;
