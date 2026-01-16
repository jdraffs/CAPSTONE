// backend/routes/accreditationRoute.js - PART 1
import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// ============================================
// CYCLE MANAGEMENT
// ============================================

// GET: Get Active Cycle
router.get('/accreditation/cycle/active', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                academic_year,
                status,
                created_at,
                completed_at
            FROM accreditation_cycles
            WHERE status = 'Active'
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.json({ cycle: null });
        }

        res.json({ cycle: result.rows[0] });
    } catch (error) {
        console.error('Error fetching active cycle:', error);
        res.status(500).json({ error: 'Failed to fetch active cycle' });
    }
});

// GET: Get All Cycles
router.get('/accreditation/cycles', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                academic_year,
                status,
                created_at,
                completed_at,
                archived_at
            FROM accreditation_cycles
            ORDER BY created_at DESC
        `);

        res.json({ cycles: result.rows });
    } catch (error) {
        console.error('Error fetching cycles:', error);
        res.status(500).json({ error: 'Failed to fetch cycles' });
    }
});

// POST: Create New Cycle
router.post('/accreditation/cycle', async (req, res) => {
    const { academic_year, created_by } = req.body;

    if (!academic_year || !created_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if there's already an active cycle
        const activeCheck = await client.query(`
            SELECT id FROM accreditation_cycles WHERE status = 'Active'
        `);

        if (activeCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'An active cycle already exists. Please complete or archive it first.' });
        }

        // Create new cycle
        const cycleResult = await client.query(`
            INSERT INTO accreditation_cycles (academic_year, status, created_by)
            VALUES ($1, 'Active', $2)
            RETURNING id, academic_year, status, created_at
        `, [academic_year, created_by]);

        const cycle = cycleResult.rows[0];

        // Create submission control
        await client.query(`
            INSERT INTO submission_control (cycle_id, is_open)
            VALUES ($1, FALSE)
        `, [cycle.id]);

        // Log activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Created', 'Cycle', $3, $4)
        `, [cycle.id, created_by, academic_year, `Created new accreditation cycle`]);

        await client.query('COMMIT');
        res.json({ success: true, cycle });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating cycle:', error);
        res.status(500).json({ error: 'Failed to create cycle' });
    } finally {
        client.release();
    }
});

// PUT: Archive Cycle
router.put('/accreditation/cycle/:cycleId/archive', async (req, res) => {
    const { cycleId } = req.params;
    const { archived_by } = req.body;

    try {
        const result = await pool.query(`
            UPDATE accreditation_cycles
            SET status = 'Archived', archived_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, status, archived_at
        `, [cycleId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cycle not found' });
        }

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Archived', 'Cycle', 'Cycle', 'Archived accreditation cycle')
        `, [cycleId, archived_by]);

        res.json({ success: true, cycle: result.rows[0] });
    } catch (error) {
        console.error('Error archiving cycle:', error);
        res.status(500).json({ error: 'Failed to archive cycle' });
    }
});

// PUT: Restore Archived Cycle
router.put('/accreditation/cycle/:cycleId/restore', async (req, res) => {
    const { cycleId } = req.params;
    const { restored_by } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if there's already an active cycle
        const activeCheck = await client.query(`
            SELECT id FROM accreditation_cycles WHERE status = 'Active'
        `);

        if (activeCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'An active cycle already exists. Please archive it first.' 
            });
        }

        // Restore the cycle
        const result = await client.query(`
            UPDATE accreditation_cycles
            SET status = 'Active', archived_at = NULL
            WHERE id = $1
            RETURNING id, academic_year, status
        `, [cycleId]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Cycle not found' });
        }

        // Log activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Restored', 'Cycle', $3, 'Restored archived cycle to active status')
        `, [cycleId, restored_by, result.rows[0].academic_year]);

        await client.query('COMMIT');
        res.json({ success: true, cycle: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error restoring cycle:', error);
        res.status(500).json({ error: 'Failed to restore cycle' });
    } finally {
        client.release();
    }
});

// ============================================
// DASHBOARD STATS
// ============================================

// GET: Dashboard Quick Stats
router.get('/accreditation/dashboard/stats/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                COUNT(DISTINCT s.id) as total_sections,
                COUNT(DISTINCT CASE WHEN sub.id IS NOT NULL THEN s.id END) as submitted_count,
                COUNT(DISTINCT CASE WHEN r.review_status IS NOT NULL AND r.review_status != 'Not Reviewed' THEN s.id END) as reviewed_count,
                COUNT(DISTINCT CASE WHEN r.review_status = 'Complete' THEN s.id END) as complete_count
            FROM accreditation_sections s
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            LEFT JOIN section_reviews r ON s.id = r.section_id
            WHERE s.cycle_id = $1
        `, [cycleId]);

        res.json({ stats: result.rows[0] });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// GET: Submission Control Status
router.get('/accreditation/submission-control/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                is_open,
                opened_at,
                closed_at
            FROM submission_control
            WHERE cycle_id = $1
        `, [cycleId]);

        if (result.rows.length === 0) {
            return res.json({ control: { is_open: false } });
        }

        res.json({ control: result.rows[0] });
    } catch (error) {
        console.error('Error fetching submission control:', error);
        res.status(500).json({ error: 'Failed to fetch submission control' });
    }
});

