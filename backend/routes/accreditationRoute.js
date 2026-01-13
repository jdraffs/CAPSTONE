// backend/routes/accreditationRoute.js
import express from 'express';
import pool from '../db.js';

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
                ah.adminid as area_head_name,
                COUNT(DISTINCT s.id) as total_sections,
                COUNT(DISTINCT CASE WHEN sub.id IS NOT NULL THEN s.id END) as submitted_sections,
                COUNT(DISTINCT CASE WHEN r.review_status IS NOT NULL AND r.review_status != 'Not Reviewed' THEN s.id END) as reviewed_sections,
                COUNT(DISTINCT CASE WHEN r.review_status = 'Complete' THEN s.id END) as complete_sections
            FROM accreditation_areas a
            LEFT JOIN area_assignments aa ON a.id = aa.area_id AND aa.cycle_id = $1
            LEFT JOIN admin_accounts ah ON aa.area_head_id = ah.id
            LEFT JOIN accreditation_sections s ON a.id = s.area_id AND s.cycle_id = $1
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            LEFT JOIN section_reviews r ON s.id = r.section_id
            GROUP BY a.id, a.area_number, a.area_name, aa.area_head_id, ah.adminid
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
                acc.adminid as accreditor_name,
            FROM accreditor_assignments ac
            JOIN admin_accounts acc ON ac.accreditor_id = acc.id
            WHERE ac.cycle_id = $1 AND ac.area_id = $2
            ORDER BY acc.adminid
        `, [cycleId, areaId]);

        res.json({ accreditors: result.rows });
    } catch (error) {
        console.error('Error fetching accreditors:', error);
        res.status(500).json({ error: 'Failed to fetch accreditors' });
    }
});

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
            SELECT adminid FROM admin_accounts WHERE id = $1
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
            `Assigned ${headInfo.rows[0]?.adminid} as Area Head`
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
            pool.query(`SELECT adminid FROM admin_accounts WHERE id = $1`, [accreditor_id])
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
            `Assigned ${accInfo.rows[0]?.adminid} as Accreditor`
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
// SECTIONS
// ============================================

// GET: Sections for an Area
router.get('/accreditation/sections/:cycleId/:areaId', async (req, res) => {
    const { cycleId, areaId } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                s.id as section_id,
                s.section_name,
                sub.google_drive_link,
                sub.submitted_by,
                subm.adminid as submitted_by_name,
                sub.submitted_at,
                sub.is_locked,
                r.review_status,
                r.comments,
                r.reviewed_at,
                rev.adminid as reviewed_by_name
            FROM accreditation_sections s
            LEFT JOIN section_submissions sub ON s.id = sub.section_id
            LEFT JOIN admin_accounts subm ON sub.submitted_by = subm.id
            LEFT JOIN section_reviews r ON s.id = r.section_id
            LEFT JOIN admin_accounts rev ON r.accreditor_id = rev.id
            WHERE s.cycle_id = $1 AND s.area_id = $2
            ORDER BY s.section_name
        `, [cycleId, areaId]);

        res.json({ sections: result.rows });
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
});

// ============================================
// ACTIVITY LOG
// ============================================

// GET: Recent Activity
router.get('/accreditation/activity/:cycleId', async (req, res) => {
    const { cycleId } = req.params;
    const { limit = 15 } = req.query;

    try {
        const result = await pool.query(`
            SELECT 
                al.id,
                al.created_at,
                a.adminid as user_name,
                al.user_role,
                al.action_type,
                al.target_name,
                al.details
            FROM accreditation_activity_log al
            LEFT JOIN admin_accounts a ON al.user_id = a.id
            WHERE al.cycle_id = $1
            ORDER BY al.created_at DESC
            LIMIT $2
        `, [cycleId, limit]);

        res.json({ activities: result.rows });
    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});
// Add these routes to backend/routes/accreditationRoute.js

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
                ah.adminid as area_head_name,
                sub.google_drive_link,
                sub.submitted_at,
                sub.submitted_by,
                r.review_status
            FROM accreditation_sections s
            JOIN accreditation_areas a ON s.area_id = a.id
            LEFT JOIN area_assignments aa ON a.id = aa.area_id AND aa.cycle_id = $1
            LEFT JOIN admin_accounts ah ON aa.area_head_id = ah.id
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
                a.adminid as name,
                a.email,
                a.is_active,
                a.last_login,
                COUNT(DISTINCT aa.area_id) as area_count,
                STRING_AGG(DISTINCT ar.area_name, ', ') as assigned_areas,
                COUNT(DISTINCT s.id) as section_count
            FROM admin_accounts a
            LEFT JOIN area_assignments aa ON a.id = aa.area_head_id
            LEFT JOIN accreditation_areas ar ON aa.area_id = ar.id
            LEFT JOIN accreditation_sections s ON aa.area_id = s.area_id AND aa.cycle_id = s.cycle_id
            WHERE a.role = 'Area Head'
            GROUP BY a.id, a.adminid, a.email, a.is_active, a.last_login
            ORDER BY a.adminid
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
                a.adminid as name,
                a.email,
                a.is_active,
                a.last_login,
                COUNT(DISTINCT ac.area_id) as area_count,
                STRING_AGG(DISTINCT ar.area_name, ', ') as assigned_areas,
                COUNT(DISTINCT r.id) as review_count
            FROM admin_accounts a
            LEFT JOIN accreditor_assignments ac ON a.id = ac.accreditor_id
            LEFT JOIN accreditation_areas ar ON ac.area_id = ar.id
            LEFT JOIN section_reviews r ON a.id = r.accreditor_id
            WHERE a.role = 'Accreditor'
            GROUP BY a.id, a.adminid, a.email, a.is_active, a.last_login
            ORDER BY a.adminid
        `);

        res.json({ accreditors: result.rows });
    } catch (error) {
        console.error('Error fetching accreditors:', error);
        res.status(500).json({ error: 'Failed to fetch accreditors' });
    }
});

// Note: Account creation/editing/deletion should be integrated with 
// your existing user management system (userManagementRoute.js)

export default router;