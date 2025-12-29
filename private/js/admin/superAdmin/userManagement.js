// userManagement.js - UPDATED WITH ROLE INTEGRATION - PART 1 OF 2
// ========================================================
// CONFIGURATION & GLOBAL VARIABLES
// ========================================================

const API_BASE = 'http://localhost:3000/api';
let currentAdminId = localStorage.getItem('adminid');
let allUsers = [];
let filteredUsers = [];
let roles = [];
let permissions = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentEditingUserId = null;

// ========================================================
// INITIALIZE ON PAGE LOAD
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 User Management Initializing...');
  console.log('Current Admin ID:', currentAdminId);
  
  if (!currentAdminId) {
    alert('You must be logged in to access this page.');
    window.location.href = '/private/html/AdminLogin/login.html';
    return;
  }
  
  initializeUserManagement();
});

async function initializeUserManagement() {
  console.log('📋 Starting initialization...');
  showLoadingState();
  await Promise.all([
    loadRoles(),
    loadPermissions(),
    loadUsers()
  ]);
  injectHTML();
  attachEventListeners();
  updateStats();
  filterAndDisplayUsers();
}

// ========================================================
// DATA LOADING - ROLES & PERMISSIONS
// ========================================================
async function loadRoles() {
  console.log('📥 Loading roles...');
  try {
    const response = await fetch(`${API_BASE}/roles`);
    console.log('Roles response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Roles data:', data);
    
    if (data.success && data.roles) {
      roles = data.roles;
      console.log('✅ Roles loaded:', roles.length);
    } else {
      console.warn('⚠️ No roles found, using defaults');
      roles = getDefaultRoles();
    }
  } catch (error) {
    console.error('❌ Error loading roles:', error);
    roles = getDefaultRoles();
  }
}

async function loadPermissions() {
  console.log('📥 Loading permissions...');
  try {
    const response = await fetch(`${API_BASE}/permissions`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.permissions) {
      permissions = data.permissions;
      console.log('✅ Permissions loaded:', permissions.length);
    } else {
      permissions = [];
    }
  } catch (error) {
    console.error('❌ Error loading permissions:', error);
    permissions = [];
  }
}

async function loadUsers() {
  console.log('📥 Loading users...');
  try {
    const response = await fetch(`${API_BASE}/users`);
    console.log('Users response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Users data:', data);
    
    if (data.success && data.users) {
      allUsers = data.users.map(user => ({
        ...user,
        // Ensure role information is properly set
        role_id: user.role_id,
        role_name: user.role_name || 'No Role',
        role_permissions: user.role_permissions || []
      }));
      
      console.log('✅ Users loaded:', allUsers.length);
      console.log('Sample user:', allUsers[0]);
    } else {
      console.warn('⚠️ No users found in response');
      allUsers = [];
    }
    
  } catch (error) {
    console.error('❌ Error loading users:', error);
    allUsers = [];
    throw error;
  }
}

function getDefaultRoles() {
  return [
    { id: 1, name: 'Super Admin', user_count: 0, permissions: [] },
    { id: 2, name: 'Data Manager', user_count: 0, permissions: [] },
    { id: 3, name: 'Content Manager', user_count: 0, permissions: [] }
  ];
}

