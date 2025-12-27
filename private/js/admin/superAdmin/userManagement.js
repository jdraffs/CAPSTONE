// userManagement.js - COMPLETE FILE - PART 1 OF 2
// ========================================================
// CONFIGURATION & GLOBAL VARIABLES
// ========================================================

const API_BASE = 'http://localhost:3000/api';
let currentAdminId = localStorage.getItem('adminid');
let allUsers = [];
let filteredUsers = [];
let currentFilter = 'all';
let currentSearchTerm = '';

// ========================================================
// INITIALIZE ON PAGE LOAD
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  if (!currentAdminId) {
    alert('You must be logged in to access this page.');
    window.location.href = '/private/html/AdminLogin/login.html';
    return;
  }
  
  initializeUserManagement();
});

async function initializeUserManagement() {
  injectHTML();
  attachEventListeners();
  await loadUsers();
}

// ========================================================
// HTML INJECTION
// ========================================================
function injectHTML() {
  const mainContent = document.getElementById('mainContent');
  
  mainContent.innerHTML = `
    <div class="user-management-container">
      <!-- Header Section -->
      <div class="um-header">
        <div class="um-header-left">
          <h2>User Management</h2>
          <p class="um-subtitle">Manage admin accounts and permissions</p>
        </div>
        <div class="um-header-right">
          <button class="btn-primary" id="btnRefresh">
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
          <div class="stat-icon red">
            <i class="fas fa-user-slash"></i>
          </div>
          <div class="stat-content">
            <h3 id="statSuspendedUsers">0</h3>
            <p>Suspended Users</p>
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
            Active
          </button>
          <button class="filter-btn" data-filter="inactive">
            Inactive
          </button>
          <button class="filter-btn" data-filter="suspended">
            Suspended
          </button>
        </div>
        
        <div class="um-search">
          <i class="fas fa-search"></i>
          <input 
            type="text" 
            id="searchUsers" 
            placeholder="Search by ID, name, or email..."
          />
        </div>
      </div>

      <!-- Users Table -->
      <div class="um-table-container">
        <table class="um-table">
          <thead>
            <tr>
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
              <td colspan="7" class="loading-cell">
                <i class="fas fa-spinner fa-spin"></i> Loading users...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Action Modals -->
    <div id="modalContainer"></div>
  `;
}

// ========================================================
// EVENT LISTENERS
// ========================================================
function attachEventListeners() {
  // Refresh button
  document.getElementById('btnRefresh').addEventListener('click', () => {
    loadUsers();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      filterAndDisplayUsers();
    });
  });

  // Search input
  document.getElementById('searchUsers').addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.toLowerCase();
    filterAndDisplayUsers();
  });
}

// ========================================================
// DATA LOADING
// ========================================================
async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();
    allUsers = data.users || [];
    
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
  const total = allUsers.length;
  const active = allUsers.filter(u => u.status === 'active').length;
  const inactive = allUsers.filter(u => u.status === 'inactive').length;
  const suspended = allUsers.filter(u => u.status === 'suspended').length;

  document.getElementById('statTotalUsers').textContent = total;
  document.getElementById('statActiveUsers').textContent = active;
  document.getElementById('statInactiveUsers').textContent = inactive;
  document.getElementById('statSuspendedUsers').textContent = suspended;
}

// ========================================================
// FILTER & DISPLAY
// ========================================================
function filterAndDisplayUsers() {
  // Apply status filter
  filteredUsers = allUsers.filter(user => {
    if (currentFilter === 'all') return true;
    return user.status === currentFilter;
  });

  // Apply search filter
  if (currentSearchTerm) {
    filteredUsers = filteredUsers.filter(user => {
      const searchableText = `
        ${user.adminid} 
        ${user.full_name || ''} 
        ${user.email || user.adminid}
      `.toLowerCase();
      
      return searchableText.includes(currentSearchTerm);
    });
  }

  displayUsers();
}