// PUT: Open Submissions
router.put('/accreditation/submission-control/:cycleId/open', async (req, res) => {
    const { cycleId } = req.params;
    const { opened_by } = req.body;

    try {
        const result = await pool.query(`
            UPDATE submission_control
            SET is_open = TRUE, opened_at = CURRENT_TIMESTAMP, opened_by = $2
            WHERE cycle_id = $1
            RETURNING is_open, opened_at
        `, [cycleId, opened_by]);

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Opened', 'Submissions', 'Submission Period', 'Opened submission period')
        `, [cycleId, opened_by]);

        res.json({ success: true, control: result.rows[0] });
    } catch (error) {
        console.error('Error opening submissions:', error);
        res.status(500).json({ error: 'Failed to open submissions' });
    }
});

// PUT: Close Submissions
router.put('/accreditation/submission-control/:cycleId/close', async (req, res) => {
    const { cycleId } = req.params;
    const { closed_by } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Close submissions
        const result = await client.query(`
            UPDATE submission_control
            SET is_open = FALSE, closed_at = CURRENT_TIMESTAMP, closed_by = $2
            WHERE cycle_id = $1
            RETURNING is_open, closed_at
        `, [cycleId, closed_by]);

        // Lock all submissions
        await client.query(`
            UPDATE section_submissions
            SET is_locked = TRUE
            WHERE section_id IN (
                SELECT id FROM accreditation_sections WHERE cycle_id = $1
            )
        `, [cycleId]);

        // Log activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Closed', 'Submissions', 'Submission Period', 'Closed submission period and locked all links')
        `, [cycleId, closed_by]);

        await client.query('COMMIT');
        res.json({ success: true, control: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error closing submissions:', error);
        res.status(500).json({ error: 'Failed to close submissions' });
    } finally {
        client.release();
    }
});

// ============================================
// AREAS AND ASSIGNMENTS
// ============================================

// GET: All Areas with Assignments and Progress
router.get('/accreditation/areas/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                a.id as area_id,
                a.area_number,
                a.area_name,
                aa.area_head_id,
                ah.username as area_head_name,
                COUNT(DISTINCT s.id) as total_sections,
                COUNT(DISTINCT CASE WHEN sub.id IS NOT NULL THEN s.id END) as submitted_sections,
                COUNT(DISTINCT CASE WHEN r.review_status IS NOT NULL AND r.review_status != 'Not Reviewed' THEN s.id END) as reviewed_sections,
                COUNT(DISTINCT CASE WHEN r.review_status = 'Complete' THEN s.id END) as complete_sections
            FROM accreditation_areas a
            LEFT JOIN area_assignments aa ON a.id = aa.area_id AND aa.cycle_id = $1
            LEFT JOIN accreditation_accounts ah ON aa.area_head_id = ah.id
            LEFT JOIN accreditation_sections s ON a.id = s.area_id AND s.cycle_id = $1
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            LEFT JOIN section_reviews r ON s.id = r.section_id
            GROUP BY a.id, a.area_number, a.area_name, aa.area_head_id, ah.username
            ORDER BY a.area_number
        `, [cycleId]);

        res.json({ areas: result.rows });
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({ error: 'Failed to fetch areas' });
    }
});

// GET: Accreditors for an Area
router.get('/accreditation/area/:cycleId/:areaId/accreditors', async (req, res) => {
    const { cycleId, areaId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                ac.id as assignment_id,
                acc.id as accreditor_id,
                acc.username as accreditor_name
            FROM accreditor_assignments ac
            JOIN accreditation_accounts acc ON ac.accreditor_id = acc.id
            WHERE ac.cycle_id = $1 AND ac.area_id = $2
            ORDER BY acc.username
        `, [cycleId, areaId]);

        res.json({ accreditors: result.rows });
    } catch (error) {
        console.error('Error fetching accreditors:', error);
        res.status(500).json({ error: 'Failed to fetch accreditors' });
    }
});

// Continued in Part 2...// backend/routes/accreditationRoute.js - PART 2
// Continued from Part 1...

// POST: Assign Area Head
router.post('/accreditation/assign/area-head', async (req, res) => {
    const { cycle_id, area_id, area_head_id, assigned_by } = req.body;

    if (!cycle_id || !area_id || !area_head_id || !assigned_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO area_assignments (cycle_id, area_id, area_head_id, assigned_by)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (cycle_id, area_id) 
            DO UPDATE SET area_head_id = $3, assigned_at = CURRENT_TIMESTAMP
            RETURNING id
        `, [cycle_id, area_id, area_head_id, assigned_by]);

        // Get area name for logging
        const areaInfo = await pool.query(`
            SELECT area_name FROM accreditation_areas WHERE id = $1
        `, [area_id]);

        // Get area head name for logging
        const headInfo = await pool.query(`
            SELECT username FROM accreditation_accounts WHERE id = $1
        `, [area_head_id]);

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_id, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Assigned', 'Area Head', $3, $4, $5)
        `, [
            cycle_id, 
            assigned_by, 
            area_id, 
            areaInfo.rows[0]?.area_name,
            `Assigned ${headInfo.rows[0]?.username} as Area Head`
        ]);

        res.json({ success: true, assignment_id: result.rows[0].id });
    } catch (error) {
        console.error('Error assigning area head:', error);
        res.status(500).json({ error: 'Failed to assign area head' });
    }
});

// POST: Assign Accreditor
router.post('/accreditation/assign/accreditor', async (req, res) => {
    const { cycle_id, area_id, accreditor_id, assigned_by } = req.body;

    if (!cycle_id || !area_id || !accreditor_id || !assigned_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO accreditor_assignments (cycle_id, area_id, accreditor_id, assigned_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [cycle_id, area_id, accreditor_id, assigned_by]);

        // Get area and accreditor names for logging
        const [areaInfo, accInfo] = await Promise.all([
            pool.query(`SELECT area_name FROM accreditation_areas WHERE id = $1`, [area_id]),
            pool.query(`SELECT username FROM accreditation_accounts WHERE id = $1`, [accreditor_id])
        ]);

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_id, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Assigned', 'Accreditor', $3, $4, $5)
        `, [
            cycle_id,
            assigned_by,
            area_id,
            areaInfo.rows[0]?.area_name,
            `Assigned ${accInfo.rows[0]?.username} as Accreditor`
        ]);

        res.json({ success: true, assignment_id: result.rows[0].id });
    } catch (error) {
        console.error('Error assigning accreditor:', error);
        res.status(500).json({ error: 'Failed to assign accreditor' });
    }
});

// DELETE: Remove Accreditor Assignment
router.delete('/accreditation/assign/accreditor/:assignmentId', async (req, res) => {
    const { assignmentId } = req.params;
    const { removed_by } = req.body;

    try {
        const result = await pool.query(`
            DELETE FROM accreditor_assignments
            WHERE id = $1
            RETURNING cycle_id, area_id, accreditor_id
        `, [assignmentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Removed', 'Accreditor', 'Assignment', 'Removed accreditor assignment')
        `, [result.rows[0].cycle_id, removed_by]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing accreditor:', error);
        res.status(500).json({ error: 'Failed to remove accreditor' });
    }
});
// ============================================
// SECTION MANAGEMENT ROUTES (for Tab 2)
// ============================================