// ========================================================
// HTML INJECTION
// ========================================================
function injectHTML() {
  console.log('🎨 Injecting HTML...');
  const mainContent = document.getElementById('mainContent');
  
  if (!mainContent) {
    console.error('❌ mainContent element not found!');
    return;
  }
  
  mainContent.innerHTML = `
    <div class="user-management-container">
      <!-- Header Section -->
      <div class="um-header">
        <div class="um-header-left">
          <h2>User Management</h2>
          <p class="um-subtitle">Manage system users, roles, and permissions</p>
        </div>
        <div class="um-header-right">
          <button class="btn-secondary" id="btnManageRoles">
            <i class="fas fa-user-tag"></i> Manage Roles
          </button>
          <button class="btn-primary" id="btnCreateUser">
            <i class="fas fa-user-plus"></i> Create User
          </button>
          <button class="btn-secondary" id="btnRefresh">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="um-stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-content">
            <h3 id="statTotalUsers">0</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <i class="fas fa-user-check"></i>
          </div>
          <div class="stat-content">
            <h3 id="statActiveUsers">0</h3>
            <p>Active Users</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <i class="fas fa-user-clock"></i>
          </div>
          <div class="stat-content">
            <h3 id="statInactiveUsers">0</h3>
            <p>Inactive Users</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <i class="fas fa-user-tag"></i>
          </div>
          <div class="stat-content">
            <h3 id="statTotalRoles">${roles.length}</h3>
            <p>Total Roles</p>
          </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="um-controls">
        <div class="um-filters">
          <button class="filter-btn active" data-filter="all">
            All Users
          </button>
          <button class="filter-btn" data-filter="active">
            <i class="fas fa-circle status-active"></i> Active
          </button>
          <button class="filter-btn" data-filter="inactive">
            <i class="fas fa-circle status-inactive"></i> Inactive
          </button>
          <button class="filter-btn" data-filter="suspended">
            <i class="fas fa-circle status-suspended"></i> Suspended
          </button>
        </div>
        
        <div class="um-filter-group">
          <select id="roleFilter" class="filter-select">
            <option value="">All Roles</option>
            ${roles.map(role => `<option value="${role.id}">${role.name}</option>`).join('')}
          </select>
          
          <div class="um-search">
            <i class="fas fa-search"></i>
            <input 
              type="text" 
              id="searchUsers" 
              placeholder="Search by ID, name, or email..."
            />
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="um-table-container">
        <table class="um-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" id="selectAll" title="Select All">
              </th>
              <th>User ID</th>
              <th>Full Name</th>
              <th>Email/Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersTableBody">
            <tr>
              <td colspan="8" class="loading-cell">
                <i class="fas fa-spinner fa-spin"></i> Loading users...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bulk Actions Bar (Hidden by default) -->
      <div class="bulk-actions-bar" id="bulkActionsBar" style="display: none;">
        <span class="selected-count">0 users selected</span>
        <div class="bulk-actions">
          <button class="bulk-btn" id="bulkActivate">
            <i class="fas fa-check-circle"></i> Activate
          </button>
          <button class="bulk-btn" id="bulkDeactivate">
            <i class="fas fa-pause-circle"></i> Deactivate
          </button>
          <button class="bulk-btn" id="bulkChangeRole">
            <i class="fas fa-user-tag"></i> Change Role
          </button>
          <button class="bulk-btn danger" id="bulkDelete">
            <i class="fas fa-trash-alt"></i> Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Modals Container -->
    <div id="modalContainer"></div>
  `;
  
  console.log('✅ HTML injected successfully');
}

// ========================================================
// EVENT LISTENERS
// ========================================================
function attachEventListeners() {
  console.log('🔗 Attaching event listeners...');
  
  // Header buttons
  const btnRefresh = document.getElementById('btnRefresh');
  const btnCreateUser = document.getElementById('btnCreateUser');
  const btnManageRoles = document.getElementById('btnManageRoles');
  
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      console.log('🔄 Refresh clicked');
      loadUsers().then(() => {
        updateStats();
        filterAndDisplayUsers();
      });
    });
  }
  
  if (btnCreateUser) {
    btnCreateUser.addEventListener('click', () => {
      console.log('➕ Create user clicked');
      openCreateUserModal();
    });
  }
  
  if (btnManageRoles) {
    btnManageRoles.addEventListener('click', () => {
      window.location.href = '/private/html/adminPages/adminSalao/roleManagement.html';
    });
  }

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      console.log('🔍 Filter clicked:', e.target.dataset.filter);
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      filterAndDisplayUsers();
    });
  });

  // Role filter
  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      console.log('🔍 Role filter changed');
      filterAndDisplayUsers();
    });
  }

  // Search input
  const searchInput = document.getElementById('searchUsers');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value.toLowerCase();
      console.log('🔍 Search term:', currentSearchTerm);
      filterAndDisplayUsers();
    });
  }

  // Select all checkbox
  const selectAll = document.getElementById('selectAll');
  if (selectAll) {
    selectAll.addEventListener('change', handleSelectAll);
  }

  // Bulk actions
  document.getElementById('bulkActivate').addEventListener('click', () => handleBulkAction('activate'));
  document.getElementById('bulkDeactivate').addEventListener('click', () => handleBulkAction('deactivate'));
  document.getElementById('bulkChangeRole').addEventListener('click', () => openBulkChangeRoleModal());
  document.getElementById('bulkDelete').addEventListener('click', () => handleBulkAction('delete'));
}

// ========================================================
// DATA LOADING - USERS
// ========================================================
async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');

    const data = await response.json();
    allUsers = data.users || [];
    
    // Enrich users with role information
    allUsers = allUsers.map(user => {
      const userRole = roles.find(r => r.name === user.role || r.id === user.role_id);
      return {
        ...user,
        role_id: userRole?.id || null,
        role_name: userRole?.name || user.role || 'No Role',
        role_permissions: userRole?.permissions || []
      };
    });
    
    updateStats();
    filterAndDisplayUsers();
    
  } catch (error) {
    console.error('Error loading users:', error);
    showError('Failed to load users. Please try again.');
  }
}

