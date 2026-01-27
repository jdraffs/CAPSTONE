// backend/routes/activityLogsRoute.js
// Route for fetching super admin activity logs

import express from 'express';
import pool from '../db.js';

const router = express.Router();

console.log('✅ Activity Logs routes loaded');

// GET - Fetch super admin action logs
// Query params: adminid (optional), limit (optional)
router.get('/superadmin-actions', async (req, res) => {
  console.log('🔍 GET /superadmin-actions hit');
  
  const { adminid, limit = 500 } = req.query;
  
  try {
    let query = `
      SELECT 
        id,
        adminid,
        action_type,
        target_user,
        details,
        ip_address,
        created_at
      FROM superadmin_action_logs
    `;
    
    const params = [];
    
    // Filter by adminid if provided
    if (adminid) {
      query += ' WHERE adminid = $1';
      params.push(adminid);
      query += ' ORDER BY created_at DESC LIMIT $2';
      params.push(parseInt(limit));
    } else {
      query += ' ORDER BY created_at DESC LIMIT $1';
      params.push(parseInt(limit));
    }
    
    console.log('📊 With params:', params);
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} action logs`);
    
    res.json({
      success: true,
      actions: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching super admin actions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
});

// GET - Fetch all admin accounts (for filtering)
router.get('/admin-accounts', async (req, res) => {
  console.log('🔍 GET /admin-accounts hit');
  
  try {
    const query = `
      SELECT 
        a.id,
        a.adminid,
        a.email,
        a.role_id,
        r.name as role_name,
        a.created_at
      FROM admin_accounts a
      LEFT JOIN roles r ON r.id = a.role_id
      ORDER BY a.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} admin accounts`);
    
    res.json({
      success: true,
      admins: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin accounts',
      error: error.message
    });
  }
});

// GET - Activity statistics
router.get('/activity-stats', async (req, res) => {
  console.log('🔍 GET /activity-stats hit');
  
  const { adminid } = req.query;
  
  try {
    let query = `
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT adminid) as unique_admins,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
      FROM superadmin_action_logs
    `;
    
    const params = [];
    
    if (adminid) {
      query += ' WHERE adminid = $1';
      params.push(adminid);
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      stats: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// GET - Action breakdown by type
router.get('/action-breakdown', async (req, res) => {
  console.log('🔍 GET /action-breakdown hit');
  
  const { adminid } = req.query;
  
  try {
    let query = `
      SELECT 
        action_type,
        COUNT(*) as count
      FROM superadmin_action_logs
    `;
    
    const params = [];
    
    if (adminid) {
      query += ' WHERE adminid = $1';
      params.push(adminid);
    }
    
    query += ' GROUP BY action_type ORDER BY count DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      breakdown: result.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching action breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breakdown',
      error: error.message
    });
  }
});

console.log('✅ All activity log routes registered');

// In any route file
import { logAdminAction, getClientIp } from '../utils/logAdminAction.js';

// Example: User Management
router.post('/create-user', async (req, res) => {
  const adminid = req.session.adminid;
  
  // Your logic here...
  
  await logAdminAction(
    adminid,
    'User Created',
    newUser.adminid,
    `Created user with role: ${newUser.role}`,
    getClientIp(req)
  );
});

// Example: Role Management
router.put('/update-role/:id', async (req, res) => {
  const adminid = req.session.adminid;
  
  // Your logic here...
  
  await logAdminAction(
    adminid,
    'Role Updated',
    null,
    `Updated role: ${roleName}`,
    getClientIp(req)
  );
});

export default router;