// GET: All Sections for Active Cycle
router.get('/accreditation/sections/all/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                s.id as section_id,
                s.section_name,
                s.area_id,
                a.area_number,
                a.area_name,
                aa.area_head_id,
                ah.username as area_head_name,
                sub.google_drive_link,
                sub.submitted_at,
                sub.submitted_by,
                r.review_status
            FROM accreditation_sections s
            JOIN accreditation_areas a ON s.area_id = a.id
            LEFT JOIN area_assignments aa ON a.id = aa.area_id AND aa.cycle_id = $1
            LEFT JOIN accreditation_accounts ah ON aa.area_head_id = ah.id
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            LEFT JOIN section_reviews r ON s.id = r.section_id
            WHERE s.cycle_id = $1
            ORDER BY a.area_number, s.section_name
        `, [cycleId]);

        res.json({ sections: result.rows });
    } catch (error) {
        console.error('Error fetching all sections:', error);
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
});

// ============================================
// SECTIONS
// ============================================

// FIXED: GET Sections - Handle "all" parameter correctly
router.get('/accreditation/sections/:cycleId/:areaId', async (req, res) => {
    const { cycleId, areaId } = req.params;

    try {
        let query;
        let params;

        // Check if areaId is "all" - fetch all sections for the cycle
        if (areaId === 'all') {
            query = `
                SELECT 
                    s.id as section_id,
                    s.section_name,
                    s.area_id,
                    a.area_number,
                    a.area_name,
                    sub.google_drive_link,
                    sub.submitted_by,
                    subm.username as submitted_by_name,
                    sub.submitted_at,
                    sub.is_locked,
                    r.review_status,
                    r.comments,
                    r.reviewed_at,
                    rev.username as reviewed_by_name
                FROM accreditation_sections s
                JOIN accreditation_areas a ON s.area_id = a.id
                LEFT JOIN section_submissions sub ON s.id = sub.section_id
                LEFT JOIN accreditation_accounts subm ON sub.submitted_by = subm.id
                LEFT JOIN section_reviews r ON s.id = r.section_id
                LEFT JOIN accreditation_accounts rev ON r.accreditor_id = rev.id
                WHERE s.cycle_id = $1
                ORDER BY a.area_number, s.section_name
            `;
            params = [cycleId];
        } else {
            // Fetch sections for specific area
            query = `
                SELECT 
                    s.id as section_id,
                    s.section_name,
                    sub.google_drive_link,
                    sub.submitted_by,
                    subm.username as submitted_by_name,
                    sub.submitted_at,
                    sub.is_locked,
                    r.review_status,
                    r.comments,
                    r.reviewed_at,
                    rev.username as reviewed_by_name
                FROM accreditation_sections s
                LEFT JOIN section_submissions sub ON s.id = sub.section_id
                LEFT JOIN accreditation_accounts subm ON sub.submitted_by = subm.id
                LEFT JOIN section_reviews r ON s.id = r.section_id
                LEFT JOIN accreditation_accounts rev ON r.accreditor_id = rev.id
                WHERE s.cycle_id = $1 AND s.area_id = $2
                ORDER BY s.section_name
            `;
            params = [cycleId, areaId];
        }

        const result = await pool.query(query, params);
        res.json({ sections: result.rows });
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
});

// ============================================
// ACTIVITY LOG
// ============================================

// POST: Add New Section
router.post('/accreditation/section', async (req, res) => {
    const { cycle_id, area_id, section_name, created_by } = req.body;

    if (!cycle_id || !area_id || !section_name || !created_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if section name already exists in this cycle
        const existingSection = await pool.query(`
            SELECT id FROM accreditation_sections 
            WHERE cycle_id = $1 AND section_name = $2
        `, [cycle_id, section_name]);

        if (existingSection.rows.length > 0) {
            return res.status(400).json({ error: 'Section name already exists in this cycle' });
        }

        const result = await pool.query(`
            INSERT INTO accreditation_sections (cycle_id, area_id, section_name, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id, section_name
        `, [cycle_id, area_id, section_name, created_by]);

        // Get area name for logging
        const areaInfo = await pool.query(`
            SELECT area_name FROM accreditation_areas WHERE id = $1
        `, [area_id]);

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_id, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Created', 'Section', $3, $4, $5)
        `, [
            cycle_id,
            created_by,
            result.rows[0].id,
            section_name,
            `Added section to ${areaInfo.rows[0]?.area_name}`
        ]);

        res.json({ success: true, section: result.rows[0] });
    } catch (error) {
        console.error('Error adding section:', error);
        res.status(500).json({ error: 'Failed to add section' });
    }
});

