// /backend/routes/loginRoute.js
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection (pwede mo rin itong i-import galing sa db.js kung gusto mo separate)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'capstone_db',
  password: 'Kisses123',
  port: 5432,
});

const router = express.Router();

// POST /api/login
router.post('/', async (req, res) => {
  const { adminid, password } = req.body;

  if (!adminid || !password) {
    return res.status(400).json({
      success: false,
      message: "Admin ID and password are required",
    });
  }

  try {
    // Updated query to include role information
    const query = `
      SELECT 
        a.id,
        a.adminid,
        a.role_id,
        a.status,
        r.name as role_name,
        r.hierarchy_level
      FROM admin_accounts a
      LEFT JOIN roles r ON r.id = a.role_id
      WHERE a.adminid = $1
        AND a.password = crypt($2, a.password)
    `;

    const result = await pool.query(query, [adminid, password]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin ID or password'
      });
    }

    const admin = result.rows[0];

    // Check account status
    if (admin.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact the administrator.",
      });
    }

    if (admin.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Contact the administrator.",
      });
    }
    
    console.log(`✅ Login successful for: ${admin.adminid} (${admin.role_name || 'No Role'})`);

    // Return success with role information
    res.json({
      success: true,
      adminid: admin.adminid,
      role_id: admin.role_id,
      role_name: admin.role_name,
      hierarchy_level: admin.hierarchy_level || 0
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

export default router;