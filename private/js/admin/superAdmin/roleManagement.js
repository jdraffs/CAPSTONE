// roleManagement.js - SuperAdmin Role Management

document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  
  let roles = [];
  let permissions = [];
  let users = [];
  let roleHistory = [];
  let currentEditingRoleId = null;

  // Initialize
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
    } catch (error) {
      console.error('Error fetching roles:', error);
      // Fallback mock data for development
      roles = getMockRoles();
    }
  }

  async function fetchPermissions() {
    try {
      const response = await fetch(`${API_URL}/permissions`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      permissions = await response.json();
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Fallback mock data
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
      // Fallback mock data
      users = getMockUsers();
    }
  }

  async function fetchRoleHistory() {
    try {
      const response = await fetch(`${API_URL}/role-history`);
      if (!response.ok) throw new Error('Failed to fetch role history');
      roleHistory = await response.json();
    } catch (error) {
      console.error('Error fetching role history:', error);
      roleHistory = getMockRoleHistory();
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
      return await response.json();
    } catch (error) {
      console.error('Error duplicating role:', error);
      throw error;
    }
  }

  // ============ UI RENDERING ============

  function updateSummaryCards() {
    document.getElementById('totalRolesCount').textContent = roles.length;
    document.getElementById('totalUsersCount').textContent = users.length;
    
    const totalPermissions = permissions.reduce((sum, module) => 
      sum + module.permissions.length, 0
    );
    document.getElementById('totalPermissionsCount').textContent = totalPermissions;
    
    const recentChanges = roleHistory.filter(h => {
      const daysDiff = (new Date() - new Date(h.timestamp)) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length;
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

    rolesGrid.innerHTML = rolesToRender.map(role => `
      <div class="role-card" data-role-id="${role.id}">
        <div class="role-card-header">
          <div class="role-info">
            <h3>${role.name}</h3>
            <p class="role-description">${role.description || 'No description'}</p>
          </div>
          <div class="role-actions">
            <button class="role-action-btn edit-role-btn" data-role-id="${role.id}" title="Edit Role">
              <i class="fas fa-edit"></i>
            </button>
            <button class="role-action-btn duplicate-role-btn" data-role-id="${role.id}" title="Duplicate Role">
              <i class="fas fa-copy"></i>
            </button>
            ${!role.is_system ? `
              <button class="role-action-btn danger delete-role-btn" data-role-id="${role.id}" title="Delete Role">
                <i class="fas fa-trash"></i>
              </button>
            ` : ''}
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
          <span class="role-status-badge ${role.is_system ? 'system' : 'active'}">
            ${role.is_system ? 'System' : 'Active'}
          </span>
        </div>
      </div>
    `).join('');

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
    currentEditingRoleId = roleId;
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

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
    
    const detailsContent = document.getElementById('roleDetailsContent');
    detailsContent.innerHTML = `
      <div class="details-section">
        <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
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
            ${roleUsers.map(user => `
              <div class="user-item">
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                  <div class="user-name">${user.name}</div>
                  <div class="user-email">${user.email}</div>
                </div>
              </div>
            `).join('')}
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

      <div class="details-section">
        <h4><i class="fas fa-history"></i> Recent Changes</h4>
        ${renderRoleHistory(roleId)}
      </div>
    `;

    document.getElementById('detailsModalTitle').textContent = `${role.name} - Details`;
    document.getElementById('roleDetailsModal').classList.add('active');
  }

  function renderRoleHistory(roleId) {
    const history = roleHistory.filter(h => h.role_id === roleId).slice(0, 5);
    
    if (history.length === 0) {
      return '<p>No history available for this role.</p>';
    }

    return `
      <div class="history-timeline">
        ${history.map(entry => `
          <div class="history-item">
            <div class="history-header">
              <span class="history-action">${entry.action}</span>
              <span class="history-timestamp">${formatTimeAgo(new Date(entry.timestamp))}</span>
            </div>
            <div class="history-details">${entry.details}</div>
            <div class="history-user">By: ${entry.user_name}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function openHistoryModal() {
    const historyContent = document.getElementById('historyContent');
    
    if (roleHistory.length === 0) {
      historyContent.innerHTML = '<p class="no-data">No history available yet.</p>';
    } else {
      historyContent.innerHTML = `
        <div class="history-timeline">
          ${roleHistory.slice(0, 20).map(entry => `
            <div class="history-item">
              <div class="history-header">
                <span class="history-action">${entry.action}</span>
                <span class="history-timestamp">${formatTimeAgo(new Date(entry.timestamp))}</span>
              </div>
              <div class="history-details">${entry.details}</div>
              <div class="history-user">By: ${entry.user_name} | Role: ${entry.role_name}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    document.getElementById('historyModal').classList.add('active');
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

    if (role.is_system) {
      showToast('Cannot delete system roles', 'error');
      return;
    }

    if (role.user_count > 0) {
      const confirmed = await showConfirmDialog(
        `This role has ${role.user_count} user(s) assigned. Deleting it will remove their access. Are you sure?`,
        'Delete Role with Users'
      );
      if (!confirmed) return;
    } else {
      const confirmed = await showConfirmDialog(
        `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
        'Delete Role'
      );
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
    const filtered = roles.filter(role =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
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
    // Create role button
    document.getElementById('createRoleBtn').addEventListener('click', openCreateRoleModal);

    // Modal close buttons
    document.getElementById('closeModalBtn').addEventListener('click', () => closeModal('roleModal'));
    document.getElementById('cancelRoleBtn').addEventListener('click', () => closeModal('roleModal'));
    document.getElementById('closeDetailsModalBtn').addEventListener('click', () => closeModal('roleDetailsModal'));
    document.getElementById('closeHistoryModalBtn').addEventListener('click', () => closeModal('historyModal'));

    // Close modals when clicking overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) closeModal(modal.id);
      });
    });

    // Form submission
    document.getElementById('roleForm').addEventListener('submit', handleRoleFormSubmit);

    // Search
    document.getElementById('roleSearchInput').addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });

    // Sort
    document.getElementById('sortRoles').addEventListener('change', (e) => {
      handleSort(e.target.value);
    });
  }

  function attachRoleCardListeners() {
    // View details on card click
    document.querySelectorAll('.role-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.role-actions')) {
          const roleId = parseInt(card.dataset.roleId);
          openRoleDetailsModal(roleId);
        }
      });
    });

    // Edit buttons
    document.querySelectorAll('.edit-role-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roleId = parseInt(btn.dataset.roleId);
        openEditRoleModal(roleId);
      });
    });

    // Duplicate buttons
    document.querySelectorAll('.duplicate-role-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roleId = parseInt(btn.dataset.roleId);
        handleDuplicateRole(roleId);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-role-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roleId = parseInt(btn.dataset.roleId);
        handleDeleteRole(roleId);
      });
    });
  }

  // ============ UTILITY FUNCTIONS ============

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

  function showConfirmDialog(message, title) {
    return new Promise((resolve) => {
      const confirmed = confirm(`${title}\n\n${message}`);
      resolve(confirmed);
    });
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

  // ============ MOCK DATA (For Development) ============

  function getMockRoles() {
    return [
      {
        id: 1,
        name: 'Super Administrator',
        description: 'Full system access and control',
        user_count: 2,
        permissions: ['All Permissions'],
        permission_ids: [1,2,3,4,5,6,7,8,9,10,11,12],
        is_system: true,
        created_at: '2024-01-01',
        updated_at: '2024-12-01'
      },
      {
        id: 2,
        name: 'Content Manager',
        description: 'Manage content and publications',
        user_count: 5,
        permissions: ['View Dashboard', 'Manage Documents', 'Create Reports', 'View Analytics'],
        permission_ids: [1,3,4,7],
        is_system: false,
        created_at: '2024-06-15',
        updated_at: '2024-12-20'
      },
      {
        id: 3,
        name: 'Data Analyst',
        description: 'Access to analytics and reports',
        user_count: 3,
        permissions: ['View Dashboard', 'View Analytics', 'Export Reports', 'View Statistics'],
        permission_ids: [1,7,8,9],
        is_system: false,
        created_at: '2024-08-10',
        updated_at: '2024-12-15'
      }
    ];
  }

  function getMockPermissions() {
    return [
      {
        module: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        permissions: [
          { id: 1, name: 'View Dashboard' },
          { id: 2, name: 'Manage Widgets' }
        ]
      },
      {
        module: 'Documents',
        icon: 'fas fa-file-alt',
        permissions: [
          { id: 3, name: 'View Documents' },
          { id: 4, name: 'Create Documents' },
          { id: 5, name: 'Edit Documents' },
          { id: 6, name: 'Delete Documents' }
        ]
      },
      {
        module: 'Analytics',
        icon: 'fas fa-chart-line',
        permissions: [
          { id: 7, name: 'View Analytics' },
          { id: 8, name: 'Export Reports' },
          { id: 9, name: 'View Statistics' }
        ]
      },
      {
        module: 'Users',
        icon: 'fas fa-users',
        permissions: [
          { id: 10, name: 'View Users' },
          { id: 11, name: 'Manage Users' },
          { id: 12, name: 'Assign Roles' }
        ]
      },
      {
        module: 'Settings',
        icon: 'fas fa-cog',
        permissions: [
          { id: 13, name: 'View Settings' },
          { id: 14, name: 'Modify Settings' },
          { id: 15, name: 'System Configuration' }
        ]
      }
    ];
  }

  function getMockUsers() {
    return [
      { id: 1, name: 'Admin User', email: 'admin@pup.edu.ph', role_id: 1 },
      { id: 2, name: 'John Doe', email: 'john@pup.edu.ph', role_id: 2 },
      { id: 3, name: 'Jane Smith', email: 'jane@pup.edu.ph', role_id: 2 },
      { id: 4, name: 'Mike Johnson', email: 'mike@pup.edu.ph', role_id: 3 },
      { id: 5, name: 'Sarah Williams', email: 'sarah@pup.edu.ph', role_id: 2 }
    ];
  }

  function getMockRoleHistory() {
    return [
      {
        id: 1,
        role_id: 2,
        role_name: 'Content Manager',
        action: 'Role Created',
        details: 'Content Manager role was created with document management permissions',
        user_name: 'SuperAdmin',
        timestamp: '2024-12-20T10:30:00'
      },
      {
        id: 2,
        role_id: 2,
        role_name: 'Content Manager',
        action: 'Permissions Modified',
        details: 'Added "Create Reports" permission',
        user_name: 'SuperAdmin',
        timestamp: '2024-12-18T14:20:00'
      },
      {
        id: 3,
        role_id: 3,
        role_name: 'Data Analyst',
        action: 'Role Created',
        details: 'Data Analyst role created for analytics team',
        user_name: 'SuperAdmin',
        timestamp: '2024-12-15T09:15:00'
      }
    ];
  }
});