// ========================================================
// STATS UPDATE
// ========================================================
function updateStats() {
  console.log('📊 Updating stats...');
  
  const total = allUsers.length;
  const active = allUsers.filter(u => u.status === 'active').length;
  const inactive = allUsers.filter(u => u.status === 'inactive').length;
  const suspended = allUsers.filter(u => u.status === 'suspended').length;

  document.getElementById('statTotalUsers').textContent = total;
  document.getElementById('statActiveUsers').textContent = active;
  document.getElementById('statInactiveUsers').textContent = inactive;
  document.getElementById('statTotalRoles').textContent = roles.length;
}

// ========================================================
// FILTER & DISPLAY
// ========================================================
function filterAndDisplayUsers() {
  console.log('🔍 Filtering users...');
  console.log('Current filter:', currentFilter);
  console.log('Search term:', currentSearchTerm);
  
  const selectedRoleId = document.getElementById('roleFilter')?.value;
  
  // Start with all users
  filteredUsers = [...allUsers];
  
  // Apply status filter
  if (currentFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.status === currentFilter);
  }

  // Apply role filter
  if (selectedRoleId) {
    filteredUsers = filteredUsers.filter(user => 
      user.role_id === parseInt(selectedRoleId)
    );
  }

  // Apply search filter
  if (currentSearchTerm) {
    filteredUsers = filteredUsers.filter(user => {
      const searchableText = `
        ${user.adminid || ''} 
        ${user.full_name || ''} 
        ${user.email || ''}
        ${user.role_name || ''}
      `.toLowerCase();
      
      return searchableText.includes(currentSearchTerm);
    });
  }

  console.log('✅ Filtered users:', filteredUsers.length);
  displayUsers();
}

// ========================================================
// DISPLAY USERS TABLE
// ========================================================
function displayUsers() {
  console.log('🎨 Displaying users...');
  const tbody = document.getElementById('usersTableBody');
  
  if (!tbody) {
    console.error('❌ Users table body not found!');
    return;
  }
  
  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-cell">
          <i class="fas fa-inbox"></i>
          <p>No users found</p>
        </td>
      </tr>
    `;
    console.log('⚠️ No users to display');
    return;
  }

  tbody.innerHTML = filteredUsers.map(user => `
    <tr data-user-id="${user.adminid}">
      <td>
        <input 
          type="checkbox" 
          class="user-checkbox" 
          data-user-id="${user.adminid}"
          ${user.adminid === currentAdminId ? 'disabled' : ''}
        >
      </td>
      <td class="user-id">${user.adminid}</td>
      <td class="user-name">
        <div class="user-avatar">
          <i class="fas fa-user-circle"></i>
        </div>
        <span>${user.full_name || user.adminid}</span>
      </td>
      <td>${user.email || user.adminid}</td>
      <td>
        <span class="role-badge role-${user.role_id || 'default'}" title="${(user.role_permissions || []).length} permissions">
          <i class="fas fa-user-tag"></i>
          ${user.role_name || 'No Role'}
        </span>
      </td>
      <td>
        <span class="status-badge status-${user.status || 'active'}">
          ${formatStatus(user.status || 'active')}
        </span>
      </td>
      <td>${formatLastLogin(user.last_login)}</td>
      <td class="actions-cell">
        <div class="action-buttons">
          <button 
            class="btn-action btn-view" 
            onclick="openUserDetailsModal('${user.adminid}')"
            title="View Details"
          >
            <i class="fas fa-eye"></i>
          </button>
          <button 
            class="btn-action btn-edit" 
            onclick="openEditUserModal('${user.adminid}')"
            title="Edit User"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button 
            class="btn-action btn-more" 
            onclick="openUserActions('${user.adminid}')"
            title="More Actions"
          >
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  console.log('✅ Users displayed:', filteredUsers.length);
  
  // Attach checkbox listeners
  attachCheckboxListeners();
}

// ========================================================
// CHECKBOX HANDLING
// ========================================================
function attachCheckboxListeners() {
  document.querySelectorAll('.user-checkbox').forEach(cb => {
    cb.addEventListener('change', updateBulkActionsBar);
  });
}

function handleSelectAll(e) {
  const isChecked = e.target.checked;
  document.querySelectorAll('.user-checkbox:not([disabled])').forEach(cb => {
    cb.checked = isChecked;
  });
  updateBulkActionsBar();
}

