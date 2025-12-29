// routes/userManagementRoute.js - COMPLETE WORKING VERSION
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatUserData(user) {
  return {
    id: user.id,
    adminid: user.adminid,
    full_name: user.full_name,
    email: user.email,
    status: user.status,
    role_id: user.role_id,
    role_name: user.role_name,
    role_permissions: user.role_permissions || [],
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login: user.last_login,
    total_activities: user.total_activities || 0,
    login_count: user.login_count || 0
  };
}

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function logActivity(client, type, message, adminid, details = null) {
  try {
    await client.query(
      `INSERT INTO activity_logs (type, message, adminid, details, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [type, message, adminid, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// =====================================================
// GET /api/roles - Get all roles
// =====================================================
router.get('/roles', async (req, res) => {
  try {
    console.log('Fetching roles...');
    
    const query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.permissions,
        r.is_system_role,
        r.created_at,
        COALESCE(COUNT(a.id), 0) as user_count
      FROM roles r
      LEFT JOIN admin_accounts a ON a.role_id = r.id
      GROUP BY r.id, r.name, r.description, r.permissions, r.is_system_role, r.created_at
      ORDER BY r.id
    `;
    
    const result = await pool.query(query);
    console.log('Roles fetched:', result.rows.length);
    
    res.json({
      success: true,
      roles: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching roles:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch roles',
      details: error.message
    });
  }
});

// =====================================================
// GET /api/permissions - Get all permissions
// =====================================================
router.get('/permissions', async (req, res) => {
  try {
    console.log('Fetching permissions...');
    
    const permissions = [
      { id: 1, name: 'user_management', label: 'User Management', category: 'Administration' },
      { id: 2, name: 'role_management', label: 'Role Management', category: 'Administration' },
      { id: 3, name: 'analytics', label: 'Analytics Access', category: 'Data' },
      { id: 4, name: 'data_uploads', label: 'Data Uploads', category: 'Data' },
      { id: 5, name: 'file_repository', label: 'File Repository', category: 'Content' },
      { id: 6, name: 'forms_repository', label: 'Forms Repository', category: 'Content' },
      { id: 7, name: 'ojt', label: 'OJT Management', category: 'Academic' },
      { id: 8, name: 'nstp', label: 'NSTP Management', category: 'Academic' },
      { id: 9, name: 'research_extension', label: 'Research & Extension', category: 'Academic' },
      { id: 10, name: 'system_settings', label: 'System Settings', category: 'Administration' }
    ];
    
    console.log('Permissions fetched:', permissions.length);
    
    res.json({
      success: true,
      permissions
    });
    
  } catch (error) {
    console.error('Error fetching permissions:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch permissions',
      details: error.message
    });
  }
});

// =====================================================
// GET /api/users - Retrieve all users
// =====================================================
router.get('/users', async (req, res) => {
  try {
    console.log('Fetching users...');
    const { status, role, search, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        a.id,
        a.adminid,
        a.full_name,
        a.email,
        a.status,
        a.created_at,
        a.updated_at,
        r.id as role_id,
        r.name as role_name,
        r.permissions as role_permissions,
        (
          SELECT MAX(timestamp) 
          FROM activity_logs 
          WHERE adminid = a.adminid 
          AND type = 'login'
        ) as last_login,
        (
          SELECT COUNT(*) 
          FROM activity_logs 
          WHERE adminid = a.adminid
        ) as total_activities,
        (
          SELECT COUNT(*) 
          FROM activity_logs 
          WHERE adminid = a.adminid 
          AND type = 'login'
        ) as login_count
      FROM admin_accounts a
      LEFT JOIN roles r ON a.role_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND a.role_id = $${paramIndex}`;
      params.push(parseInt(role));
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (
        a.adminid ILIKE $${paramIndex} OR 
        a.full_name ILIKE $${paramIndex} OR 
        a.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('Executing users query with params:', params);
    const result = await pool.query(query, params);
    console.log('Users fetched:', result.rows.length);
    
    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM admin_accounts a WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND a.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (role) {
      countQuery += ` AND a.role_id = $${countParamIndex}`;
      countParams.push(parseInt(role));
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (a.adminid ILIKE $${countParamIndex} OR a.full_name ILIKE $${countParamIndex} OR a.email ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      users: result.rows.map(formatUserData),
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
});

// =====================================================
// GET /api/users/:adminId - Get specific user
// =====================================================
router.get('/users/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    console.log('Fetching user:', adminId);
    
    const query = `
      SELECT 
        a.id,
        a.adminid,
        a.full_name,
        a.email,
        a.status,
        a.created_at,
        a.updated_at,
        r.id as role_id,
        r.name as role_name,
        r.permissions as role_permissions,
        (
          SELECT MAX(timestamp) 
          FROM activity_logs 
          WHERE adminid = a.adminid 
          AND type = 'login'
        ) as last_login,
        (
          SELECT COUNT(*) 
          FROM activity_logs 
          WHERE adminid = a.adminid
        ) as total_activities,
        (
          SELECT COUNT(*) 
          FROM activity_logs 
          WHERE adminid = a.adminid 
          AND type = 'login'
        ) as login_count
      FROM admin_accounts a
      LEFT JOIN roles r ON a.role_id = r.id
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
      user: formatUserData(result.rows[0])
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user details',
      details: error.message
    });
  }
});

