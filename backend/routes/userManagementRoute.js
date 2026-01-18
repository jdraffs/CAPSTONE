// routes/userManagementRoute.js - ENHANCED WITH STATUS & ROLE MANAGEMENT
import express from 'express';
import pool from '../db.js';

const router = express.Router();

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================
// GET ALL ADMIN ACCOUNTS
// ============================================
router.get('/admin-accounts', async (req, res) => {
  try {
    console.log('🔍 Fetching admin accounts...');
    
    const query = `
      SELECT 
        a.id,
        a.adminid,
        a.password,
        a.created_at,
        a.role_id,
        a.status,
        COALESCE(r.name, 'No Role') as role_name
      FROM admin_accounts a
      LEFT JOIN roles r ON r.id = a.role_id
      ORDER BY a.created_at DESC
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} admin accounts`);
    
    res.json({
      success: true,
      count: result.rows.length,
      admins: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching admin accounts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch admin accounts',
      message: error.message
    });
  }
});

// ============================================
// GET SINGLE ADMIN
// ============================================
router.get('/admin-accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        a.id,
        a.adminid,
        a.created_at,
        a.role_id,
        a.status,
        COALESCE(r.name, 'No Role') as role_name
      FROM admin_accounts a
      LEFT JOIN roles r ON r.id = a.role_id
      WHERE a.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Admin not found' 
      });
    }

    res.json({
      success: true,
      admin: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching admin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch admin',
      message: error.message
    });
  }
});

// ============================================
// CREATE NEW ADMIN
// ============================================
router.post('/admin-accounts', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminid, password, role_id } = req.body;

    if (!adminid || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Admin ID and password are required' 
      });
    }

    if (!role_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Role is required' 
      });
    }

    await client.query('BEGIN');

    // Check if admin exists
    const checkQuery = 'SELECT id FROM admin_accounts WHERE adminid = $1';
    const checkResult = await client.query(checkQuery, [adminid]);

    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        success: false, 
        error: `Admin "${adminid}" already exists` 
      });
    }

    // Insert new admin with default status 'active'
    const insertQuery = `
      INSERT INTO admin_accounts (adminid, password, role_id, status, created_at)
      VALUES ($1, $2, $3, 'active', NOW())
      RETURNING id, adminid, role_id, status, created_at
    `;

    const result = await client.query(insertQuery, [adminid, password, parseInt(role_id)]);
    const newAdmin = result.rows[0];

    await client.query('COMMIT');

    console.log(`✅ Created admin: ${adminid}`);

    res.status(201).json({
      success: true,
      message: `Admin "${adminid}" created successfully`,
      admin: newAdmin
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating admin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create admin',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================
// UPDATE ADMIN (Password, Role, Status)
// ============================================
router.put('/admin-accounts/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { password, role_id, status } = req.body;

    if (!password && !role_id && !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one field (password, role_id, or status) is required' 
      });
    }

    await client.query('BEGIN');

    // Check if admin exists
    const checkQuery = 'SELECT id, adminid FROM admin_accounts WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'Admin not found' 
      });
    }

    const admin = checkResult.rows[0];

    // Prevent modifying Super Admin
    if (admin.adminid === 'adminSalao' && status === 'suspended') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Cannot suspend Super Administrator'
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (password) {
      updates.push(`password = $${paramCount}`);
      values.push(password);
      paramCount++;
    }

    if (role_id) {
      updates.push(`role_id = $${paramCount}`);
      values.push(parseInt(role_id));
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    values.push(id); // for WHERE clause

    const updateQuery = `
      UPDATE admin_accounts 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, adminid, role_id, status
    `;

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');

    console.log(`✅ Updated admin: ${admin.adminid}`);

    res.json({
      success: true,
      message: `Admin "${admin.adminid}" updated successfully`,
      admin: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating admin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update admin',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================
// RESET PASSWORD
// ============================================
router.post('/admin-accounts/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const tempPassword = generateTempPassword();

    const result = await pool.query(
      `UPDATE admin_accounts
       SET password = $1
       WHERE id = $2
       RETURNING id, adminid`,
      [tempPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Admin not found' 
      });
    }

    console.log(`✅ Reset password for: ${result.rows[0].adminid}`);

    res.json({
      success: true,
      adminid: result.rows[0].adminid,
      tempPassword: tempPassword
    });

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset password',
      message: error.message
    });
  }
});

// ============================================
// DELETE ADMIN
// ============================================
router.delete('/admin-accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query(
      'SELECT id, adminid FROM admin_accounts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Admin not found' 
      });
    }

    const admin = checkResult.rows[0];

    if (admin.adminid === 'adminSalao') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete Super Administrator'
      });
    }

    await pool.query('DELETE FROM admin_accounts WHERE id = $1', [id]);

    console.log(`✅ Deleted admin: ${admin.adminid}`);

    res.json({ 
      success: true, 
      message: `Admin "${admin.adminid}" deleted successfully` 
    });

  } catch (error) {
    console.error('❌ Error deleting admin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete admin',
      message: error.message
    });
  }
});

// ============================================
// BULK DELETE
// ============================================
router.post('/admin-accounts/bulk-delete', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No admin IDs provided' 
      });
    }

    await client.query('BEGIN');

    const superAdminResult = await client.query(
      `SELECT id FROM admin_accounts WHERE adminid = 'adminSalao'`
    );

    const superAdminId = superAdminResult.rows[0]?.id;

    if (ids.includes(superAdminId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Cannot delete Super Administrator'
      });
    }

    const deleteQuery = 'DELETE FROM admin_accounts WHERE id = ANY($1::int[])';
    const result = await client.query(deleteQuery, [ids]);

    await client.query('COMMIT');

    console.log(`✅ Bulk deleted ${result.rowCount} admins`);

    res.json({
      success: true,
      message: `${result.rowCount} admin(s) deleted successfully`,
      count: result.rowCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error bulk deleting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete admins',
      message: error.message
    });
  } finally {
    client.release();
  }
});

export default router;