// PUT: Update Section
router.put('/accreditation/section/:sectionId', async (req, res) => {
    const { sectionId } = req.params;
    const { section_name, area_id, updated_by } = req.body;

    if (!section_name || !area_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(`
            UPDATE accreditation_sections
            SET section_name = $1, area_id = $2
            WHERE id = $3
            RETURNING id, section_name, cycle_id
        `, [section_name, area_id, sectionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_id, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Updated', 'Section', $3, $4, 'Updated section information')
        `, [result.rows[0].cycle_id, updated_by, sectionId, section_name]);

        res.json({ success: true, section: result.rows[0] });
    } catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({ error: 'Failed to update section' });
    }
});

// DELETE: Delete Section
router.delete('/accreditation/section/:sectionId', async (req, res) => {
    const { sectionId } = req.params;
    const { deleted_by } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get section info before deletion
        const sectionInfo = await client.query(`
            SELECT s.section_name, s.cycle_id, sub.id as has_submission
            FROM accreditation_sections s
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            WHERE s.id = $1
        `, [sectionId]);

        if (sectionInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Section not found' });
        }

        if (sectionInfo.rows[0].has_submission) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Cannot delete section with submitted link. Please remove the submission first.' 
            });
        }

        // Delete section
        await client.query(`DELETE FROM accreditation_sections WHERE id = $1`, [sectionId]);

        // Log activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Deleted', 'Section', $3, 'Deleted section')
        `, [sectionInfo.rows[0].cycle_id, deleted_by, sectionInfo.rows[0].section_name]);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting section:', error);
        res.status(500).json({ error: 'Failed to delete section' });
    } finally {
        client.release();
    }
});

// POST: Bulk Import Sections
router.post('/accreditation/sections/bulk', async (req, res) => {
    const { cycle_id, sections, created_by } = req.body;

    if (!cycle_id || !sections || !Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ error: 'Missing required fields or empty sections array' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let successCount = 0;
        let failedCount = 0;
        const errors = [];

        for (const section of sections) {
            const { section_name, area_id } = section;

            if (!section_name || !area_id) {
                failedCount++;
                errors.push(`Missing data for section: ${section_name || 'unnamed'}`);
                continue;
            }

            // Check if section already exists
            const exists = await client.query(`
                SELECT id FROM accreditation_sections 
                WHERE cycle_id = $1 AND section_name = $2
            `, [cycle_id, section_name]);

            if (exists.rows.length > 0) {
                failedCount++;
                errors.push(`Section already exists: ${section_name}`);
                continue;
            }

            // Insert section
            await client.query(`
                INSERT INTO accreditation_sections (cycle_id, area_id, section_name, created_by)
                VALUES ($1, $2, $3, $4)
            `, [cycle_id, area_id, section_name, created_by]);

            successCount++;
        }

        // Log bulk import activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Created', 'Sections', 'Bulk Import', $3)
        `, [cycle_id, created_by, `Bulk imported ${successCount} sections`]);

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            count: successCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error bulk importing sections:', error);
        res.status(500).json({ error: 'Failed to bulk import sections' });
    } finally {
        client.release();
    }
});

// ============================================
// ACCOUNT MANAGEMENT ROUTES (for Tab 2)
// ============================================

// GET: All Area Heads
router.get('/accreditation/area-heads', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.id,
                a.username as name,
                a.email,
                a.is_active,
                a.last_login,
                COUNT(DISTINCT aa.area_id) as area_count,
                STRING_AGG(DISTINCT ar.area_name, ', ') as assigned_areas,
                COUNT(DISTINCT s.id) as section_count
            FROM accreditation_accounts a
            LEFT JOIN area_assignments aa ON a.id = aa.area_head_id
            LEFT JOIN accreditation_areas ar ON aa.area_id = ar.id
            LEFT JOIN accreditation_sections s ON aa.area_id = s.area_id AND aa.cycle_id = s.cycle_id
            WHERE a.role = 'Area Head'
            GROUP BY a.id, a.username, a.email, a.is_active, a.last_login
            ORDER BY a.username
        `);

        res.json({ areaHeads: result.rows });
    } catch (error) {
        console.error('Error fetching area heads:', error);
        res.status(500).json({ error: 'Failed to fetch area heads' });
    }
});

// GET: All Accreditors
router.get('/accreditation/accreditors', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.id,
                a.username as name,
                a.email,
                a.is_active,
                a.last_login,
                COUNT(DISTINCT ac.area_id) as area_count,
                STRING_AGG(DISTINCT ar.area_name, ', ') as assigned_areas,
                COUNT(DISTINCT r.id) as review_count
            FROM accreditation_accounts a
            LEFT JOIN accreditor_assignments ac ON a.id = ac.accreditor_id
            LEFT JOIN accreditation_areas ar ON ac.area_id = ar.id
            LEFT JOIN section_reviews r ON a.id = r.accreditor_id
            WHERE a.role = 'Accreditor'
            GROUP BY a.id, a.username, a.email, a.is_active, a.last_login
            ORDER BY a.username
        `);

        res.json({ accreditors: result.rows });
    } catch (error) {
        console.error('Error fetching accreditors:', error);
        res.status(500).json({ error: 'Failed to fetch accreditors' });
    }
});

// ============================================
// REVIEW MONITORING ROUTES
// ============================================

// GET: Review Statistics for Progress Overview
router.get('/accreditation/review-stats/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            WITH section_counts AS (
                SELECT 
                    COUNT(DISTINCT s.id) AS total_sections,
                    COUNT(DISTINCT CASE WHEN r.review_status IS NOT NULL AND r.review_status != 'Not Reviewed' THEN s.id END) AS reviewed_count,
                    COUNT(DISTINCT CASE WHEN r.review_status = 'Complete' THEN s.id END) AS complete_count,
                    COUNT(DISTINCT CASE WHEN r.review_status = 'Needs Revision' THEN s.id END) AS needs_revision_count,
                    COUNT(DISTINCT CASE WHEN r.review_status = 'Incomplete' THEN s.id END) AS incomplete_count,
                    COUNT(DISTINCT CASE WHEN r.review_status IS NULL OR r.review_status = 'Not Reviewed' THEN s.id END) AS not_reviewed_count
                FROM accreditation_sections s
                LEFT JOIN section_reviews r ON s.id = r.section_id
                WHERE s.cycle_id = $1
            ),
            accreditor_stats AS (
                SELECT 
                    COUNT(DISTINCT ac.accreditor_id) AS total_accreditors,
                    acc.username AS top_reviewer_name,
                    COUNT(r.id) AS review_count
                FROM accreditor_assignments ac
                LEFT JOIN section_reviews r ON ac.accreditor_id = r.accreditor_id
                LEFT JOIN accreditation_accounts acc ON ac.accreditor_id = acc.id
                WHERE ac.cycle_id = $1
                GROUP BY acc.username
                ORDER BY review_count DESC
                LIMIT 1
            )
            SELECT 
                sc.*,
                COALESCE(acs.total_accreditors, 0) AS total_accreditors,
                acs.top_reviewer_name
            FROM section_counts sc
            LEFT JOIN accreditor_stats acs ON true
        `, [cycleId]);

        res.json({ stats: result.rows[0] });
    } catch (error) {
        console.error('Error fetching review stats:', error);
        res.status(500).json({ error: 'Failed to fetch review statistics' });
    }
});