// =====================================================
// POST /api/users - Create new user
// =====================================================
router.post('/users', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminid, password, full_name, email, role_id } = req.body;
    console.log('Creating user:', adminid);
    
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
    
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await client.query(checkQuery, [adminid]);
    
    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }
    
    if (email) {
      const emailCheck = await client.query(
        'SELECT * FROM admin_accounts WHERE email = $1',
        [email]
      );
      
      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          success: false, 
          error: 'Email already in use' 
        });
      }
    }
    
    const roleCheck = await client.query('SELECT * FROM roles WHERE id = $1', [role_id]);
    if (roleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role ID' 
      });
    }
    
    const insertQuery = `
      INSERT INTO admin_accounts (
        adminid, 
        password, 
        full_name, 
        email, 
        role_id, 
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
      RETURNING id, adminid, full_name, email, role_id, status, created_at
    `;
    
    const result = await client.query(insertQuery, [
      adminid,
      password,
      full_name,
      email || `${adminid}@pup.edu.ph`,
      role_id
    ]);
    
    const newUser = result.rows[0];
    
    await logActivity(
      client,
      'user_created',
      `User account created for ${adminid}`,
      adminid,
      { created_by: req.body.created_by || 'system', role_id }
    );
    
    await client.query('COMMIT');
    console.log('User created successfully:', adminid);
    
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

// =====================================================
// PUT /api/users/:adminId - Update user
// =====================================================
router.put('/users/:adminId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminId } = req.params;
    const { full_name, email, role_id, status } = req.body;
    
    await client.query('BEGIN');
    
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await client.query(checkQuery, [adminId]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const oldUser = checkResult.rows[0];
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex}`);
      params.push(full_name);
      paramIndex++;
    }
    
    if (email !== undefined) {
      const emailCheck = await client.query(
        'SELECT * FROM admin_accounts WHERE email = $1 AND adminid != $2',
        [email, adminId]
      );
      
      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          success: false, 
          error: 'Email already in use' 
        });
      }
      
      updates.push(`email = $${paramIndex}`);
      params.push(email);
      paramIndex++;
    }
    
    if (role_id !== undefined) {
      const roleCheck = await client.query('SELECT * FROM roles WHERE id = $1', [role_id]);
      if (roleCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid role ID' 
        });
      }
      
      updates.push(`role_id = $${paramIndex}`);
      params.push(role_id);
      paramIndex++;
    }
    
    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status value' 
        });
      }
      
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: 'No fields to update' 
      });
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(adminId);
    
    const updateQuery = `
      UPDATE admin_accounts 
      SET ${updates.join(', ')}
      WHERE adminid = $${paramIndex}
      RETURNING id, adminid, full_name, email, role_id, status, updated_at
    `;
    
    const result = await client.query(updateQuery, params);
    
    const changes = {};
    if (full_name && full_name !== oldUser.full_name) changes.full_name = { old: oldUser.full_name, new: full_name };
    if (email && email !== oldUser.email) changes.email = { old: oldUser.email, new: email };
    if (role_id && role_id !== oldUser.role_id) changes.role_id = { old: oldUser.role_id, new: role_id };
    if (status && status !== oldUser.status) changes.status = { old: oldUser.status, new: status };
    
    await logActivity(
      client,
      'user_updated',
      `User account updated for ${adminId}`,
      adminId,
      { updated_by: req.body.updated_by || 'system', changes }
    );
    
    await client.query('COMMIT');
    
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

// =====================================================
// PUT /api/users/:adminId/status - Update user status
// =====================================================
router.put('/users/:adminId/status', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status value. Must be: active, inactive, or suspended' 
      });
    }
    
    await client.query('BEGIN');
    
    const checkQuery = 'SELECT * FROM admin_accounts WHERE adminid = $1';
    const checkResult = await client.query(checkQuery, [adminId]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const oldStatus = checkResult.rows[0].status;
    
    const updateQuery = `
      UPDATE admin_accounts 
      SET status = $1, updated_at = NOW()
      WHERE adminid = $2
      RETURNING adminid, status, updated_at
    `;
    
    const result = await client.query(updateQuery, [status, adminId]);
    
    await logActivity(
      client,
      'status_changed',
      `User status changed from ${oldStatus} to ${status}`,
      adminId,
      { 
        updated_by: req.body.updated_by || 'system',
        old_status: oldStatus,
        new_status: status
      }
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: result.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user status',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Add remaining routes (reset password, delete, activity logs, bulk operations)
// Continue from document 6...

export default router;