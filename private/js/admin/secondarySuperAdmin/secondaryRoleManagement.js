// secondaryRoleManagement.js - Secondary SuperAdmin Role Management (LIMITED)
document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  
  let roles = [];
  let permissions = [];
  let users = [];
  let roleHistory = [];
  let currentEditingRoleId = null;
  let currentAdminId = localStorage.getItem('adminid');

  // Set the actual admin name in the sidebar
  async function setCurrentAdminName() {
    try {
      const response = await fetch(`${API_URL}/admin-accounts`);
      const data = await response.json();
      
      const currentUser = data.admins.find(a => a.adminid === currentAdminId);
      
      if (currentUser) {
        // Update admin name
        const nameElements = document.querySelectorAll('#currentAdminName');
        nameElements.forEach(el => {
          if (el) el.textContent = currentUser.adminid || currentAdminId;
        });
        
        // Update role subtitle to "System Administrator"
        const roleElements = document.querySelectorAll('.user-role');
        roleElements.forEach(el => {
          if (el) el.textContent = 'System Administrator';
        });
        
        console.log('✅ Admin name set:', currentUser.adminid);
      }
    } catch (error) {
      console.error('Error fetching admin name:', error);
      // Fallback to stored admin ID
      const nameElements = document.querySelectorAll('#currentAdminName');
      nameElements.forEach(el => {
        if (el) el.textContent = currentAdminId;
      });
    }
  }

  // Protected roles that System Admin cannot modify
  const PROTECTED_ROLE_IDS = [1, 7]; // Super Administrator, Assistant Super Administrator
  const SYSTEM_CRITICAL_PERMISSION_IDS = [14, 15]; // System Configuration permissions

  
  // Initialize
  initializeProfileDropdown();
  await setCurrentAdminName();
  await initializeRoleManagement();

  async function initializeRoleManagement() {
    showLoading();
    try {
      await Promise.all([
        fetchRoles(),
        fetchPermissions(),
        fetchUsers(),
        fetchRoleHistory()
      ]);
      updateSummaryCards();
      renderRoles();
      attachEventListeners();
    } catch (error) {
      console.error('Error initializing role management:', error);
      showToast('Failed to load role management data', 'error');
    }
  }

  // ============ API CALLS ============
  
  async function fetchRoles() {
    try {
      const response = await fetch(`${API_URL}/roles`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      roles = await response.json();
      console.log('✅ Roles loaded:', roles.length);
    } catch (error) {
      console.error('Error fetching roles:', error);
      roles = getMockRoles();
    }
  }

  async function fetchPermissions() {
    try {
      const response = await fetch(`${API_URL}/permissions`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      permissions = await response.json();
      
      // Filter out system-critical permissions
      permissions = permissions.map(module => ({
        ...module,
        permissions: module.permissions.filter(p => 
          !SYSTEM_CRITICAL_PERMISSION_IDS.includes(p.id)
        )
      })).filter(module => module.permissions.length > 0);
      
      console.log('✅ Permissions loaded (filtered):', permissions.length);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      permissions = getMockPermissions();
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      users = await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      users = [];
    }
  }

  async function fetchRoleHistory() {
    try {
      const response = await fetch(`${API_URL}/role-history`);
      if (!response.ok) throw new Error('Failed to fetch role history');
      const allHistory = await response.json();
      
      // Filter to show only current admin's actions
      roleHistory = allHistory.filter(h => h.user_name === currentAdminId);
    } catch (error) {
      console.error('Error fetching role history:', error);
      roleHistory = [];
    }
  }

  async function createRole(roleData) {
    try {
      const response = await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
      });
      if (!response.ok) throw new Error('Failed to create role');
      
      await logAction('Role Created', roleData.name, `Created new role with ${roleData.permission_ids.length} permissions`);
      
      return await response.json();
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async function updateRole(roleId, roleData) {
    try {
      const response = await fetch(`${API_URL}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
      });
      if (!response.ok) throw new Error('Failed to update role');
      
      await logAction('Role Updated', roleData.name, `Updated role permissions`);
      
      return await response.json();
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async function deleteRole(roleId) {
    try {
      const response = await fetch(`${API_URL}/roles/${roleId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete role');
      
      await logAction('Role Deleted', '', `Deleted role ID ${roleId}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  async function duplicateRole(roleId) {
    try {
      const response = await fetch(`${API_URL}/roles/${roleId}/duplicate`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to duplicate role');
      
      await logAction('Role Duplicated', '', `Duplicated role ID ${roleId}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error duplicating role:', error);
      throw error;
    }
  }

  // ============ UI RENDERING ============

  function updateSummaryCards() {
    const totalRoles = roles.length;
    const editableRoles = roles.filter(r => !PROTECTED_ROLE_IDS.includes(r.id) && !r.is_system).length;
    const protectedRoles = roles.filter(r => PROTECTED_ROLE_IDS.includes(r.id) || r.is_system).length;
    const recentChanges = roleHistory.length;
    
    document.getElementById('totalRolesCount').textContent = totalRoles;
    document.getElementById('editableRolesCount').textContent = editableRoles;
    document.getElementById('protectedRolesCount').textContent = protectedRoles;
    document.getElementById('recentChangesCount').textContent = recentChanges;
  }

  function renderRoles(filteredRoles = null) {
    const rolesGrid = document.getElementById('rolesGrid');
    const rolesToRender = filteredRoles || roles;

    if (rolesToRender.length === 0) {
      rolesGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-user-tag"></i>
          <h3>No roles found</h3>
          <p>Create your first role to get started</p>
        </div>
      `;
      return;
    }

    rolesGrid.innerHTML = rolesToRender.map(role => {
      const isProtected = PROTECTED_ROLE_IDS.includes(role.id) || role.is_system;
      const protectedBadge = isProtected ? '<span class="protected-role-badge"><i class="fas fa-shield-alt"></i> Protected</span>' : '';
      
      return `
      <div class="role-card ${isProtected ? 'protected-role' : ''}" data-role-id="${role.id}">
        <div class="role-card-header">
          <div class="role-info">
            <h3>${role.name}</h3>
            ${protectedBadge}
            <p class="role-description">${role.description || 'No description'}</p>
          </div>
          <div class="role-actions">
            <button class="role-action-btn view-role-btn" data-role-id="${role.id}" title="View Role">
              <i class="fas fa-eye"></i>
            </button>
            ${!isProtected ? `
              <button class="role-action-btn edit-role-btn" data-role-id="${role.id}" title="Edit Role">
                <i class="fas fa-edit"></i>
              </button>
              <button class="role-action-btn duplicate-role-btn" data-role-id="${role.id}" title="Duplicate Role">
                <i class="fas fa-copy"></i>
              </button>
              <button class="role-action-btn danger delete-role-btn" data-role-id="${role.id}" title="Delete Role">
                <i class="fas fa-trash"></i>
              </button>
            ` : `
              <span class="no-action-badge">
                <i class="fas fa-lock"></i> No Actions
              </span>
            `}
          </div>
        </div>

        <div class="role-stats">
          <div class="stat-box">
            <span class="stat-number">${role.user_count || 0}</span>
            <span class="stat-label">Users</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">${role.permissions?.length || 0}</span>
            <span class="stat-label">Permissions</span>
          </div>
        </div>

        <div class="role-permissions-preview">
          <h4>Permissions Preview</h4>
          <div class="permissions-tags">
            ${role.permissions?.slice(0, 4).map(perm => `
              <span class="permission-tag">${perm}</span>
            `).join('') || '<span class="permission-tag">No permissions</span>'}
            ${role.permissions?.length > 4 ? `
              <span class="view-more-tag">+${role.permissions.length - 4} more</span>
            ` : ''}
          </div>
        </div>

        <div class="role-footer">
          <span class="role-modified">Modified ${formatTimeAgo(new Date(role.updated_at || role.created_at))}</span>
          <span class="role-status-badge ${isProtected ? 'protected' : 'active'}">
            ${isProtected ? 'Protected' : 'Editable'}
          </span>
        </div>
      </div>
    `}).join('');

    attachRoleCardListeners();
  }

  function renderPermissionsInModal() {
    const container = document.getElementById('permissionsContainer');
    
    container.innerHTML = permissions.map(module => `
      <div class="permission-module">
        <div class="module-header">
          <i class="${module.icon}"></i>
          <h4>${module.module}</h4>
        </div>
        <div class="module-permissions">
          ${module.permissions.map(perm => `
            <div class="permission-checkbox">
              <input 
                type="checkbox" 
                id="perm_${perm.id}" 
                name="permission" 
                value="${perm.id}"
                ${currentEditingRoleId && isPermissionChecked(perm.id) ? 'checked' : ''}
              >
              <label for="perm_${perm.id}">${perm.name}</label>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function isPermissionChecked(permId) {
    if (!currentEditingRoleId) return false;
    const role = roles.find(r => r.id === currentEditingRoleId);
    return role?.permission_ids?.includes(permId) || false;
  }

  // Continue in Part 2...
  window.roles = roles;
  window.renderRoles = renderRoles;
  window.API_URL = API_URL;
  window.formatTimeAgo = formatTimeAgo;

  // roleManagementLimited.js - PART 2: Modals, Events, and Utilities (CONDENSED)

// ============ MODAL FUNCTIONS ============

function openCreateRoleModal() {
  currentEditingRoleId = null;
  document.getElementById('modalTitle').textContent = 'Create New Role';
  document.getElementById('roleForm').reset();
  document.getElementById('roleId').value = '';
  renderPermissionsInModal();
  document.getElementById('roleModal').classList.add('active');
}

function openEditRoleModal(roleId) {
  const role = roles.find(r => r.id === roleId);
  if (!role) return;
  
  if (PROTECTED_ROLE_IDS.includes(role.id) || role.is_system) {
    showToast('Cannot edit protected/system roles - Access Denied', 'error');
    return;
  }

  currentEditingRoleId = roleId;
  document.getElementById('modalTitle').textContent = 'Edit Role';
  document.getElementById('roleId').value = role.id;
  document.getElementById('roleName').value = role.name;
  document.getElementById('roleDescription').value = role.description || '';
  
  renderPermissionsInModal();
  document.getElementById('roleModal').classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  currentEditingRoleId = null;
}

async function openRoleDetailsModal(roleId) {
  const role = roles.find(r => r.id === roleId);
  if (!role) return;

  const roleUsers = users.filter(u => u.role_id === roleId);
  const isProtected = PROTECTED_ROLE_IDS.includes(role.id) || role.is_system;
  
  const detailsContent = document.getElementById('roleDetailsContent');
  detailsContent.innerHTML = `
    <div class="details-section">
      <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
      ${isProtected ? `
        <div class="protection-notice">
          <i class="fas fa-shield-alt"></i>
          <div>
            <strong>Protected Role</strong>
            <p>This is a system-critical role. You cannot edit or delete this role.</p>
          </div>
        </div>
      ` : ''}
      <div class="details-grid">
        <div class="detail-item">
          <div class="label">Role Name</div>
          <div class="value">${role.name}</div>
        </div>
        <div class="detail-item">
          <div class="label">Description</div>
          <div class="value">${role.description || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="label">Created Date</div>
          <div class="value">${new Date(role.created_at).toLocaleDateString()}</div>
        </div>
        <div class="detail-item">
          <div class="label">Last Modified</div>
          <div class="value">${new Date(role.updated_at || role.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>

    <div class="details-section">
      <h4><i class="fas fa-users"></i> Assigned Users (${roleUsers.length})</h4>
      ${roleUsers.length > 0 ? `
        <div class="users-list">
          ${roleUsers.slice(0, 10).map(user => `
            <div class="user-item">
              <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
              <div class="user-info">
                <div class="user-name">${user.name}</div>
              </div>
            </div>
          `).join('')}
          ${roleUsers.length > 10 ? `<p>...and ${roleUsers.length - 10} more</p>` : ''}
        </div>
      ` : '<p>No users assigned to this role yet.</p>'}
    </div>

    <div class="details-section">
      <h4><i class="fas fa-shield-alt"></i> Permissions (${role.permissions?.length || 0})</h4>
      ${role.permissions?.length > 0 ? `
        <div class="permissions-list">
          ${role.permissions.map(perm => `
            <div class="permission-item">
              <i class="fas fa-check-circle"></i>
              <span>${perm}</span>
            </div>
          `).join('')}
        </div>
      ` : '<p>No permissions assigned to this role.</p>'}
    </div>
  `;

  document.getElementById('detailsModalTitle').textContent = `${role.name} - Details`;
  document.getElementById('roleDetailsModal').classList.add('active');
}

// ============ FORM SUBMISSION ============

async function handleRoleFormSubmit(e) {
  e.preventDefault();

  const roleId = document.getElementById('roleId').value;
  const roleName = document.getElementById('roleName').value.trim();
  const roleDescription = document.getElementById('roleDescription').value.trim();
  
  const selectedPermissions = Array.from(
    document.querySelectorAll('#permissionsContainer input[type="checkbox"]:checked')
  ).map(cb => parseInt(cb.value));

  if (!roleName) {
    showToast('Please enter a role name', 'warning');
    return;
  }

  if (selectedPermissions.length === 0) {
    showToast('Please select at least one permission', 'warning');
    return;
  }

  const roleData = {
    name: roleName,
    description: roleDescription,
    permission_ids: selectedPermissions
  };

  try {
    document.getElementById('saveRoleBtn').disabled = true;
    document.getElementById('saveRoleBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    if (roleId) {
      await updateRole(roleId, roleData);
      showToast(`Role "${roleName}" updated successfully`, 'success');
    } else {
      await createRole(roleData);
      showToast(`Role "${roleName}" created successfully`, 'success');
    }

    await fetchRoles();
    await fetchRoleHistory();
    updateSummaryCards();
    renderRoles();
    closeModal('roleModal');
  } catch (error) {
    showToast('Failed to save role. Please try again.', 'error');
  } finally {
    document.getElementById('saveRoleBtn').disabled = false;
    document.getElementById('saveRoleBtn').innerHTML = '<i class="fas fa-save"></i> Save Role';
  }
}

// ============ ROLE ACTIONS ============

async function handleDeleteRole(roleId) {
  const role = roles.find(r => r.id === roleId);
  if (!role) return;

  if (PROTECTED_ROLE_IDS.includes(role.id) || role.is_system) {
    showToast('Cannot delete protected/system roles - Access Denied', 'error');
    return;
  }

  if (role.user_count > 0) {
    const confirmed = confirm(`This role has ${role.user_count} user(s) assigned. Deleting it will remove their access. Are you sure?`);
    if (!confirmed) return;
  } else {
    const confirmed = confirm(`Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`);
    if (!confirmed) return;
  }

  try {
    await deleteRole(roleId);
    showToast(`Role "${role.name}" deleted successfully`, 'success');
    await fetchRoles();
    await fetchRoleHistory();
    updateSummaryCards();
    renderRoles();
  } catch (error) {
    showToast('Failed to delete role. Please try again.', 'error');
  }
}

async function handleDuplicateRole(roleId) {
  const role = roles.find(r => r.id === roleId);
  if (!role) return;

  try {
    await duplicateRole(roleId);
    showToast(`Role "${role.name}" duplicated successfully`, 'success');
    await fetchRoles();
    await fetchRoleHistory();
    updateSummaryCards();
    renderRoles();
  } catch (error) {
    showToast('Failed to duplicate role. Please try again.', 'error');
  }
}

// ============ SEARCH & FILTER ============

function handleSearch(searchTerm) {
  let filtered = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const filterValue = document.getElementById('filterRoles').value;
  if (filterValue === 'editable') {
    filtered = filtered.filter(r => !PROTECTED_ROLE_IDS.includes(r.id) && !r.is_system);
  } else if (filterValue === 'protected') {
    filtered = filtered.filter(r => PROTECTED_ROLE_IDS.includes(r.id) || r.is_system);
  }
  
  renderRoles(filtered);
}

function handleSort(sortBy) {
  let sorted = [...roles];

  switch(sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'users-desc':
      sorted.sort((a, b) => (b.user_count || 0) - (a.user_count || 0));
      break;
    case 'users-asc':
      sorted.sort((a, b) => (a.user_count || 0) - (b.user_count || 0));
      break;
    case 'recent':
      sorted.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      break;
  }

  renderRoles(sorted);
}

// ============ EVENT LISTENERS ============

function attachEventListeners() {
  document.getElementById('createRoleBtn').addEventListener('click', openCreateRoleModal);
  document.getElementById('closeModalBtn').addEventListener('click', () => closeModal('roleModal'));
  document.getElementById('cancelRoleBtn').addEventListener('click', () => closeModal('roleModal'));
  document.getElementById('closeDetailsModalBtn').addEventListener('click', () => closeModal('roleDetailsModal'));

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  document.getElementById('roleForm').addEventListener('submit', handleRoleFormSubmit);
  document.getElementById('roleSearchInput').addEventListener('input', (e) => handleSearch(e.target.value));
  document.getElementById('filterRoles').addEventListener('change', (e) => {
    handleSearch(document.getElementById('roleSearchInput').value);
  });
  document.getElementById('sortRoles').addEventListener('change', (e) => handleSort(e.target.value));
}

function attachRoleCardListeners() {
  document.querySelectorAll('.role-card').forEach(card => {
    const isProtected = card.classList.contains('protected-role');
    if (!isProtected) {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.role-actions')) {
          const roleId = parseInt(card.dataset.roleId);
          openRoleDetailsModal(roleId);
        }
      });
    }
  });

  document.querySelectorAll('.view-role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openRoleDetailsModal(parseInt(btn.dataset.roleId));
    });
  });

  document.querySelectorAll('.edit-role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditRoleModal(parseInt(btn.dataset.roleId));
    });
  });

  document.querySelectorAll('.duplicate-role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDuplicateRole(parseInt(btn.dataset.roleId));
    });
  });

  document.querySelectorAll('.delete-role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteRole(parseInt(btn.dataset.roleId));
    });
  });
}

// ============ UTILITIES ============

function showLoading() {
  document.getElementById('rolesGrid').innerHTML = `
    <div class="empty-state">
      <i class="fas fa-spinner fa-spin"></i>
      <h3>Loading roles...</h3>
    </div>
  `;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${icons[type]}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

async function logAction(actionType, targetName, details) {
  try {
    await fetch(`${API_URL}/superadmin-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminid: currentAdminId,
        action_type: actionType,
        target_user: targetName,
        details: details
      })
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

function getMockRoles() {
  return [
    { id: 3, name: 'Data Manager', description: 'Manage data uploads', user_count: 2, permissions: ['View Dashboard', 'Manage Data'], permission_ids: [1,3], is_system: false, created_at: '2024-06-15', updated_at: '2024-12-20' },
    { id: 4, name: 'Content Manager', description: 'Manage content', user_count: 3, permissions: ['View Dashboard', 'Edit Content'], permission_ids: [1,4], is_system: false, created_at: '2024-08-10', updated_at: '2024-12-15' }
  ];
}

function getMockPermissions() {
  return [
    { module: 'Dashboard', icon: 'fas fa-tachometer-alt', permissions: [{ id: 1, name: 'View Dashboard' }] },
    { module: 'Documents', icon: 'fas fa-file-alt', permissions: [{ id: 3, name: 'View Documents' }, { id: 4, name: 'Create Documents' }] }
  ];
}

});