function updateBulkActionsBar() {
  const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
  const count = selectedCheckboxes.length;
  const bulkBar = document.getElementById('bulkActionsBar');
  
  if (bulkBar) {
    if (count > 0) {
      bulkBar.style.display = 'flex';
      const countSpan = bulkBar.querySelector('.selected-count');
      if (countSpan) {
        countSpan.textContent = `${count} user${count > 1 ? 's' : ''} selected`;
      }
    } else {
      bulkBar.style.display = 'none';
    }
  }
}

function getSelectedUserIds() {
  return Array.from(document.querySelectorAll('.user-checkbox:checked'))
    .map(cb => cb.dataset.userId);
}

// ========================================================
// UTILITY FUNCTIONS
// ========================================================
function formatStatus(status) {
  const statusMap = {
    'active': 'Active',
    'inactive': 'Inactive',
    'suspended': 'Suspended'
  };
  return statusMap[status] || status;
}

function formatLastLogin(timestamp) {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function showLoadingState() {
  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin fa-3x"></i>
        <p>Loading user management...</p>
      </div>
    `;
  }
}

function showError(message) {
  const tbody = document.getElementById('usersTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="error-cell">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
        </td>
      </tr>
    `;
  }
}

// userManagement.js - UPDATED WITH ROLE INTEGRATION - PART 2 OF 2
// ========================================================
// COPY THIS AND APPEND IT DIRECTLY AFTER PART 1
// ========================================================

