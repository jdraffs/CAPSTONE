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
// ============================================
// DASHBOARD STATISTICS
// ============================================

router.get('/dashboard/stats', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vw_career_directory_stats');
    
    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// ============================================
// ORGANIZATION CRUD OPERATIONS
// ============================================

// Get all organizations
router.get('/organizations/all', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        name,
        category,
        description,
        website_url,
        careers_page_url,
        logo_url,
        status,
        created_at,
        updated_at
      FROM partner_organizations
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (err) {
    console.error('Error fetching organizations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

// Get organization by ID
router.get('/organizations/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM partner_organizations WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.json({
      success: true,
      organization: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching organization:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organization' });
  }
});

// Create new organization
router.post('/organizations/create', async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      website_url,
      careers_page_url,
      logo_url,
      status,
      adminid
    } = req.body;

    // Validation
    if (!name || !category || !description || !website_url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const result = await db.query(`
      INSERT INTO partner_organizations 
      (name, category, description, website_url, careers_page_url, logo_url, status, adminid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      name,
      category,
      description,
      website_url,
      careers_page_url || null,
      logo_url || null,
      status || 'active',
      adminid || 'adminmila'
    ]);

    res.json({
      success: true,
      message: 'Organization created successfully',
      organizationId: result.rows[0].id
    });
  } catch (err) {
    console.error('Error creating organization:', err);
    
    // Handle unique constraint violations
    if (err.code === '23505') {
      if (err.constraint === 'partner_organizations_name_key') {
        return res.status(400).json({ 
          success: false, 
          message: 'Organization name already exists' 
        });
      }
      if (err.constraint === 'partner_organizations_website_url_key') {
        return res.status(400).json({ 
          success: false, 
          message: 'Website URL already exists' 
        });
      }
    }
    
    res.status(500).json({ success: false, message: 'Failed to create organization' });
  }
});

// Update organization
router.put('/organizations/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      description,
      website_url,
      careers_page_url,
      logo_url,
      status,
      adminid
    } = req.body;

    // Check if organization exists
    const checkResult = await db.query(
      'SELECT * FROM partner_organizations WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    await db.query(`
      UPDATE partner_organizations 
      SET name = $1, 
          category = $2, 
          description = $3, 
          website_url = $4, 
          careers_page_url = $5, 
          logo_url = $6, 
          status = $7,
          adminid = $8
      WHERE id = $9
    `, [
      name,
      category,
      description,
      website_url,
      careers_page_url || null,
      logo_url || null,
      status,
      adminid || 'adminmila',
      id
    ]);

    res.json({
      success: true,
      message: 'Organization updated successfully'
    });
  } catch (err) {
    console.error('Error updating organization:', err);
    
    // Handle unique constraint violations
    if (err.code === '23505') {
      if (err.constraint === 'partner_organizations_name_key') {
        return res.status(400).json({ 
          success: false, 
          message: 'Organization name already exists' 
        });
      }
      if (err.constraint === 'partner_organizations_website_url_key') {
        return res.status(400).json({ 
          success: false, 
          message: 'Website URL already exists' 
        });
      }
    }
    
    res.status(500).json({ success: false, message: 'Failed to update organization' });
  }
});

// Delete organization
router.delete('/organizations/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const checkResult = await db.query(
      'SELECT name FROM partner_organizations WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    await db.query('DELETE FROM partner_organizations WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting organization:', err);
    res.status(500).json({ success: false, message: 'Failed to delete organization' });
  }
});

// ============================================
// FILTER & SEARCH
// ============================================

// Get organizations by category
router.get('/organizations/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const result = await db.query(
      'SELECT * FROM partner_organizations WHERE category = $1 ORDER BY created_at DESC',
      [category]
    );

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (err) {
    console.error('Error fetching organizations by category:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

// Get organizations by status
router.get('/organizations/status/:status', async (req, res) => {
  try {
    const { status } = req.params;

    const result = await db.query(
      'SELECT * FROM partner_organizations WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (err) {
    console.error('Error fetching organizations by status:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

// Search organizations
router.get('/organizations/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;

    const result = await db.query(`
      SELECT * FROM partner_organizations 
      WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
      ORDER BY created_at DESC
    `, [searchTerm]);

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (err) {
    console.error('Error searching organizations:', err);
    res.status(500).json({ success: false, message: 'Failed to search organizations' });
  }
});

// ============================================
// ACTIVITY LOGS
// ============================================

// Get recent activity logs
router.get('/logs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await db.query(
      'SELECT * FROM career_directory_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    res.json({
      success: true,
      logs: result.rows
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

// Get logs for specific organization
router.get('/logs/organization/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM career_directory_logs WHERE organization_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      logs: result.rows
    });
  } catch (err) {
    console.error('Error fetching organization logs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

// ============================================
// PUBLIC ENDPOINTS (for student view)
// ============================================

// Get active organizations for public view
router.get('/public/organizations', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vw_public_partner_organizations');

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (err) {
    console.error('Error fetching public organizations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});

// Get organizations by category for public
router.get('/public/organizations/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const result = await db.query(
      'SELECT * FROM vw_public_partner_organizations WHERE category = $1',
      [category]
    );

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (err) {
    console.error('Error fetching public organizations by category:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
});


export default router;