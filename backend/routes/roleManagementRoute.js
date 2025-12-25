// roleManagementRoute.js - Backend API Routes for Role Management
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ============ GET ALL ROLES ============
router.get('/roles', async (req, res) => {
  try {
    const rolesQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        COUNT(DISTINCT u.id) as user_count,
        ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions,
        ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL) as permission_ids
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(rolesQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// ============ GET SINGLE ROLE ============
router.get('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const roleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        COUNT(DISTINCT u.id) as user_count,
        ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions,
        ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL) as permission_ids
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at
    `;

    const result = await pool.query(roleQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// ============ CREATE NEW ROLE ============
router.post('/roles', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, description, permission_ids } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    if (!permission_ids || permission_ids.length === 0) {
      return res.status(400).json({ error: 'At least one permission is required' });
    }

    await client.query('BEGIN');

    // Check if role name already exists
    const checkQuery = 'SELECT id FROM roles WHERE LOWER(name) = LOWER($1)';
    const checkResult = await client.query(checkQuery, [name.trim()]);
    
    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Role name already exists' });
    }

    // Insert new role
    const insertRoleQuery = `
      INSERT INTO roles (name, description, is_system, created_at, updated_at)
      VALUES ($1, $2, false, NOW(), NOW())
      RETURNING id, name, description, is_system, created_at, updated_at
    `;
    
    const roleResult = await client.query(insertRoleQuery, [name.trim(), description?.trim() || null]);
    const newRole = roleResult.rows[0];

    // Insert role permissions
    if (permission_ids && permission_ids.length > 0) {
      const permissionValues = permission_ids.map((permId, idx) => 
        `($1, $${idx + 2})`
      ).join(', ');
      
      const insertPermissionsQuery = `
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ${permissionValues}
      `;
      
      await client.query(insertPermissionsQuery, [newRole.id, ...permission_ids]);
    }

    // Log to history
    const historyQuery = `
      INSERT INTO role_history (role_id, role_name, action, details, user_name, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await client.query(historyQuery, [
      newRole.id,
      newRole.name,
      'Role Created',
      `Role "${newRole.name}" was created with ${permission_ids.length} permissions`,
      'SuperAdmin' // TODO: Replace with actual logged-in user
    ]);

    await client.query('COMMIT');

    // Fetch complete role data
    const completeRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        0 as user_count,
        ARRAY_AGG(p.name) as permissions,
        ARRAY_AGG(p.id) as permission_ids
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const completeResult = await client.query(completeRoleQuery, [newRole.id]);
    
    res.status(201).json(completeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  } finally {
    client.release();
  }
});

// ============ UPDATE ROLE ============
router.put('/roles/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { name, description, permission_ids } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    await client.query('BEGIN');

    // Check if role exists and is not a system role
    const roleCheck = await client.query('SELECT is_system, name FROM roles WHERE id = $1', [id]);
    
    if (roleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot modify system roles' });
    }

    const oldRoleName = roleCheck.rows[0].name;

    // Check if new name conflicts with another role
    const nameCheckQuery = 'SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND id != $2';
    const nameCheck = await client.query(nameCheckQuery, [name.trim(), id]);
    
    if (nameCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Role name already exists' });
    }

    // Update role
    const updateRoleQuery = `
      UPDATE roles 
      SET name = $1, description = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, description, is_system, created_at, updated_at
    `;
    
    const roleResult = await client.query(updateRoleQuery, [name.trim(), description?.trim() || null, id]);

    // Delete existing permissions
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    // Insert new permissions
    if (permission_ids && permission_ids.length > 0) {
      const permissionValues = permission_ids.map((permId, idx) => 
        `($1, $${idx + 2})`
      ).join(', ');
      
      const insertPermissionsQuery = `
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ${permissionValues}
      `;
      
      await client.query(insertPermissionsQuery, [id, ...permission_ids]);
    }

    // Log to history
    const changes = [];
    if (oldRoleName !== name.trim()) changes.push(`Name changed from "${oldRoleName}" to "${name}"`);
    changes.push(`Permissions updated (${permission_ids?.length || 0} permissions)`);

    const historyQuery = `
      INSERT INTO role_history (role_id, role_name, action, details, user_name, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await client.query(historyQuery, [
      id,
      name.trim(),
      'Role Updated',
      changes.join(', '),
      'SuperAdmin' // TODO: Replace with actual logged-in user
    ]);

    await client.query('COMMIT');

    // Fetch complete role data
    const completeRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        COUNT(DISTINCT u.id) as user_count,
        ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions,
        ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL) as permission_ids
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const completeResult = await client.query(completeRoleQuery, [id]);
    
    res.json(completeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  } finally {
    client.release();
  }
});

// ============ DELETE ROLE ============
router.delete('/roles/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if role exists and is not a system role
    const roleCheck = await client.query(
      'SELECT is_system, name FROM roles WHERE id = $1',
      [id]
    );
    
    if (roleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    const roleName = roleCheck.rows[0].name;

    // Check if role has users
    const userCheck = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE role_id = $1',
      [id]
    );
    
    const userCount = parseInt(userCheck.rows[0].count);

    if (userCount > 0) {
      // Optional: You can either prevent deletion or reassign users
      // For now, we'll set users' role_id to NULL
      await client.query('UPDATE users SET role_id = NULL WHERE role_id = $1', [id]);
    }

    // Log to history before deletion
    const historyQuery = `
      INSERT INTO role_history (role_id, role_name, action, details, user_name, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await client.query(historyQuery, [
      id,
      roleName,
      'Role Deleted',
      `Role "${roleName}" was deleted. ${userCount} user(s) were unassigned.`,
      'SuperAdmin' // TODO: Replace with actual logged-in user
    ]);

    // Delete role permissions (will cascade if foreign key is set up)
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    // Delete role
    await client.query('DELETE FROM roles WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: `Role "${roleName}" deleted successfully`,
      users_affected: userCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  } finally {
    client.release();
  }
});

// ============ DUPLICATE ROLE ============
router.post('/roles/:id/duplicate', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get original role
    const originalRoleQuery = `
      SELECT name, description
      FROM roles
      WHERE id = $1
    `;
    
    const originalRole = await client.query(originalRoleQuery, [id]);
    
    if (originalRole.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role not found' });
    }

    const original = originalRole.rows[0];
    let newName = `${original.name} (Copy)`;
    let counter = 1;

    // Ensure unique name
    while (true) {
      const checkQuery = 'SELECT id FROM roles WHERE name = $1';
      const check = await client.query(checkQuery, [newName]);
      
      if (check.rows.length === 0) break;
      
      counter++;
      newName = `${original.name} (Copy ${counter})`;
    }

    // Create new role
    const insertRoleQuery = `
      INSERT INTO roles (name, description, is_system, created_at, updated_at)
      VALUES ($1, $2, false, NOW(), NOW())
      RETURNING id, name, description, is_system, created_at, updated_at
    `;
    
    const newRoleResult = await client.query(insertRoleQuery, [newName, original.description]);
    const newRole = newRoleResult.rows[0];

    // Copy permissions
    const copyPermissionsQuery = `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, permission_id
      FROM role_permissions
      WHERE role_id = $2
    `;
    
    await client.query(copyPermissionsQuery, [newRole.id, id]);

    // Get permission count
    const permCountQuery = 'SELECT COUNT(*) as count FROM role_permissions WHERE role_id = $1';
    const permCount = await client.query(permCountQuery, [newRole.id]);

    // Log to history
    const historyQuery = `
      INSERT INTO role_history (role_id, role_name, action, details, user_name, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await client.query(historyQuery, [
      newRole.id,
      newRole.name,
      'Role Duplicated',
      `Role "${newRole.name}" was created as a duplicate of "${original.name}" with ${permCount.rows[0].count} permissions`,
      'SuperAdmin' // TODO: Replace with actual logged-in user
    ]);

    await client.query('COMMIT');

    // Fetch complete role data
    const completeRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        0 as user_count,
        ARRAY_AGG(p.name) as permissions,
        ARRAY_AGG(p.id) as permission_ids
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const completeResult = await client.query(completeRoleQuery, [newRole.id]);
    
    res.status(201).json(completeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error duplicating role:', error);
    res.status(500).json({ error: 'Failed to duplicate role' });
  } finally {
    client.release();
  }
});

// ============ GET ALL PERMISSIONS ============
router.get('/permissions', async (req, res) => {
  try {
    const permissionsQuery = `
      SELECT 
        module,
        COALESCE(icon, 'fas fa-circle') as icon,
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'description', description
          ) ORDER BY name
        ) as permissions
      FROM permissions
      GROUP BY module, icon
      ORDER BY 
        CASE module
          WHEN 'Dashboard' THEN 1
          WHEN 'Documents' THEN 2
          WHEN 'Analytics' THEN 3
          WHEN 'Users' THEN 4
          WHEN 'Settings' THEN 5
          ELSE 6
        END
    `;

    const result = await pool.query(permissionsQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// ============ GET USERS (for Role Management) ============
router.get('/users', async (req, res) => {
  try {
    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role_id,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.name
    `;

    const result = await pool.query(usersQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============ GET ROLE HISTORY ============
router.get('/role-history', async (req, res) => {
  try {
    const { role_id, limit = 50 } = req.query;

    let historyQuery = `
      SELECT 
        id,
        role_id,
        role_name,
        action,
        details,
        user_name,
        timestamp
      FROM role_history
    `;

    const params = [];
    
    if (role_id) {
      historyQuery += ' WHERE role_id = $1';
      params.push(role_id);
    }

    historyQuery += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(historyQuery, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching role history:', error);
    res.status(500).json({ error: 'Failed to fetch role history' });
  }
});

// ============ SEED INITIAL PERMISSIONS (One-time setup) ============
router.post('/seed-permissions', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const permissions = [
      // Dashboard
      { module: 'Dashboard', icon: 'fas fa-tachometer-alt', name: 'View Dashboard', description: 'Access to main dashboard' },
      { module: 'Dashboard', icon: 'fas fa-tachometer-alt', name: 'Manage Widgets', description: 'Customize dashboard widgets' },
      
      // Documents
      { module: 'Documents', icon: 'fas fa-file-alt', name: 'View Documents', description: 'View all documents' },
      { module: 'Documents', icon: 'fas fa-file-alt', name: 'Create Documents', description: 'Create new documents' },
      { module: 'Documents', icon: 'fas fa-file-alt', name: 'Edit Documents', description: 'Edit existing documents' },
      { module: 'Documents', icon: 'fas fa-file-alt', name: 'Delete Documents', description: 'Delete documents' },
      
      // Analytics
      { module: 'Analytics', icon: 'fas fa-chart-line', name: 'View Analytics', description: 'Access analytics dashboard' },
      { module: 'Analytics', icon: 'fas fa-chart-line', name: 'Export Reports', description: 'Export analytics reports' },
      { module: 'Analytics', icon: 'fas fa-chart-line', name: 'View Statistics', description: 'View system statistics' },
      
      // Users
      { module: 'Users', icon: 'fas fa-users', name: 'View Users', description: 'View user list' },
      { module: 'Users', icon: 'fas fa-users', name: 'Manage Users', description: 'Create, edit, delete users' },
      { module: 'Users', icon: 'fas fa-users', name: 'Assign Roles', description: 'Assign roles to users' },
      
      // Settings
      { module: 'Settings', icon: 'fas fa-cog', name: 'View Settings', description: 'View system settings' },
      { module: 'Settings', icon: 'fas fa-cog', name: 'Modify Settings', description: 'Modify system settings' },
      { module: 'Settings', icon: 'fas fa-cog', name: 'System Configuration', description: 'Advanced system configuration' }
    ];

    for (const perm of permissions) {
      await client.query(
        'INSERT INTO permissions (module, icon, name, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [perm.module, perm.icon, perm.name, perm.description]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Permissions seeded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding permissions:', error);
    res.status(500).json({ error: 'Failed to seed permissions' });
  } finally {
    client.release();
  }
});

export default router;