// ========================================================
// CREATE USER MODAL
// ========================================================
function openCreateUserModal() {
  console.log('➕ Opening create user modal...');
  const modal = document.getElementById('modalContainer');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content create-user-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-user-plus"></i> Create New User</h3>
          <button class="modal-close" onclick="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="createUserForm" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label for="newUsername">Username/Admin ID <span class="required">*</span></label>
              <input type="text" id="newUsername" required placeholder="e.g., admin123">
            </div>
            
            <div class="form-group">
              <label for="newFullName">Full Name <span class="required">*</span></label>
              <input type="text" id="newFullName" required placeholder="e.g., John Doe">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="newEmail">Email Address</label>
              <input type="email" id="newEmail" placeholder="e.g., user@pup.edu.ph">
            </div>
            
            <div class="form-group">
              <label for="newRole">Assign Role <span class="required">*</span></label>
              <select id="newRole" required>
                <option value="">-- Select Role --</option>
                ${roles.map(role => `
                  <option value="${role.id}">${role.name}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="newPassword">Password <span class="required">*</span></label>
              <div class="password-input-group">
                <input type="password" id="newPassword" required placeholder="Minimum 8 characters">
                <button type="button" class="toggle-password" onclick="togglePasswordVisibility('newPassword')">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm Password <span class="required">*</span></label>
              <div class="password-input-group">
                <input type="password" id="confirmPassword" required placeholder="Re-enter password">
                <button type="button" class="toggle-password" onclick="togglePasswordVisibility('confirmPassword')">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <button type="button" class="btn-link" onclick="generateRandomPassword()">
              <i class="fas fa-random"></i> Generate Random Password
            </button>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary">
              <i class="fas fa-user-plus"></i> Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Attach form submit handler
  document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
}

// ========================================================
// EDIT USER MODAL
// ========================================================
function openEditUserModal(userId) {
  console.log('✏️ Opening edit modal for:', userId);
  const user = allUsers.find(u => u.adminid === userId);
  
  if (!user) {
    console.error('❌ User not found:', userId);
    showToast('User not found', 'error');
    return;
  }

  const modal = document.getElementById('modalContainer');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content edit-user-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-user-edit"></i> Edit User: ${user.adminid}</h3>
          <button class="modal-close" onclick="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="editUserForm" class="modal-body">
          <input type="hidden" id="editUserId" value="${user.adminid}">
          
          <div class="form-row">
            <div class="form-group">
              <label for="editFullName">Full Name</label>
              <input type="text" id="editFullName" value="${user.full_name || ''}" placeholder="Full Name">
            </div>
            
            <div class="form-group">
              <label for="editEmail">Email Address</label>
              <input type="email" id="editEmail" value="${user.email || ''}" placeholder="Email">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="editRole">Role <span class="required">*</span></label>
              <select id="editRole" required>
                ${roles.map(role => `
                  <option value="${role.id}" ${role.id === user.role_id ? 'selected' : ''}>
                    ${role.name}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="editStatus">Status</label>
              <select id="editStatus">
                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary">
              <i class="fas fa-save"></i> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Attach form submit handler
  document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
}

// ========================================================
// USER DETAILS MODAL
// ========================================================
function openUserDetailsModal(userId) {
  console.log('👁️ Opening details modal for:', userId);
  const user = allUsers.find(u => u.adminid === userId);
  
  if (!user) {
    showToast('User not found', 'error');
    return;
  }

  const userRole = roles.find(r => r.id === user.role_id);

  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content details-modal large" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-id-card"></i> User Details: ${user.adminid}</h3>
          <button class="modal-close" onclick="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- User Info Card -->
          <div class="details-card">
            <div class="details-header">
              <div class="user-avatar-large">
                <i class="fas fa-user-circle"></i>
              </div>
              <div class="user-header-info">
                <h2>${user.full_name || user.adminid}</h2>
                <p class="user-email">${user.email || user.adminid}</p>
                <span class="status-badge status-${user.status || 'active'}">
                  ${formatStatus(user.status || 'active')}
                </span>
              </div>
            </div>

            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">User ID</div>
                <div class="detail-value">${user.adminid}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Role</div>
                <div class="detail-value">
                  <span class="role-badge role-${user.role_id}">
                    <i class="fas fa-user-tag"></i> ${user.role_name}
                  </span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Created Date</div>
                <div class="detail-value">${new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Last Login</div>
                <div class="detail-value">${formatLastLogin(user.last_login)}</div>
              </div>
            </div>
          </div>

          <!-- Role Permissions -->
          ${userRole && userRole.permissions && userRole.permissions.length > 0 ? `
            <div class="details-section">
              <h4><i class="fas fa-shield-alt"></i> Role Permissions (${userRole.permissions.length})</h4>
              <div class="permissions-grid">
                ${userRole.permissions.map(perm => `
                  <div class="permission-item">
                    <i class="fas fa-check-circle"></i>
                    <span>${perm}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="details-section">
              <h4><i class="fas fa-shield-alt"></i> Permissions</h4>
              <p class="no-data">No permissions assigned to this role yet.</p>
            </div>
          `}

          <!-- Quick Actions -->
          <div class="details-actions">
            <button class="btn-primary" onclick="closeModal(); openEditUserModal('${user.adminid}')">
              <i class="fas fa-edit"></i> Edit User
            </button>
            <button class="btn-secondary" onclick="closeModal(); resetUserPassword('${user.adminid}')">
              <i class="fas fa-key"></i> Reset Password
            </button>
            <button class="btn-secondary" onclick="closeModal(); viewUserActivity('${user.adminid}')">
              <i class="fas fa-history"></i> View Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

// ========================================================
// USER ACTIONS MODAL (More Menu)
// ========================================================
function openUserActions(userId) {
  console.log('⚙️ Opening actions menu for:', userId);
  const user = allUsers.find(u => u.adminid === userId);
  
  if (!user) {
    showToast('User not found', 'error');
    return;
  }

  const modal = document.getElementById('modalContainer');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content user-actions-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>Actions: ${user.adminid}</h3>
          <button class="modal-close" onclick="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="user-info-card">
            <div class="user-avatar-large">
              <i class="fas fa-user-circle"></i>
            </div>
            <h4>${user.full_name || user.adminid}</h4>
            <p class="user-email">${user.email || user.adminid}</p>
            <span class="status-badge status-${user.status || 'active'}">
              ${formatStatus(user.status || 'active')}
            </span>
          </div>

          <div class="action-list">
            ${user.status !== 'active' ? `
              <button class="action-item success" onclick="changeUserStatus('${userId}', 'active')">
                <i class="fas fa-check-circle"></i>
                <div>
                  <strong>Activate Account</strong>
                  <span>Enable user access</span>
                </div>
              </button>
            ` : `
              <button class="action-item warning" onclick="changeUserStatus('${userId}', 'inactive')">
                <i class="fas fa-pause-circle"></i>
                <div>
                  <strong>Deactivate Account</strong>
                  <span>Temporarily disable access</span>
                </div>
              </button>
            `}

            ${user.status !== 'suspended' ? `
              <button class="action-item danger" onclick="changeUserStatus('${userId}', 'suspended')">
                <i class="fas fa-ban"></i>
                <div>
                  <strong>Suspend Account</strong>
                  <span>Block user access</span>
                </div>
              </button>
            ` : `
              <button class="action-item success" onclick="changeUserStatus('${userId}', 'active')">
                <i class="fas fa-unlock"></i>
                <div>
                  <strong>Unsuspend Account</strong>
                  <span>Restore user access</span>
                </div>
              </button>
            `}

            <button class="action-item info" onclick="resetUserPassword('${userId}')">
              <i class="fas fa-key"></i>
              <div>
                <strong>Reset Password</strong>
                <span>Generate new temporary password</span>
              </div>
            </button>

            <button class="action-item secondary" onclick="viewUserActivity('${userId}')">
              <i class="fas fa-history"></i>
              <div>
                <strong>View Activity Logs</strong>
                <span>Check user login history</span>
              </div>
            </button>

            ${user.adminid !== currentAdminId ? `
              <button class="action-item danger" onclick="confirmDeleteUser('${userId}')">
                <i class="fas fa-trash-alt"></i>
                <div>
                  <strong>Delete Account</strong>
                  <span>Permanently remove user</span>
                </div>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

// ========================================================
// BULK CHANGE ROLE MODAL
// ========================================================
function openBulkChangeRoleModal() {
  const selectedUserIds = getSelectedUserIds();
  if (selectedUserIds.length === 0) return;

  const modal = document.getElementById('modalContainer');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-user-tag"></i> Change Role for ${selectedUserIds.length} User(s)</h3>
          <button class="modal-close" onclick="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="bulkChangeRoleForm" class="modal-body">
          <div class="form-group">
            <label for="bulkNewRole">Select New Role <span class="required">*</span></label>
            <select id="bulkNewRole" required>
              <option value="">-- Select Role --</option>
              ${roles.map(role => `
                <option value="${role.id}">${role.name}</option>
              `).join('')}
            </select>
          </div>

          <div class="info-box">
            <i class="fas fa-info-circle"></i>
            <p>This will change the role for all ${selectedUserIds.length} selected user(s).</p>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary">
              <i class="fas fa-check"></i> Apply Role Change
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  document.getElementById('bulkChangeRoleForm').addEventListener('submit', handleBulkChangeRole);
}

// ========================================================
// FORM HANDLERS
// ========================================================
async function handleCreateUser(e) {
  e.preventDefault();

  const username = document.getElementById('newUsername').value.trim();
  const fullName = document.getElementById('newFullName').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const roleId = document.getElementById('newRole').value;
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validation
  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  if (password.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminid: username,
        password: password,
        full_name: fullName,
        email: email || username,
        role_id: parseInt(roleId)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }

    await logActivity({
      type: 'user_creation',
      message: `Created new user account ${username}`,
      adminId: currentAdminId,
      details: { newUser: username, role: roleId }
    });

    showToast(`User "${username}" created successfully`, 'success');
    closeModal();
    await loadUsers();

  } catch (error) {
    console.error('Error creating user:', error);
    showToast(error.message, 'error');
  }
}

async function handleEditUser(e) {
  e.preventDefault();

  const userId = document.getElementById('editUserId').value;
  const fullName = document.getElementById('editFullName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const roleId = document.getElementById('editRole').value;
  const status = document.getElementById('editStatus').value;

  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        email: email,
        role_id: parseInt(roleId),
        status: status
      })
    });

    if (!response.ok) throw new Error('Failed to update user');

    await logActivity({
      type: 'user_update',
      message: `Updated user account ${userId}`,
      adminId: currentAdminId,
      details: { updatedUser: userId }
    });

    showToast(`User "${userId}" updated successfully`, 'success');
    closeModal();
    await loadUsers();

  } catch (error) {
    console.error('Error updating user:', error);
    showToast('Failed to update user', 'error');
  }
}

