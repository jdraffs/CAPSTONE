// roleManagementRoute.js - FIXED USERS ENDPOINT
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
        (SELECT COUNT(*) FROM admin_accounts WHERE role_id = r.id) as user_count,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.name), NULL) as permissions,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.id), NULL) as permission_ids
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(rolesQuery);
    
    // Transform empty arrays properly
    const roles = result.rows.map(role => ({
      ...role,
      permissions: role.permissions.filter(p => p !== null),
      permission_ids: role.permission_ids.filter(id => id !== null)
    }));
    
    console.log('✅ Fetched roles:', roles.length);
    res.json(roles);
  } catch (error) {
    console.error('❌ Error fetching roles:', error.message);
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
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
        (SELECT COUNT(*) FROM admin_accounts WHERE role_id = r.id) as user_count,
        COALESCE(ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::varchar[]) as permissions,
        COALESCE(ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::integer[]) as permission_ids
      FROM roles r
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
    console.error('❌ Error fetching role:', error.message);
    res.status(500).json({ error: 'Failed to fetch role', details: error.message });
  }
});

// ============ CREATE NEW ROLE ============
router.post('/roles', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, description, permission_ids } = req.body;

    console.log('📝 Creating role:', { name, description, permission_ids });

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    if (!permission_ids || permission_ids.length === 0) {
      return res.status(400).json({ error: 'At least one permission is required' });
    }

    await client.query('BEGIN');

    const checkQuery = 'SELECT id FROM roles WHERE LOWER(name) = LOWER($1)';
    const checkResult = await client.query(checkQuery, [name.trim()]);
    
    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Role name already exists' });
    }

    const insertRoleQuery = `
      INSERT INTO roles (name, description, is_system, created_at, updated_at)
      VALUES ($1, $2, false, NOW(), NOW())
      RETURNING id, name, description, is_system, created_at, updated_at
    `;
    
    const roleResult = await client.query(insertRoleQuery, [name.trim(), description?.trim() || null]);
    const newRole = roleResult.rows[0];

    console.log('✅ Role created:', newRole);

    if (permission_ids && permission_ids.length > 0) {
      for (const permId of permission_ids) {
        const insertPermQuery = `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
        `;
        await client.query(insertPermQuery, [newRole.id, permId]);
      }
    }

    console.log('✅ Permissions assigned:', permission_ids.length);

    const historyQuery = `
      INSERT INTO role_history (role_id, role_name, action, details, user_name, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await client.query(historyQuery, [
      newRole.id,
      newRole.name,
      'Role Created',
      `Role "${newRole.name}" was created with ${permission_ids.length} permissions`,
      'SuperAdmin'
    ]);

    await client.query('COMMIT');

    const completeRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM admin_accounts WHERE role_id = r.id) as user_count,
        COALESCE(ARRAY_AGG(p.name), ARRAY[]::varchar[]) as permissions,
        COALESCE(ARRAY_AGG(p.id), ARRAY[]::integer[]) as permission_ids
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const completeResult = await client.query(completeRoleQuery, [newRole.id]);
    
    console.log('✅ Role creation complete');
    res.status(201).json(completeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating role:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to create role', details: error.message });
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

    console.log('📝 Updating role:', id, { name, description, permission_ids });

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    await client.query('BEGIN');

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

    const nameCheckQuery = 'SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND id != $2';
    const nameCheck = await client.query(nameCheckQuery, [name.trim(), id]);
    
    if (nameCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Role name already exists' });
    }

    const updateRoleQuery = `
      UPDATE roles 
      SET name = $1, description = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, description, is_system, created_at, updated_at
    `;
    
    await client.query(updateRoleQuery, [name.trim(), description?.trim() || null, id]);

    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    if (permission_ids && permission_ids.length > 0) {
      for (const permId of permission_ids) {
        const insertPermQuery = `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
        `;
        await client.query(insertPermQuery, [id, permId]);
      }
    }

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
      'SuperAdmin'
    ]);

    await client.query('COMMIT');

    const completeRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM admin_accounts WHERE role_id = r.id) as user_count,
        COALESCE(ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::varchar[]) as permissions,
        COALESCE(ARRAY_AGG(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::integer[]) as permission_ids
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const completeResult = await client.query(completeRoleQuery, [id]);
    
    console.log('✅ Role updated successfully');
    res.json(completeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating role:', error.message);
    res.status(500).json({ error: 'Failed to update role', details: error.message });
  } finally {
    client.release();
  }
});

// ============ DELETE ROLE ============
router.delete('/roles/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting role:', id);

    await client.query('BEGIN');

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

    // Check if role has users assigned
    const userCountResult = await client.query(
      'SELECT COUNT(*) as count FROM admin_accounts WHERE role_id = $1',
      [id]
    );
    
    const userCount = parseInt(userCountResult.rows[0].count);

    const historyQuery = `
      INSERT INTO role_history (role_id, role_name, action, details, user_name, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await client.query(historyQuery, [
      id,
      roleName,
      'Role Deleted',
      `Role "${roleName}" was deleted. ${userCount} user(s) affected.`,
      'SuperAdmin'
    ]);

    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    await client.query('DELETE FROM roles WHERE id = $1', [id]);

    await client.query('COMMIT');

    console.log('✅ Role deleted successfully');
    res.json({ 
      success: true, 
      message: `Role "${roleName}" deleted successfully`,
      users_affected: userCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting role:', error.message);
    res.status(500).json({ error: 'Failed to delete role', details: error.message });
  } finally {
    client.release();
  }
});