// GET: Areas with Review Breakdown
router.get('/accreditation/areas-review/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                a.id as area_id,
                a.area_number,
                a.area_name,
                COUNT(DISTINCT s.id) as total_sections,
                COUNT(DISTINCT CASE WHEN r.review_status IS NOT NULL AND r.review_status != 'Not Reviewed' THEN s.id END) as reviewed_sections,
                COUNT(DISTINCT CASE WHEN r.review_status = 'Complete' THEN s.id END) as complete_sections,
                COUNT(DISTINCT CASE WHEN r.review_status = 'Needs Revision' THEN s.id END) as needs_revision_count,
                COUNT(DISTINCT CASE WHEN r.review_status = 'Incomplete' THEN s.id END) as incomplete_count,
                COUNT(DISTINCT CASE WHEN r.review_status IS NULL OR r.review_status = 'Not Reviewed' THEN s.id END) as not_reviewed_count
            FROM accreditation_areas a
            LEFT JOIN accreditation_sections s ON a.id = s.area_id AND s.cycle_id = $1
            LEFT JOIN section_reviews r ON s.id = r.section_id
            GROUP BY a.id, a.area_number, a.area_name
            ORDER BY a.area_number
        `, [cycleId]);

        res.json({ areas: result.rows });
    } catch (error) {
        console.error('Error fetching areas review breakdown:', error);
        res.status(500).json({ error: 'Failed to fetch areas review data' });
    }
});

// GET: All Reviews with Details
router.get('/accreditation/reviews/all/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                s.id as section_id,
                s.section_name,
                s.area_id,
                a.area_number,
                a.area_name,
                sub.google_drive_link,
                sub.submitted_at,
                r.review_status,
                r.comments,
                r.reviewed_at,
                r.accreditor_id,
                acc.username as reviewed_by_name
            FROM accreditation_sections s
            JOIN accreditation_areas a ON s.area_id = a.id
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            LEFT JOIN section_reviews r ON s.id = r.section_id
            LEFT JOIN accreditation_accounts acc ON r.accreditor_id = acc.id
            WHERE s.cycle_id = $1
            ORDER BY a.area_number, s.section_name
        `, [cycleId]);

        res.json({ reviews: result.rows });
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// GET: Accreditor Performance Summary
router.get('/accreditation/accreditor-performance/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                a.id as accreditor_id,
                a.username as accreditor_name,
                STRING_AGG(DISTINCT ar.area_name, ', ') as assigned_areas,
                COUNT(DISTINCT s.id) as total_assigned,
                COUNT(DISTINCT r.id) as reviewed_count,
                MAX(r.reviewed_at) as last_activity
            FROM accreditation_accounts a
            JOIN accreditor_assignments ac ON a.id = ac.accreditor_id
            JOIN accreditation_areas ar ON ac.area_id = ar.id
            LEFT JOIN accreditation_sections s ON ac.area_id = s.area_id AND s.cycle_id = $1
            LEFT JOIN section_reviews r ON s.id = r.section_id AND r.accreditor_id = a.id
            WHERE ac.cycle_id = $1
            GROUP BY a.id, a.username
            ORDER BY reviewed_count DESC, a.username
        `, [cycleId]);

        res.json({ performance: result.rows });
    } catch (error) {
        console.error('Error fetching accreditor performance:', error);
        res.status(500).json({ error: 'Failed to fetch accreditor performance' });
    }
});

// POST: Send Reminder to Accreditor
router.post('/accreditation/send-reminder', async (req, res) => {
    const { accreditor_id, section_name, sent_by } = req.body;

    if (!accreditor_id || !sent_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Get accreditor email
        const accreditorResult = await pool.query(`
            SELECT email, username FROM accreditation_accounts WHERE id = $1
        `, [accreditor_id]);

        if (accreditorResult.rows.length === 0) {
            return res.status(404).json({ error: 'Accreditor not found' });
        }

        const accreditor = accreditorResult.rows[0];

        // TODO: Implement actual email sending logic here
        console.log(`Reminder sent to ${accreditor.email} (${accreditor.username})`);
        if (section_name) {
            console.log(`Section: ${section_name}`);
        }

        // Log activity
        const cycleResult = await pool.query(`
            SELECT cycle_id FROM accreditor_assignments WHERE accreditor_id = $1 LIMIT 1
        `, [accreditor_id]);

        if (cycleResult.rows.length > 0) {
            await pool.query(`
                INSERT INTO accreditation_activity_log (
                    cycle_id, user_id, user_role, action_type, 
                    target_type, target_name, details
                )
                VALUES ($1, $2, 'AdminLlave', 'Sent Reminder', 'Accreditor', $3, $4)
            `, [
                cycleResult.rows[0].cycle_id,
                sent_by,
                accreditor.adminid,
                section_name ? `Reminder sent for section: ${section_name}` : 'General reminder sent'
            ]);
        }

        res.json({ 
            success: true, 
            message: `Reminder sent to ${accreditor.adminid}` 
        });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ error: 'Failed to send reminder' });
    }
});
// ============================================
// ACCOUNT MANAGEMENT ROUTES
// ============================================

// POST: Create Area Head Account
router.post('/accreditation/account/area-head', async (req, res) => {
    const { username, password, full_name, email, created_by } = req.body;

    if (!username || !password || !full_name || !email || !created_by) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength (min 8 characters)
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if username already exists
        const usernameCheck = await client.query(
            'SELECT id FROM accreditation_accounts WHERE username = $1',
            [username]
        );
        if (usernameCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Check if email already exists
        const emailCheck = await client.query(
            'SELECT id FROM accreditation_accounts WHERE email = $1',
            [email]
        );
        if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create account
        const result = await client.query(`
            INSERT INTO accreditation_accounts (username, password, full_name, email, role, created_by)
            VALUES ($1, $2, $3, $4, 'Area Head', $5)
            RETURNING id, username, full_name, email, role, created_at
        `, [username, hashedPassword, full_name, email, created_by]);

        const account = result.rows[0];

        // Log activity
        const cycleResult = await client.query(
            'SELECT id FROM accreditation_cycles WHERE status = $1 LIMIT 1',
            ['Active']
        );

        if (cycleResult.rows.length > 0) {
            await client.query(`
                INSERT INTO accreditation_activity_log (
                    cycle_id, user_id, user_role, action_type, 
                    target_type, target_name, details
                )
                VALUES ($1, $2, 'AdminLlave', 'Created', 'Area Head Account', $3, $4)
            `, [
                cycleResult.rows[0].id,
                created_by,
                full_name,
                `Created Area Head account: ${username}`
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, account });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating Area Head account:', error);
        res.status(500).json({ error: 'Failed to create Area Head account' });
    } finally {
        client.release();
    }
});

// POST: Create Accreditor Account
router.post('/accreditation/account/accreditor', async (req, res) => {
    const { username, password, full_name, email, created_by } = req.body;

    if (!username || !password || !full_name || !email || !created_by) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if username already exists
        const usernameCheck = await client.query(
            'SELECT id FROM accreditation_accounts WHERE username = $1',
            [username]
        );
        if (usernameCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Check if email already exists
        const emailCheck = await client.query(
            'SELECT id FROM accreditation_accounts WHERE email = $1',
            [email]
        );
        if (emailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create account
        const result = await client.query(`
            INSERT INTO accreditation_accounts (username, password, full_name, email, role, created_by)
            VALUES ($1, $2, $3, $4, 'Accreditor', $5)
            RETURNING id, username, full_name, email, role, created_at
        `, [username, hashedPassword, full_name, email, created_by]);

        const account = result.rows[0];

        // Log activity
        const cycleResult = await client.query(
            'SELECT id FROM accreditation_cycles WHERE status = $1 LIMIT 1',
            ['Active']
        );

        if (cycleResult.rows.length > 0) {
            await client.query(`
                INSERT INTO accreditation_activity_log (
                    cycle_id, user_id, user_role, action_type, 
                    target_type, target_name, details
                )
                VALUES ($1, $2, 'AdminLlave', 'Created', 'Accreditor Account', $3, $4)
            `, [
                cycleResult.rows[0].id,
                created_by,
                full_name,
                `Created Accreditor account: ${username}`
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, account });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating Accreditor account:', error);
        res.status(500).json({ error: 'Failed to create Accreditor account' });
    } finally {
        client.release();
    }
});

// PUT: Update Account
router.put('/accreditation/account/:accountId', async (req, res) => {
    const { accountId } = req.params;
    const { full_name, email, is_active, updated_by } = req.body;

    if (!full_name || !email) {
        return res.status(400).json({ error: 'Full name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        // Check if email is already used by another account
        const emailCheck = await pool.query(
            'SELECT id FROM accreditation_accounts WHERE email = $1 AND id != $2',
            [email, accountId]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const result = await pool.query(`
            UPDATE accreditation_accounts
            SET full_name = $1, email = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, username, full_name, email, role, is_active
        `, [full_name, email, is_active !== undefined ? is_active : true, accountId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({ success: true, account: result.rows[0] });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: 'Failed to update account' });
    }
});

// PUT: Reset Password
router.put('/accreditation/account/:accountId/reset-password', async (req, res) => {
    const { accountId } = req.params;
    const { new_password, reset_by } = req.body;

    if (!new_password) {
        return res.status(400).json({ error: 'New password is required' });
    }

    if (new_password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    try {
        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        const result = await pool.query(`
            UPDATE accreditation_accounts
            SET password = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, username, full_name
        `, [hashedPassword, accountId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// DELETE: Delete Account
router.delete('/accreditation/account/:accountId', async (req, res) => {
    const { accountId } = req.params;
    const { deleted_by } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get account info
        const accountInfo = await client.query(
            'SELECT username, full_name, role FROM accreditation_accounts WHERE id = $1',
            [accountId]
        );

        if (accountInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Account not found' });
        }

        const account = accountInfo.rows[0];

        // Check for assignments
        if (account.role === 'Area Head') {
            const assignments = await client.query(
                'SELECT COUNT(*) as count FROM area_assignments WHERE area_head_id = $1',
                [accountId]
            );
            if (parseInt(assignments.rows[0].count) > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Cannot delete Area Head with active area assignments. Please reassign areas first.' 
                });
            }
        } else if (account.role === 'Accreditor') {
            const assignments = await client.query(
                'SELECT COUNT(*) as count FROM accreditor_assignments WHERE accreditor_id = $1',
                [accountId]
            );
            if (parseInt(assignments.rows[0].count) > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Cannot delete Accreditor with active area assignments. Please reassign areas first.' 
                });
            }
        }

        // Delete account
        await client.query('DELETE FROM accreditation_accounts WHERE id = $1', [accountId]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    } finally {
        client.release();
    }
});
// Additional routes to add to accreditationRoute.js
// Add these after the existing routes

// ============================================
// GET: Available Area Heads (not yet assigned to any area in current cycle)
// ============================================
router.get('/accreditation/available-area-heads/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                acc.id,
                acc.username,
                acc.full_name,
                acc.email
            FROM accreditation_accounts acc
            WHERE acc.role = 'Area Head'
                AND acc.is_active = TRUE
                AND acc.id NOT IN (
                    SELECT area_head_id 
                    FROM area_assignments 
                    WHERE cycle_id = $1
                )
            ORDER BY acc.full_name
        `, [cycleId]);

        res.json({ areaHeads: result.rows });
    } catch (error) {
        console.error('Error fetching available area heads:', error);
        res.status(500).json({ error: 'Failed to fetch available area heads' });
    }
});