// ========================================================
// DISPLAY USERS TABLE
// ========================================================
function displayUsers() {
  const tbody = document.getElementById('usersTableBody');
  
  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">
          <i class="fas fa-inbox"></i>
          <p>No users found</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredUsers.map(user => `
    <tr data-user-id="${user.adminid}">
      <td class="user-id">${user.adminid}</td>
      <td class="user-name">
        <div class="user-avatar">
          <i class="fas fa-user-circle"></i>
        </div>
        <span>${user.full_name || 'N/A'}</span>
      </td>
      <td>${user.email || user.adminid}</td>
      <td>
        <span class="role-badge">${user.role || 'Admin'}</span>
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
            class="btn-action btn-edit" 
            onclick="openUserActions('${user.adminid}')"
            title="Actions"
          >
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ========================================================
// UTILITY FUNCTIONS - FORMAT STATUS
// ========================================================
function formatStatus(status) {
  const statusMap = {
    'active': 'Active',
    'inactive': 'Inactive',
    'suspended': 'Suspended'
  };
  return statusMap[status] || status;
}

// ========================================================
// UTILITY FUNCTIONS - FORMAT LAST LOGIN
// ========================================================
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

// ========================================================
// UTILITY FUNCTIONS - SHOW ERROR
// ========================================================
function showError(message) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="error-cell">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </td>
    </tr>
  `;
}

// ========================================================
// USER ACTIONS MODAL
// ========================================================
function openUserActions(userId) {
  const user = allUsers.find(u => u.adminid === userId);
  if (!user) return;

  const modal = document.getElementById('modalContainer');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content user-actions-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>User Actions: ${user.adminid}</h3>
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

// userManagement.js - COMPLETE FILE - PART 2 OF 2
// ========================================================
// COPY THIS AND APPEND IT DIRECTLY AFTER PART 1
// ========================================================

// ========================================================
// CHANGE USER STATUS
// ========================================================
async function changeUserStatus(userId, newStatus) {
  const user = allUsers.find(u => u.adminid === userId);
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
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) throw new Error('Failed to update status');

    // Log activity
    await logActivity({
      type: 'user_status_change',
      message: `Changed status of ${userId} to ${newStatus}`,
      adminId: currentAdminId,
      details: {
        targetUser: userId,
        oldStatus: user.status,
        newStatus: newStatus
      }
    });

    showToast(`User ${userId} has been ${statusText[newStatus]} successfully`, 'success');
    closeModal();
    await loadUsers();

  } catch (error) {
    console.error('Error changing user status:', error);
    showToast('Failed to update user status', 'error');
  }
}

// ========================================================
// RESET PASSWORD
// ========================================================
async function resetUserPassword(userId) {
  const confirmed = confirm(
    `Are you sure you want to reset the password for ${userId}?\n\nA temporary password will be generated.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Failed to reset password');

    const data = await response.json();

    // Log activity
    await logActivity({
      type: 'password_reset',
      message: `Reset password for user ${userId}`,
      adminId: currentAdminId,
      details: {
        targetUser: userId,
        resetBy: currentAdminId
      }
    });

    // Show temporary password modal
    showTempPasswordModal(userId, data.tempPassword);

  } catch (error) {
    console.error('Error resetting password:', error);
    showToast('Failed to reset password', 'error');
  }
}

// ========================================================
// VIEW USER ACTIVITY
// ========================================================
async function viewUserActivity(userId) {
  try {
    const response = await fetch(`${API_BASE}/activity-logs/admin/${userId}`);
    
    if (!response.ok) throw new Error('Failed to fetch activity logs');

    const logs = await response.json();

    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="modal-overlay" onclick="closeModal()">
        <div class="modal-content activity-modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Activity History: ${userId}</h3>
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

  } catch (error) {
    console.error('Error loading activity logs:', error);
    showToast('Failed to load activity logs', 'error');
  }
}

// ========================================================
// DELETE USER - CONFIRMATION MODAL
// ========================================================
function confirmDeleteUser(userId) {
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
            Delete Account
          </button>
        </div>
      </div>
    </div>
  `;
}

// ========================================================
// DELETE USER - EXECUTION
// ========================================================
async function deleteUser(userId) {
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete user');

    // Log activity
    await logActivity({
      type: 'user_deletion',
      message: `Deleted user account ${userId}`,
      adminId: currentAdminId,
      details: {
        deletedUser: userId,
        deletedBy: currentAdminId
      }
    });

    showToast(`User ${userId} has been deleted successfully`, 'success');
    closeModal();
    await loadUsers();

  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Failed to delete user', 'error');
  }
}

// ========================================================
// SHOW TEMPORARY PASSWORD MODAL
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
}

// ========================================================
// COPY TEMPORARY PASSWORD TO CLIPBOARD
// ========================================================
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
// GET ACTIVITY ICON
// ========================================================
function getActivityIcon(type) {
  const icons = {
    'login': 'fa-sign-in-alt',
    'logout': 'fa-sign-out-alt',
    'user_status_change': 'fa-user-edit',
    'password_reset': 'fa-key',
    'user_deletion': 'fa-trash-alt',
    'file_upload': 'fa-upload',
    'file_delete': 'fa-trash',
    'data_upload': 'fa-database',
    'form_upload': 'fa-file-alt'
  };
  return icons[type] || 'fa-circle';
}

// ========================================================
// FORMAT ACTIVITY TIME
// ========================================================
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

// ========================================================
// CLOSE MODAL
// ========================================================
function closeModal() {
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = '';
  modal.style.display = 'none';
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
    // Don't show error to user - logging should be silent
  }
}

// ========================================================
// TOAST NOTIFICATIONS
// ========================================================
function showToast(message, type = 'info') {
  // Remove any existing toasts
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
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

// ========================================================
// MAKE FUNCTIONS GLOBALLY ACCESSIBLE
// ========================================================
window.openUserActions = openUserActions;
window.changeUserStatus = changeUserStatus;
window.resetUserPassword = resetUserPassword;
window.viewUserActivity = viewUserActivity;
window.confirmDeleteUser = confirmDeleteUser;
window.deleteUser = deleteUser;
window.copyTempPassword = copyTempPassword;
window.closeModal = closeModal;


console.log('✅ User Management System Loaded Successfully');
console.log('👤 Current Admin:', currentAdminId);