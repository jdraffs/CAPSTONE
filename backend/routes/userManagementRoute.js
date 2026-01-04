// routes/userManagementRoute.js - FIXED VERSION
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Helper: Generate Random Password
function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============ GET ALL USERS (WITH ROLE INFO) ============
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.adminid,
        u.full_name,
        u.email,
        u.role_id,
        COALESCE(r.name, 'No Role') as role,
        COALESCE(u.status, 'active') as status,
        u.last_login,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query);
    
    console.log('✅ Fetched users:', result.rows.length);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

// ============ CREATE NEW USER ============
router.post('/users', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminid, password, full_name, email, role_id } = req.body;

    console.log('Creating user:', { adminid, full_name, email, role_id });

    // Validate input
    if (!adminid || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Admin ID and password are required' 
      });
    }

    if (!role_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Role selection is required' 
      });
    }

    await client.query('BEGIN');

    // Check if user already exists
    const checkQuery = 'SELECT adminid FROM users WHERE adminid = $1';
    const checkResult = await client.query(checkQuery, [adminid]);

    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }

    // Insert new user
    const insertQuery = `
      INSERT INTO users (adminid, password, full_name, email, role_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
      RETURNING id, adminid, full_name, email, role_id, status, created_at
    `;

    const result = await client.query(insertQuery, [
      adminid, 
      password,  // In production, hash this!
      full_name || null, 
      email || null, 
      parseInt(role_id)
    ]);

    const newUser = result.rows[0];

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (type, message, adminid, details, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        'user_created',
        `User account created for ${adminid}`,
        adminid,
        JSON.stringify({ full_name, email, role_id })
      ]
    );

    await client.query('COMMIT');

    console.log('User created successfully:', newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// ============ UPDATE USER ============
router.put('/users/:adminId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminId } = req.params;
    const { full_name, email, role_id, status } = req.body;

    console.log('Updating user:', adminId, { full_name, email, role_id, status });

    await client.query('BEGIN');

    // Check if user exists
    const checkQuery = 'SELECT * FROM users WHERE adminid = $1';
    const checkResult = await client.query(checkQuery, [adminId]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Update user
    const updateQuery = `
      UPDATE users 
      SET 
        full_name = $1,
        email = $2,
        role_id = $3,
        status = $4,
        updated_at = NOW()
      WHERE adminid = $5
      RETURNING id, adminid, full_name, email, role_id, status, updated_at
    `;

    const result = await client.query(updateQuery, [
      full_name || null,
      email || null,
      role_id ? parseInt(role_id) : null,
      status || 'active',
      adminId
    ]);

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (type, message, adminid, details, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        'user_updated',
        `User account updated for ${adminId}`,
        adminId,
        JSON.stringify({ full_name, email, role_id, status })
      ]
    );

    await client.query('COMMIT');

    console.log('User updated successfully');

    res.json({
      success: true,
      message: `User ${adminId} updated successfully`,
      user: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// ============ BULK CHANGE ROLE ============
router.post('/users/bulk/change-role', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { user_ids, role_id } = req.body;

    if (!user_ids || user_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No users selected' 
      });
    }

    if (!role_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Role selection is required' 
      });
    }

    await client.query('BEGIN');

    // Update roles
    const updateQuery = `
      UPDATE users 
      SET role_id = $1, updated_at = NOW()
      WHERE adminid = ANY($2)
    `;
    await client.query(updateQuery, [parseInt(role_id), user_ids]);

    // Log bulk role change
    for (const userId of user_ids) {
      await client.query(
        `INSERT INTO activity_logs (type, message, adminid, details, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          'role_changed',
          `Role changed for user ${userId}`,
          userId,
          JSON.stringify({ new_role_id: role_id })
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Role changed for ${user_ids.length} user(s)`,
      count: user_ids.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error changing roles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change roles',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// ============ BULK STATUS CHANGE ============
router.post('/users/bulk/change-status', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { user_ids, status } = req.body;

    if (!user_ids || user_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No users selected' 
      });
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status value' 
      });
    }

    await client.query('BEGIN');

    // Update status
    const updateQuery = `
      UPDATE users 
      SET status = $1, updated_at = NOW()
      WHERE adminid = ANY($2)
    `;
    await client.query(updateQuery, [status, user_ids]);

    // Log bulk status change
    for (const userId of user_ids) {
      await client.query(
        `INSERT INTO activity_logs (type, message, adminid, details, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          'status_changed',
          `Status changed to ${status} for user ${userId}`,
          userId,
          JSON.stringify({ new_status: status })
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Status changed for ${user_ids.length} user(s)`,
      count: user_ids.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error changing status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change status',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// ============ BULK DELETE USERS ============
router.post('/users/bulk/delete', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { user_ids } = req.body;

    if (!user_ids || user_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No users selected' 
      });
    }

    await client.query('BEGIN');

    // Delete users
    const deleteQuery = 'DELETE FROM users WHERE adminid = ANY($1)';
    await client.query(deleteQuery, [user_ids]);

    // Log deletions
    await client.query(
      `INSERT INTO activity_logs (type, message, adminid, details, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        'bulk_user_deletion',
        `Bulk deleted ${user_ids.length} user accounts`,
        'system',
        JSON.stringify({ deleted_users: user_ids })
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${user_ids.length} user(s) deleted successfully`,
      count: user_ids.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete users',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// ============ GET USER BY ID ============
router.get('/users/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    const query = `
      SELECT 
        u.id,
        u.adminid,
        u.full_name,
        u.email,
        u.role_id,
        r.name as role,
        u.status,
        u.last_login,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.adminid = $1
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
      error: 'Failed to fetch user',
      details: error.message
    });
  }
});

// ============ UPDATE USER STATUS ============
router.put('/users/:adminId/status', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status value' 
      });
    }

    const updateQuery = `
      UPDATE users 
      SET status = $1, updated_at = NOW()
      WHERE adminid = $2
      RETURNING adminid, status
    `;

    const result = await pool.query(updateQuery, [status, adminId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

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
      error: 'Failed to update user status',
      details: error.message
    });
  }
});

// ============ RESET USER PASSWORD ============
router.post('/users/:adminId/reset-password', async (req, res) => {
  try {
    const { adminId } = req.params;

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Update password in database
    const updateQuery = `
      UPDATE users 
      SET password = $1, updated_at = NOW()
      WHERE adminid = $2
      RETURNING adminid
    `;

    const result = await pool.query(updateQuery, [tempPassword, adminId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

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
      error: 'Failed to reset password',
      details: error.message
    });
  }
});

// ============ DELETE USER ============
router.delete('/users/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    // Delete user
    const deleteQuery = 'DELETE FROM users WHERE adminid = $1 RETURNING adminid';
    const result = await pool.query(deleteQuery, [adminId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      adminId
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete user',
      details: error.message
    });
  }
});

export default router;