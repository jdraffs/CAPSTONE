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
      'SELECT * FROM admin_accounts WHERE adminid = $1 AND password = $2',
      [adminid, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid admin ID or password' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Server error, please try again.' });
  }
});

export default router;