// ============================================
// GET: Available Accreditors (for a specific area)
// ============================================
router.get('/accreditation/available-accreditors/:cycleId/:areaId', async (req, res) => {
    const { cycleId, areaId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                acc.id,
                acc.username,
                acc.full_name,
                acc.email
            FROM accreditation_accounts acc
            WHERE acc.role = 'Accreditor'
                AND acc.is_active = TRUE
                AND acc.id NOT IN (
                    SELECT accreditor_id 
                    FROM accreditor_assignments 
                    WHERE cycle_id = $1 AND area_id = $2
                )
            ORDER BY acc.full_name
        `, [cycleId, areaId]);

        res.json({ accreditors: result.rows });
    } catch (error) {
        console.error('Error fetching available accreditors:', error);
        res.status(500).json({ error: 'Failed to fetch available accreditors' });
    }
});

// ============================================
// GET: All Accounts with Assignment Details
// ============================================
router.get('/accreditation/accounts-with-assignments/:cycleId', async (req, res) => {
    const { cycleId } = req.params;

    try {
        // Get Area Heads with assignments
        const areaHeadsResult = await pool.query(`
            SELECT 
                acc.id,
                acc.username,
                acc.full_name as name,
                acc.email,
                acc.is_active,
                acc.last_login,
                COUNT(DISTINCT aa.area_id) as area_count,
                STRING_AGG(DISTINCT a.area_name, ', ' ORDER BY a.area_name) as assigned_areas,
                COUNT(DISTINCT s.id) as section_count
            FROM accreditation_accounts acc
            LEFT JOIN area_assignments aa ON acc.id = aa.area_head_id AND aa.cycle_id = $1
            LEFT JOIN accreditation_areas a ON aa.area_id = a.id
            LEFT JOIN accreditation_sections s ON aa.area_id = s.area_id AND s.cycle_id = $1
            WHERE acc.role = 'Area Head'
            GROUP BY acc.id, acc.username, acc.full_name, acc.email, acc.is_active, acc.last_login
            ORDER BY acc.full_name
        `, [cycleId]);

        // Get Accreditors with assignments
        const accreditorsResult = await pool.query(`
            SELECT 
                acc.id,
                acc.username,
                acc.full_name as name,
                acc.email,
                acc.is_active,
                acc.last_login,
                COUNT(DISTINCT ac.area_id) as area_count,
                STRING_AGG(DISTINCT a.area_name, ', ' ORDER BY a.area_name) as assigned_areas,
                COUNT(DISTINCT r.id) as review_count
            FROM accreditation_accounts acc
            LEFT JOIN accreditor_assignments ac ON acc.id = ac.accreditor_id AND ac.cycle_id = $1
            LEFT JOIN accreditation_areas a ON ac.area_id = a.id
            LEFT JOIN section_reviews r ON acc.id = r.accreditor_id
            WHERE acc.role = 'Accreditor'
            GROUP BY acc.id, acc.username, acc.full_name, acc.email, acc.is_active, acc.last_login
            ORDER BY acc.full_name
        `, [cycleId]);

        res.json({ 
            areaHeads: areaHeadsResult.rows,
            accreditors: accreditorsResult.rows
        });
    } catch (error) {
        console.error('Error fetching accounts with assignments:', error);
        res.status(500).json({ error: 'Failed to fetch accounts with assignments' });
    }
});

// ============================================
// PUT: Remove Area Head Assignment
// ============================================
router.delete('/accreditation/assign/area-head/:cycleId/:areaId', async (req, res) => {
    const { cycleId, areaId } = req.params;
    const { removed_by } = req.body;

    try {
        const result = await pool.query(`
            DELETE FROM area_assignments
            WHERE cycle_id = $1 AND area_id = $2
            RETURNING id, area_head_id
        `, [cycleId, areaId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Removed', 'Area Head Assignment', 'Area Assignment', 'Removed area head assignment')
        `, [cycleId, removed_by]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing area head assignment:', error);
        res.status(500).json({ error: 'Failed to remove area head assignment' });
    }
});

