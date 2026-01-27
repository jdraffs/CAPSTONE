// backend/utils/logAdminAction.js
// Helper function to log super admin actions

import pool from '../db.js';

/**
 * Log a super admin action
 * @param {string} adminid - The admin ID performing the action
 * @param {string} actionType - Type of action (e.g., 'User Created', 'Role Updated')
 * @param {string} targetUser - The user being affected (optional)
 * @param {string} details - Additional details about the action (optional)
 * @param {string} ipAddress - IP address of the admin (optional)
 * @returns {Promise<object>} - The logged action
 */
export async function logAdminAction(adminid, actionType, targetUser = null, details = null, ipAddress = null) {
  try {
    const query = `
      INSERT INTO superadmin_action_logs 
        (adminid, action_type, target_user, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    
    const values = [adminid, actionType, targetUser, details, ipAddress];
    
    const result = await pool.query(query, values);
    
    console.log(`✅ Logged action: ${actionType} by ${adminid}`);
    
    return {
      success: true,
      action: result.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Error logging admin action:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get IP address from request
 * @param {object} req - Express request object
 * @returns {string} - IP address
 */
export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'Unknown';
}

export default { logAdminAction, getClientIp };