// ============ DUPLICATE ROLE ============
router.post('/roles/:id/duplicate', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    console.log('📋 Duplicating role:', id);

    await client.query('BEGIN');

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

    while (true) {
      const checkQuery = 'SELECT id FROM roles WHERE name = $1';
      const check = await client.query(checkQuery, [newName]);
      
      if (check.rows.length === 0) break;
      
      counter++;
      newName = `${original.name} (Copy ${counter})`;
    }

    const insertRoleQuery = `
      INSERT INTO roles (name, description, is_system, created_at, updated_at)
      VALUES ($1, $2, false, NOW(), NOW())
      RETURNING id, name, description, is_system, created_at, updated_at
    `;
    
    const newRoleResult = await client.query(insertRoleQuery, [newName, original.description]);
    const newRole = newRoleResult.rows[0];

    const copyPermissionsQuery = `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, permission_id
      FROM role_permissions
      WHERE role_id = $2
    `;
    
    await client.query(copyPermissionsQuery, [newRole.id, id]);

    const permCountQuery = 'SELECT COUNT(*) as count FROM role_permissions WHERE role_id = $1';
    const permCount = await client.query(permCountQuery, [newRole.id]);

    const historyQuery = `
      INSERT INTO role_history (role_id, role_name, action, details, user_name, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await client.query(historyQuery, [
      newRole.id,
      newRole.name,
      'Role Duplicated',
      `Role "${newRole.name}" was created as a duplicate of "${original.name}" with ${permCount.rows[0].count} permissions`,
      'SuperAdmin'
    ]);

    await client.query('COMMIT');

    const completeRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM admin_accounts WHERE role_id = r.id) as user_count,
        COALESCE(ARRAY_AGG(p.name), ARRAY[]::varchar[]) as permissions,
        COALESCE(ARRAY_AGG(p.id), ARRAY[]::integer[]) as permission_ids
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const completeResult = await client.query(completeRoleQuery, [newRole.id]);
    
    console.log('✅ Role duplicated successfully');
    res.status(201).json(completeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error duplicating role:', error.message);
    res.status(500).json({ error: 'Failed to duplicate role', details: error.message });
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
    console.error('❌ Error fetching permissions:', error.message);
    res.status(500).json({ error: 'Failed to fetch permissions', details: error.message });
  }
});

// ============ GET USERS (FIXED - Now fetches from admin_accounts) ============
router.get('/users', async (req, res) => {
  try {
    const usersQuery = `
      SELECT 
        a.id,
        a.adminid as name,
        CONCAT(a.adminid, '@pup.edu.ph') as email,
        a.role_id,
        a.status,
        a.created_at
      FROM admin_accounts a
      ORDER BY a.created_at DESC
    `;

    const result = await pool.query(usersQuery);
    
    console.log('✅ Fetched users:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
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
    console.error('❌ Error fetching role history:', error.message);
    res.status(500).json({ error: 'Failed to fetch role history', details: error.message });
  }
});

export default router;