// ============================================
// GET: Specific Account Details with Full Assignment Info
// ============================================
router.get('/accreditation/account/:accountId/details/:cycleId', async (req, res) => {
    const { accountId, cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                acc.id,
                acc.username,
                acc.full_name,
                acc.email,
                acc.role,
                acc.is_active,
                acc.last_login,
                acc.created_at,
                CASE 
                    WHEN acc.role = 'Area Head' THEN (
                        SELECT json_agg(
                            json_build_object(
                                'area_id', a.id,
                                'area_number', a.area_number,
                                'area_name', a.area_name,
                                'assigned_at', aa.assigned_at,
                                'section_count', (
                                    SELECT COUNT(*) 
                                    FROM accreditation_sections 
                                    WHERE area_id = a.id AND cycle_id = $2
                                )
                            )
                        )
                        FROM area_assignments aa
                        JOIN accreditation_areas a ON aa.area_id = a.id
                        WHERE aa.area_head_id = acc.id AND aa.cycle_id = $2
                    )
                    WHEN acc.role = 'Accreditor' THEN (
                        SELECT json_agg(
                            json_build_object(
                                'area_id', a.id,
                                'area_number', a.area_number,
                                'area_name', a.area_name,
                                'assigned_at', ac.assigned_at,
                                'review_count', (
                                    SELECT COUNT(*) 
                                    FROM section_reviews sr
                                    JOIN accreditation_sections s ON sr.section_id = s.id
                                    WHERE sr.accreditor_id = acc.id 
                                        AND s.area_id = a.id 
                                        AND s.cycle_id = $2
                                )
                            )
                        )
                        FROM accreditor_assignments ac
                        JOIN accreditation_areas a ON ac.area_id = a.id
                        WHERE ac.accreditor_id = acc.id AND ac.cycle_id = $2
                    )
                END as assignments
            FROM accreditation_accounts acc
            WHERE acc.id = $1
        `, [accountId, cycleId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({ account: result.rows[0] });
    } catch (error) {
        console.error('Error fetching account details:', error);
        res.status(500).json({ error: 'Failed to fetch account details' });
    }
});
router.delete('/accreditation/assign/accreditor/:cycleId/:areaId/:accreditorId', async (req, res) => {
    const { cycleId, areaId, accreditorId } = req.params;
    const { removed_by } = req.body;

    try {
        // Find and delete the assignment
        const result = await pool.query(`
            DELETE FROM accreditor_assignments
            WHERE cycle_id = $1 AND area_id = $2 AND accreditor_id = $3
            RETURNING id
        `, [cycleId, areaId, accreditorId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Log activity
        await pool.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type, 
                target_type, target_name, details
            )
            VALUES ($1, $2, 'AdminLlave', 'Removed', 'Accreditor Assignment', 'Area Assignment', 'Removed accreditor from area')
        `, [cycleId, removed_by]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing accreditor assignment:', error);
        res.status(500).json({ error: 'Failed to remove accreditor assignment' });
    }
});
// Add these routes to backend/routes/accreditationRoute.js
// Place them after the existing routes

// ============================================
// AREA HEAD - SUBMISSION ROUTES
// ============================================

