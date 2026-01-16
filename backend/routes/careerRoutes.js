// careerRoutes.js - Career Directory (Information Dissemination Only)
import express from 'express';
import pkg from 'pg';

const router = express.Router();
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'capstone_db',
  password: 'Kisses123',
  port: 5432
});

// ============================================
// PARTNER ORGANIZATIONS DIRECTORY (ADMIN)
// ============================================

// Get all partner organizations
router.get('/organizations/all', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    let query = 'SELECT * FROM partner_organizations WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, organizations: result.rows });
  } catch (err) {
    console.error('Error fetching organizations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

// Create new partner organization
router.post('/organizations/create', async (req, res) => {
  try {
    const { name, category, description, website_url, careers_page_url, logo_url, adminid } = req.body;
    
    // Check for duplicate name
    const checkName = await pool.query(
      'SELECT id FROM partner_organizations WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (checkName.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'An organization with this name already exists.' 
      });
    }
    
    // Check for duplicate website URL
    const checkUrl = await pool.query(
      'SELECT id FROM partner_organizations WHERE website_url = $1',
      [website_url]
    );
    
    if (checkUrl.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'An organization with this website URL already exists.' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO partner_organizations 
       (name, category, description, website_url, careers_page_url, logo_url, adminid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, category, description, website_url, careers_page_url, logo_url, adminid]
    );
    
    res.json({ success: true, organization: result.rows[0] });
  } catch (err) {
    console.error('Error creating organization:', err);
    res.status(500).json({ success: false, message: 'Failed to create organization' });
  }
});

// Update partner organization
router.put('/organizations/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, website_url, careers_page_url, logo_url, status } = req.body;
    
    // Check for duplicate name (excluding current organization)
    const checkName = await pool.query(
      'SELECT id FROM partner_organizations WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name, id]
    );
    
    if (checkName.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'An organization with this name already exists.' 
      });
    }
    
    // Check for duplicate website URL (excluding current organization)
    const checkUrl = await pool.query(
      'SELECT id FROM partner_organizations WHERE website_url = $1 AND id != $2',
      [website_url, id]
    );
    
    if (checkUrl.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'An organization with this website URL already exists.' 
      });
    }
    
    const result = await pool.query(
      `UPDATE partner_organizations 
       SET name = $1, category = $2, description = $3, 
           website_url = $4, careers_page_url = $5, logo_url = $6, status = $7
       WHERE id = $8
       RETURNING *`,
      [name, category, description, website_url, careers_page_url, logo_url, status, id]
    );
    
    res.json({ success: true, organization: result.rows[0] });
  } catch (err) {
    console.error('Error updating organization:', err);
    res.status(500).json({ success: false, message: 'Failed to update organization' });
  }
});

// Delete partner organization
router.delete('/organizations/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM partner_organizations WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (err) {
    console.error('Error deleting organization:', err);
    res.status(500).json({ success: false, message: 'Failed to delete organization' });
  }
});

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await pool.query('SELECT * FROM vw_career_directory_stats');
    const byCategory = await pool.query('SELECT * FROM vw_organizations_by_category');
    
    res.json({ 
      success: true, 
      stats: stats.rows[0],
      by_category: byCategory.rows
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// Get activity logs
router.get('/activity-logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM career_directory_logs 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

// ============================================
// PUBLIC ROUTES (STUDENT-FACING)
// ============================================

// Get active organizations for public view
router.get('/public/organizations', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = `
      SELECT 
        id,
        name,
        category,
        description,
        website_url,
        careers_page_url,
        logo_url
      FROM partner_organizations
      WHERE status = 'active'
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND LOWER(name) LIKE $${paramIndex}`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, organizations: result.rows });
  } catch (err) {
    console.error('Error fetching public organizations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

export default router;