async function handleBulkChangeRole(e) {
  e.preventDefault();

  const newRoleId = document.getElementById('bulkNewRole').value;
  const selectedUserIds = getSelectedUserIds();

  try {
    const response = await fetch(`${API_BASE}/users/bulk/change-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_ids: selectedUserIds,
        role_id: parseInt(newRoleId)
      })
    });

    if (!response.ok) throw new Error('Failed to change roles');

    const role = roles.find(r => r.id === parseInt(newRoleId));
    
    await logActivity({
      type: 'bulk_role_change',
      message: `Changed role to "${role.name}" for ${selectedUserIds.length} user(s)`,
      adminId: currentAdminId,
      details: { count: selectedUserIds.length, roleId: newRoleId }
    });

    showToast(`Role changed for ${selectedUserIds.length} user(s)`, 'success');
    closeModal();
    await loadUsers();

    // Clear selections
    document.getElementById('selectAll').checked = false;
    updateBulkActionsBar();

  } catch (error) {
    console.error('Error changing roles:', error);
    showToast('Failed to change roles', 'error');
  }
}
// ========================================================
// APPEND THESE FUNCTIONS TO PART 2
// ========================================================

// ========================================================
// BULK ACTIONS HANDLER
// ========================================================
async function handleBulkAction(action) {
  const selectedUserIds = getSelectedUserIds();
  if (selectedUserIds.length === 0) {
    showToast('No users selected', 'warning');
    return;
  }

  let confirmed = false;
  let endpoint = '';
  let body = { user_ids: selectedUserIds };
  let successMessage = '';

  switch(action) {
    case 'activate':
      confirmed = confirm(`Activate ${selectedUserIds.length} user(s)?`);
      endpoint = `${API_BASE}/users/bulk/change-status`;
      body.status = 'active';
      successMessage = `${selectedUserIds.length} user(s) activated`;
      break;
    
    case 'deactivate':
      confirmed = confirm(`Deactivate ${selectedUserIds.length} user(s)?`);
      endpoint = `${API_BASE}/users/bulk/change-status`;
      body.status = 'inactive';
      successMessage = `${selectedUserIds.length} user(s) deactivated`;
      break;
    
    case 'delete':
      confirmed = confirm(`⚠️ WARNING: Delete ${selectedUserIds.length} user(s)? This cannot be undone!`);
      endpoint = `${API_BASE}/users/bulk/delete`;
      successMessage = `${selectedUserIds.length} user(s) deleted`;
      break;
    
    default:
      return;
  }

  if (!confirmed) return;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error('Bulk action failed');

    await logActivity({
      type: `bulk_${action}`,
      message: successMessage,
      adminId: currentAdminId,
      details: { userIds: selectedUserIds }
    });

    showToast(successMessage, 'success');
    await loadUsers();

    // Clear selections
    document.getElementById('selectAll').checked = false;
    updateBulkActionsBar();

  } catch (error) {
    console.error('Error performing bulk action:', error);
    showToast('Bulk action failed', 'error');
  }
}

// ========================================================
// CHANGE USER STATUS
// ========================================================
async function changeUserStatus(userId, newStatus) {
  console.log('🔄 Changing status for:', userId, 'to:', newStatus);
  
  const statusText = {
    'active': 'activated',
    'inactive': 'deactivated',
    'suspended': 'suspended'
  };

  const confirmed = confirm(
    `Are you sure you want to ${statusText[newStatus]} the account for ${userId}?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: newStatus,
        updated_by: currentAdminId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update status');
    }

    showToast(`User ${userId} has been ${statusText[newStatus]} successfully`, 'success');
    closeModal();
    
    await loadUsers();
    updateStats();
    filterAndDisplayUsers();

  } catch (error) {
    console.error('❌ Error changing user status:', error);
    showToast(error.message, 'error');
  }
}

