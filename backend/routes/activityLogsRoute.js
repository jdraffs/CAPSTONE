// routes/activityLogsRoute.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Create activity_logs table if it doesn't exist
async function ensureActivityLogsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      adminid VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_activity_logs_adminid ON activity_logs(adminid);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);
  `;
  
  try {
    await pool.query(createTableQuery);
    console.log('✅ Activity logs table ready');
  } catch (error) {
    console.error('❌ Error creating activity logs table:', error);
  }
}

// Initialize table
ensureActivityLogsTable();

// POST - Create new activity log
router.post('/activity-logs', async (req, res) => {
  try {
    const { type, message, adminId, timestamp, details } = req.body;

    if (!type || !message || !adminId) {
      return res.status(400).json({ error: 'Type, message, and adminId are required' });
    }

    const query = `
      INSERT INTO activity_logs (type, message, adminid, timestamp, details)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      type,
      message,
      adminId,
      timestamp || new Date().toISOString(),
      JSON.stringify(details || {})
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      log: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// GET - Fetch all activity logs (with optional filters)
router.get('/activity-logs', async (req, res) => {
  try {
    const { adminId, type, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT * FROM activity_logs
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    // Filter by admin ID
    if (adminId) {
      query += ` AND adminid = $${paramCount}`;
      values.push(adminId);
      paramCount++;
    }

    // Filter by type
    if (type) {
      query += ` AND type = $${paramCount}`;
      values.push(type);
      paramCount++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    // Transform to match frontend format
    const logs = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      message: row.message,
      adminId: row.adminid,
      timestamp: row.timestamp,
      details: row.details,
      created_at: row.created_at
    }));

    res.json(logs);

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// GET - Fetch activity logs by admin ID
router.get('/activity-logs/admin/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const query = `
      SELECT * FROM activity_logs
      WHERE adminid = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [adminId, parseInt(limit), parseInt(offset)]);

    const logs = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      message: row.message,
      adminId: row.adminid,
      timestamp: row.timestamp,
      details: row.details
    }));

    res.json(logs);

  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch admin activity logs' });
  }
});

// GET - Get activity log statistics
router.get('/activity-logs/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT adminid) as unique_admins,
        type,
        COUNT(*) as count_by_type
      FROM activity_logs
      GROUP BY type
    `;

    const adminStatsQuery = `
      SELECT 
        adminid,
        COUNT(*) as activity_count,
        MAX(timestamp) as last_activity
      FROM activity_logs
      GROUP BY adminid
      ORDER BY activity_count DESC
    `;

    const [typeStats, adminStats] = await Promise.all([
      pool.query(statsQuery),
      pool.query(adminStatsQuery)
    ]);

    res.json({
      by_type: typeStats.rows,
      by_admin: adminStats.rows.map(row => ({
        adminId: row.adminid,
        activityCount: parseInt(row.activity_count),
        lastActivity: row.last_activity
      }))
    });

  } catch (error) {
    console.error('Error fetching activity log stats:', error);
    res.status(500).json({ error: 'Failed to fetch activity log statistics' });
  }
});

// DELETE - Clear all activity logs (admin only)
router.delete('/activity-logs', async (req, res) => {
  try {
    await pool.query('DELETE FROM activity_logs');
    
    res.json({
      success: true,
      message: 'All activity logs cleared'
    });

  } catch (error) {
    console.error('Error clearing activity logs:', error);
    res.status(500).json({ error: 'Failed to clear activity logs' });
  }
});

// DELETE - Clear activity logs by admin ID
router.delete('/activity-logs/admin/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    const result = await pool.query(
      'DELETE FROM activity_logs WHERE adminid = $1',
      [adminId]
    );

    res.json({
      success: true,
      message: `Cleared ${result.rowCount} logs for admin ${adminId}`
    });

  } catch (error) {
    console.error('Error clearing admin activity logs:', error);
    res.status(500).json({ error: 'Failed to clear admin activity logs' });
  }
});

export default router;