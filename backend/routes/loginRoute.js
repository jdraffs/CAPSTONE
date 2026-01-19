// /backend/routes/loginRoute.js
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection (pwede mo rin itong i-import galing sa db.js kung gusto mo separate)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'capstone_db',
  password: 'Kisses123', // palitan mo ng actual password mo
  port: 5432,
});

const router = express.Router();

// POST /api/login
router.post('/', async (req, res) => {
  const { adminid, password } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT id, adminid, role_id, status
      FROM admin_accounts
      WHERE adminid = $1
        AND password = crypt($2, password)
      `,
      [adminid, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin ID or password'
      });
    }

    res.json({
      success: true,
      adminid: result.rows[0].adminid
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;