// POST: Submit Google Drive Link
router.post('/accreditation/submission/:sectionId', async (req, res) => {
    const { sectionId } = req.params;
    const { google_drive_link, submitted_by } = req.body;

    if (!google_drive_link || !submitted_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if submissions are open
        const sectionResult = await client.query(`
            SELECT s.cycle_id, s.section_name, s.area_id
            FROM accreditation_sections s
            WHERE s.id = $1
        `, [sectionId]);

        if (sectionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Section not found' });
        }

        const section = sectionResult.rows[0];

        // Check submission control
        const controlResult = await client.query(`
            SELECT is_open FROM submission_control WHERE cycle_id = $1
        `, [section.cycle_id]);

        if (controlResult.rows.length === 0 || !controlResult.rows[0].is_open) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Submissions are currently closed' });
        }

        // Insert or update submission
        const submissionResult = await client.query(`
            INSERT INTO section_submissions (section_id, google_drive_link, submitted_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (section_id) 
            DO UPDATE SET 
                google_drive_link = $2,
                last_updated_at = CURRENT_TIMESTAMP
            RETURNING id, submitted_at
        `, [sectionId, google_drive_link, submitted_by]);

        // Log activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type,
                target_type, target_id, target_name, details
            )
            VALUES ($1, $2, 'Area Head', 'Submitted', 'Section Link', $3, $4, $5)
        `, [
            section.cycle_id,
            submitted_by,
            sectionId,
            section.section_name,
            `Submitted Google Drive link`
        ]);

        await client.query('COMMIT');
        res.json({ 
            success: true, 
            submission: submissionResult.rows[0],
            message: 'Link submitted successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error submitting link:', error);
        res.status(500).json({ error: 'Failed to submit link' });
    } finally {
        client.release();
    }
});

// PUT: Update Google Drive Link
router.put('/accreditation/submission/:sectionId', async (req, res) => {
    const { sectionId } = req.params;
    const { google_drive_link, submitted_by } = req.body;

    if (!google_drive_link) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if submissions are open
        const sectionResult = await client.query(`
            SELECT s.cycle_id, s.section_name, sub.is_locked
            FROM accreditation_sections s
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            WHERE s.id = $1
        `, [sectionId]);

        if (sectionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Section not found' });
        }

        const section = sectionResult.rows[0];

        // Check if locked
        if (section.is_locked) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'This submission is locked' });
        }

        // Check submission control
        const controlResult = await client.query(`
            SELECT is_open FROM submission_control WHERE cycle_id = $1
        `, [section.cycle_id]);

        if (controlResult.rows.length === 0 || !controlResult.rows[0].is_open) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Submissions are currently closed' });
        }

        // Update submission
        const updateResult = await client.query(`
            UPDATE section_submissions
            SET google_drive_link = $1, last_updated_at = CURRENT_TIMESTAMP
            WHERE section_id = $2
            RETURNING id, last_updated_at
        `, [google_drive_link, sectionId]);

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Log activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type,
                target_type, target_id, target_name, details
            )
            VALUES ($1, $2, 'Area Head', 'Updated', 'Section Link', $3, $4, $5)
        `, [
            section.cycle_id,
            submitted_by,
            sectionId,
            section.section_name,
            `Updated Google Drive link`
        ]);

        await client.query('COMMIT');
        res.json({ 
            success: true, 
            submission: updateResult.rows[0],
            message: 'Link updated successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating link:', error);
        res.status(500).json({ error: 'Failed to update link' });
    } finally {
        client.release();
    }
});

// DELETE: Remove Google Drive Link
router.delete('/accreditation/submission/:sectionId', async (req, res) => {
    const { sectionId } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if submissions are open
        const sectionResult = await client.query(`
            SELECT s.cycle_id, s.section_name, sub.is_locked
            FROM accreditation_sections s
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            WHERE s.id = $1
        `, [sectionId]);

        if (sectionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Section not found' });
        }

        const section = sectionResult.rows[0];

        // Check if locked
        if (section.is_locked) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'This submission is locked' });
        }

        // Check submission control
        const controlResult = await client.query(`
            SELECT is_open FROM submission_control WHERE cycle_id = $1
        `, [section.cycle_id]);

        if (controlResult.rows.length === 0 || !controlResult.rows[0].is_open) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Submissions are currently closed' });
        }

        // Delete submission
        await client.query(`
            DELETE FROM section_submissions WHERE section_id = $1
        `, [sectionId]);

        await client.query('COMMIT');
        res.json({ 
            success: true,
            message: 'Link removed successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error removing link:', error);
        res.status(500).json({ error: 'Failed to remove link' });
    } finally {
        client.release();
    }
});

// GET: Get Area Head's Activity
router.get('/accreditation/area-head/activity/:areaHeadId/:cycleId', async (req, res) => {
    const { areaHeadId, cycleId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                log.id,
                log.action_type,
                log.target_type,
                log.target_name,
                log.details,
                log.created_at
            FROM accreditation_activity_log log
            WHERE log.user_id = $1 
                AND log.cycle_id = $2
                AND log.user_role = 'Area Head'
            ORDER BY log.created_at DESC
            LIMIT 50
        `, [areaHeadId, cycleId]);

        res.json({ activities: result.rows });
    } catch (error) {
        console.error('Error fetching area head activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// POST: Submit/Update Review
router.post('/accreditation/review/:sectionId', async (req, res) => {
    const { sectionId } = req.params;
    const { review_status, comments, accreditor_id } = req.body;

    if (!review_status || !accreditor_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get section info
        const sectionResult = await client.query(`
            SELECT s.cycle_id, s.section_name, s.area_id
            FROM accreditation_sections s
            WHERE s.id = $1
        `, [sectionId]);

        if (sectionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Section not found' });
        }

        const section = sectionResult.rows[0];

        // Insert or update review
        const reviewResult = await client.query(`
            INSERT INTO section_reviews (section_id, accreditor_id, review_status, comments)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (section_id) 
            DO UPDATE SET 
                accreditor_id = $2,
                review_status = $3,
                comments = $4,
                reviewed_at = CURRENT_TIMESTAMP,
                last_updated_at = CURRENT_TIMESTAMP
            RETURNING id, reviewed_at
        `, [sectionId, accreditor_id, review_status, comments]);

        // Log activity
        await client.query(`
            INSERT INTO accreditation_activity_log (
                cycle_id, user_id, user_role, action_type,
                target_type, target_id, target_name, details
            )
            VALUES ($1, $2, 'Accreditor', 'Reviewed', 'Section', $3, $4, $5)
        `, [
            section.cycle_id,
            accreditor_id,
            sectionId,
            section.section_name,
            `Marked as ${review_status}`
        ]);

        await client.query('COMMIT');
        res.json({ 
            success: true, 
            review: reviewResult.rows[0],
            message: 'Review submitted successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error submitting review:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    } finally {
        client.release();
    }
});

//login
router.post('/accreditation/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username and password are required' 
        });
    }

    try {
        const result = await pool.query(`
            SELECT 
                id, username, password, full_name, email, role, is_active
            FROM accreditation_accounts
            WHERE username = $1
        `, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({ 
                success: false, 
                error: 'Account is inactive. Please contact administrator.' 
            });
        }

        // ✅ FIXED: Use bcrypt to compare passwords
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }

        // Update last login
        await pool.query(`
            UPDATE accreditation_accounts
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [user.id]);

        // Remove password from response
        delete user.password;

        res.json({
            success: true,
            message: 'Login successful',
            user: user,
            redirectUrl: user.role === 'Area Head' 
                ? '/private/html/adminPages/adminLlave/areaHead/areaHead.html'
                : '/private/html/adminPages/adminLlave/accreditor/accreditor.html'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Login failed. Please try again.' 
        });
    }
});
export default router;