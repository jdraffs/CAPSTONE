// routes/userManagementRoute.js - UPDATED WITH ROLE INTEGRATION
import express from 'express';
import pool from '../db.js';

const router = express.Router();


// HELPER FUNCTION: Generate Random Password

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}


// GET ALL USERS (WITH ROLE INFO)

router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.adminid,
        a.password, 
        a.created_at,
        a.adminid as email,
        COALESCE(r.id, 
          CASE 
            WHEN a.adminid = 'adminSalao' THEN 1
            WHEN a.adminid = 'adminEnierga' THEN 2
            WHEN a.adminid = 'adminave' THEN 3
            ELSE NULL
          END
        ) as role_id,
        COALESCE(r.name,
          CASE 
            WHEN a.adminid = 'adminSalao' THEN 'Super Admin'
            WHEN a.adminid = 'adminEnierga' THEN 'Data Manager'
            WHEN a.adminid = 'adminave' THEN 'Content Manager'
            ELSE 'Admin'
          END
        ) as role,
        'active' as status,
        (SELECT MAX(timestamp) 
         FROM activity_logs 
         WHERE adminid = a.adminid 
         AND type = 'login'
        ) as last_login,
        INITCAP(
          CASE 
            WHEN a.adminid = 'adminSalao' THEN 'Admin Salao'
            WHEN a.adminid = 'adminEnierga' THEN 'Admin Enierga'
            WHEN a.adminid = 'adminave' THEN 'Admin Ave'
            ELSE a.adminid
          END
        ) as full_name
      FROM admin_accounts a
      LEFT JOIN roles r ON r.id = (
        CASE 
          WHEN a.adminid = 'adminSalao' THEN 1
          WHEN a.adminid = 'adminEnierga' THEN 2
          WHEN a.adminid = 'adminave' THEN 3
          ELSE NULL
        END
      )
      ORDER BY a.created_at DESC
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


// CREATE NEW USER

router.post('/users', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminid, password, full_name, email, role_id } = req.body;

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
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
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
      INSERT INTO admin_accounts (adminid, password, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id, adminid, created_at
    `;

    const result = await client.query(insertQuery, [adminid, password]);
    const newUser = result.rows[0];

    // Store additional user info (you might want to add these columns to admin_accounts)
    // For now, we'll log it in activity_logs as details
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
      error: 'Failed to create user' 
    });
  } finally {
    client.release();
  }
});


// UPDATE USER

router.put('/users/:adminId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminId } = req.params;
    const { full_name, email, role_id, status } = req.body;

    await client.query('BEGIN');

    // Check if user exists
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await client.query(checkQuery, [adminId]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Log the update
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

    res.json({
      success: true,
      message: `User ${adminId} updated successfully`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user' 
    });
  } finally {
    client.release();
  }
});


// BULK CHANGE ROLE

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
      error: 'Failed to change roles' 
    });
  } finally {
    client.release();
  }
});


// BULK STATUS CHANGE

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
      error: 'Failed to change status' 
    });
  } finally {
    client.release();
  }
});


// BULK DELETE USERS

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

    // Prevent deleting Super Admin
    if (user_ids.includes('adminSalao')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete Super Admin account' 
      });
    }

    await client.query('BEGIN');

    // Delete users
    const deleteQuery = 'DELETE FROM admin_accounts WHERE adminid = ANY($1)';
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

    // Delete activity logs for deleted users
    await client.query('DELETE FROM activity_logs WHERE adminid = ANY($1)', [user_ids]);

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
      error: 'Failed to delete users' 
    });
  } finally {
    client.release();
  }
});


// GET USER BY ID

router.get('/users/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    const query = `
      SELECT 
        a.id,
        a.adminid,
        a.created_at,
        a.adminid as email,
        COALESCE(r.id,
          CASE 
            WHEN a.adminid = 'adminSalao' THEN 1
            WHEN a.adminid = 'adminEnierga' THEN 2
            WHEN a.adminid = 'adminave' THEN 3
            ELSE NULL
          END
        ) as role_id,
        COALESCE(r.name,
          CASE 
            WHEN a.adminid = 'adminSalao' THEN 'Super Admin'
            WHEN a.adminid = 'adminEnierga' THEN 'Data Manager'
            WHEN a.adminid = 'adminave' THEN 'Content Manager'
            ELSE 'Admin'
          END
        ) as role,
        'active' as status,
        INITCAP(
          CASE 
            WHEN a.adminid = 'adminSalao' THEN 'Admin Salao'
            WHEN a.adminid = 'adminEnierga' THEN 'Admin Enierga'
            WHEN a.adminid = 'adminave' THEN 'Admin Ave'
            ELSE a.adminid
          END
        ) as full_name
      FROM admin_accounts a
      LEFT JOIN roles r ON r.id = (
        CASE 
          WHEN a.adminid = 'adminSalao' THEN 1
          WHEN a.adminid = 'adminEnierga' THEN 2
          WHEN a.adminid = 'adminave' THEN 3
          ELSE NULL
        END
      )
      WHERE a.adminid = $1
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


// UPDATE USER STATUS

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


// RESET USER PASSWORD

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


// DELETE USER

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

    // Delete user's activity logs
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

export default router;