// ========================================================
// RESET PASSWORD
// ========================================================
async function resetUserPassword(userId) {
  console.log('🔑 Resetting password for:', userId);
  
  const confirmed = confirm(
    `Are you sure you want to reset the password for ${userId}?\n\nA temporary password will be generated.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reset_by: currentAdminId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }

    showTempPasswordModal(userId, data.tempPassword);

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    showToast(error.message, 'error');
  }
}

// ========================================================
// VIEW USER ACTIVITY
// ========================================================
async function viewUserActivity(userId) {
  console.log('📜 Viewing activity for:', userId);
  
  try {
    const response = await fetch(`${API_BASE}/users/${userId}/activity-logs`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch activity logs');
    }

    const logs = data.logs || [];

    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="modal-overlay" onclick="closeModal()">
        <div class="modal-content activity-modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3><i class="fas fa-history"></i> Activity History: ${userId}</h3>
            <button class="modal-close" onclick="closeModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="activity-list">
              ${logs.length === 0 ? `
                <div class="empty-state">
                  <i class="fas fa-inbox"></i>
                  <p>No activity logs found</p>
                </div>
              ` : logs.map(log => `
                <div class="activity-item">
                  <div class="activity-icon ${log.type}">
                    <i class="fas ${getActivityIcon(log.type)}"></i>
                  </div>
                  <div class="activity-content">
                    <strong>${log.message}</strong>
                    <span class="activity-time">${formatActivityTime(log.timestamp)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'block';

  } catch (error) {
    console.error('❌ Error loading activity logs:', error);
    showToast(error.message, 'error');
  }
}

// ========================================================
// DELETE USER
// ========================================================
function confirmDeleteUser(userId) {
  console.log('🗑️ Confirming delete for:', userId);
  
  const modal = document.getElementById('modalContainer');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content confirm-modal" onclick="event.stopPropagation()">
        <div class="modal-header danger">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Confirm Deletion</h3>
        </div>
        
        <div class="modal-body">
          <p>Are you absolutely sure you want to delete the account <strong>${userId}</strong>?</p>
          <p class="warning-text">
            <i class="fas fa-info-circle"></i>
            This action cannot be undone. All data associated with this user will be permanently deleted.
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn-danger" onclick="deleteUser('${userId}')">
            <i class="fas fa-trash-alt"></i> Delete Account
          </button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'block';
}

async function deleteUser(userId) {
  console.log('🗑️ Deleting user:', userId);
  
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deleted_by: currentAdminId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }

    showToast(`User ${userId} has been deleted successfully`, 'success');
    closeModal();
    
    await loadUsers();
    updateStats();
    filterAndDisplayUsers();

  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Failed to delete user', 'error');
  }
}

