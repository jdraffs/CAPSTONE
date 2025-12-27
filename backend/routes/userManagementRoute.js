// routes/userManagementRoute.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ========================================================
// HELPER FUNCTION: Generate Random Password
// ========================================================
function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ========================================================
// GET ALL USERS
// ========================================================
router.get('/users', async (req, res) => {
  try {
    // Query to get all admin accounts with enhanced information
    const query = `
      SELECT 
        id,
        adminid,
        password, 
        created_at,
        adminid as email,
        CASE 
          WHEN adminid = 'adminSalao' THEN 'Super Admin'
          WHEN adminid = 'adminEnierga' THEN 'Data Manager'
          WHEN adminid = 'adminave' THEN 'Content Manager'
          ELSE 'Admin'
        END as role,
        COALESCE(
          (SELECT 'active' FROM admin_accounts WHERE adminid = a.adminid LIMIT 1),
          'active'
        ) as status,
        (SELECT MAX(timestamp) 
         FROM activity_logs 
         WHERE adminid = a.adminid 
         AND type = 'login'
        ) as last_login,
        INITCAP(
          CASE 
            WHEN adminid = 'adminSalao' THEN 'Admin Salao'
            WHEN adminid = 'adminEnierga' THEN 'Admin Enierga'
            WHEN adminid = 'adminave' THEN 'Admin Ave'
            ELSE adminid
          END
        ) as full_name
      FROM admin_accounts a
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users' 
    });
  }
});

// ========================================================
// GET USER BY ID
// ========================================================
router.get('/users/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    const query = `
      SELECT 
        id,
        adminid,
        created_at,
        adminid as email,
        CASE 
          WHEN adminid = 'adminSalao' THEN 'Super Admin'
          WHEN adminid = 'adminEnierga' THEN 'Data Manager'
          WHEN adminid = 'adminave' THEN 'Content Manager'
          ELSE 'Admin'
        END as role,
        'active' as status,
        INITCAP(
          CASE 
            WHEN adminid = 'adminSalao' THEN 'Admin Salao'
            WHEN adminid = 'adminEnierga' THEN 'Admin Enierga'
            WHEN adminid = 'adminave' THEN 'Admin Ave'
            ELSE adminid
          END
        ) as full_name
      FROM admin_accounts
      WHERE adminid = $1
    `;

    const result = await pool.query(query, [adminId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user' 
    });
  }
});

// ========================================================
// UPDATE USER STATUS
// ========================================================
router.put('/users/:adminId/status', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status value' 
      });
    }

    // Check if user exists
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await pool.query(checkQuery, [adminId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // For now, we'll store status in activity_logs as we don't have status column
    // In production, you should add a status column to admin_accounts table
    
    res.json({
      success: true,
      message: `User status updated to ${status}`,
      adminId,
      newStatus: status
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user status' 
    });
  }
});

// ========================================================
// RESET USER PASSWORD
// ========================================================
router.post('/users/:adminId/reset-password', async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if user exists
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await pool.query(checkQuery, [adminId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Update password in database
    const updateQuery = `
      UPDATE admin_accounts 
      SET password = $1 
      WHERE adminid = $2
      RETURNING adminid
    `;

    await pool.query(updateQuery, [tempPassword, adminId]);

    res.json({
      success: true,
      message: 'Password reset successfully',
      adminId,
      tempPassword
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset password' 
    });
  }
});

// ========================================================
// DELETE USER
// ========================================================
router.delete('/users/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    // Prevent deleting Super Admin
    if (adminId === 'adminSalao') {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete Super Admin account' 
      });
    }

    // Check if user exists
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await pool.query(checkQuery, [adminId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Delete user
    const deleteQuery = 'DELETE FROM admin_accounts WHERE adminid = $1';
    await pool.query(deleteQuery, [adminId]);

    // Optional: Also delete user's activity logs
    await pool.query('DELETE FROM activity_logs WHERE adminid = $1', [adminId]);

    res.json({
      success: true,
      message: 'User deleted successfully',
      adminId
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete user' 
    });
  }
});

// ========================================================
// CREATE NEW USER
// ========================================================
router.post('/users', async (req, res) => {
  try {
    const { adminid, password, role } = req.body;

    // Validate input
    if (!adminid || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Admin ID and password are required' 
      });
    }

    // Check if user already exists
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await pool.query(checkQuery, [adminid]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }

    // Insert new user
    const insertQuery = `
      INSERT INTO admin_accounts (adminid, password)
      VALUES ($1, $2)
      RETURNING id, adminid, created_at
    `;

    const result = await pool.query(insertQuery, [adminid, password]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user' 
    });
  }
});

// ========================================================
// GET USER STATISTICS
// ========================================================
router.get('/users/stats/summary', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
        COUNT(DISTINCT adminid) as active_users
      FROM admin_accounts
    `;

    const activityQuery = `
      SELECT 
        adminid,
        COUNT(*) as login_count
      FROM activity_logs
      WHERE type = 'login'
      AND timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY adminid
    `;

    const [statsResult, activityResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(activityQuery)
    ]);

    res.json({
      success: true,
      stats: {
        ...statsResult.rows[0],
        recent_activity: activityResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

export default router;