// ========================================================
// HELPER MODALS
// ========================================================
function showTempPasswordModal(userId, tempPassword) {
  const modal = document.getElementById('modalContainer');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content temp-password-modal" onclick="event.stopPropagation()">
        <div class="modal-header success">
          <i class="fas fa-check-circle"></i>
          <h3>Password Reset Successful</h3>
        </div>
        
        <div class="modal-body">
          <p>A temporary password has been generated for <strong>${userId}</strong>:</p>
          
          <div class="temp-password-display">
            <code id="tempPasswordCode">${tempPassword}</code>
            <button class="btn-copy" onclick="copyTempPassword()">
              <i class="fas fa-copy"></i> Copy
            </button>
          </div>

          <p class="info-text">
            <i class="fas fa-info-circle"></i>
            Please share this password securely with the user. They should change it upon first login.
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" onclick="closeModal()">Done</button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'block';
}

function copyTempPassword() {
  const code = document.getElementById('tempPasswordCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Password copied to clipboard', 'success');
  }).catch(err => {
    console.error('Failed to copy password:', err);
    showToast('Failed to copy password', 'error');
  });
}

// ========================================================
// PASSWORD UTILITIES
// ========================================================
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const button = input.nextElementSibling;
  const icon = button.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  document.getElementById('newPassword').value = password;
  document.getElementById('confirmPassword').value = password;
  showToast('Random password generated', 'success');
}

// ========================================================
// HELPER FUNCTIONS
// ========================================================
function getActivityIcon(type) {
  const icons = {
    'login': 'fa-sign-in-alt',
    'logout': 'fa-sign-out-alt',
    'user_status_change': 'fa-user-edit',
    'status_changed': 'fa-user-edit',
    'password_reset': 'fa-key',
    'user_deletion': 'fa-trash-alt',
    'user_deleted': 'fa-trash-alt',
    'user_creation': 'fa-user-plus',
    'user_created': 'fa-user-plus',
    'user_update': 'fa-edit',
    'user_updated': 'fa-edit',
    'file_upload': 'fa-upload',
    'file_delete': 'fa-trash',
    'data_upload': 'fa-database',
    'form_upload': 'fa-file-alt'
  };
  return icons[type] || 'fa-circle';
}

function formatActivityTime(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function closeModal() {
  const modal = document.getElementById('modalContainer');
  if (modal) {
    modal.innerHTML = '';
    modal.style.display = 'none';
  }
  currentEditingUserId = null;
}

// ========================================================
// ACTIVITY LOGGING
// ========================================================
async function logActivity(activityData) {
  try {
    await fetch(`${API_BASE}/activity-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData)
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// ========================================================
// TOAST NOTIFICATIONS
// ========================================================
function showToast(message, type = 'info') {
  console.log(`📢 Toast: ${type} - ${message}`);
  
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconClass = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' :
                    'fa-info-circle';
  
  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, 3000);
}

// ========================================================
// MAKE FUNCTIONS GLOBALLY ACCESSIBLE
// ========================================================
window.openUserActions = openUserActions;
window.openUserDetailsModal = openUserDetailsModal;
window.openEditUserModal = openEditUserModal;
window.changeUserStatus = changeUserStatus;
window.resetUserPassword = resetUserPassword;
window.viewUserActivity = viewUserActivity;
window.confirmDeleteUser = confirmDeleteUser;
window.deleteUser = deleteUser;
window.copyTempPassword = copyTempPassword;
window.togglePasswordVisibility = togglePasswordVisibility;
window.generateRandomPassword = generateRandomPassword;
window.closeModal = closeModal;

console.log('✅ User Management System Loaded Successfully');
console.log('👤 Current Admin:', currentAdminId);
console.log('📊 Roles Loaded:', roles.length);