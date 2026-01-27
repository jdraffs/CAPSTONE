// secondaryUserManagementLimited.js - PART 1: Secondary SuperAdmin User Management (LIMITED)
const API_BASE = 'http://localhost:3000/api';
let currentAdminId = localStorage.getItem('adminid');
let allAdmins = [];
let filteredAdmins = [];
let roles = [];
let currentSearchTerm = '';
let currentStatusFilter = 'all';

// Restricted admin IDs that System Admin cannot edit
const PROTECTED_ADMINS = ['adminSalao'];
const PROTECTED_ROLE_IDS = [1]; // Super Administrator role ID
const MAX_HIERARCHY_LEVEL = 90; // System Admin hierarchy level

document.addEventListener('DOMContentLoaded', async () => {
  initializeProfileDropdown();

  if (!currentAdminId) {
    alert('You must be logged in.');
    window.location.href = '/private/html/AdminLogin/login.html';
    return;
  }

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
      // Update UI with admin name
      const nameElements = document.querySelectorAll('#adminName, #currentAdminName');
      nameElements.forEach(el => {
        if (el) el.textContent = currentAdminId;
      });  
      // Update role subtitle
      const roleElements = document.querySelectorAll('.user-role');
      roleElements.forEach(el => {
        if (el) el.textContent = 'System Administrator';
      });
    }
  }

// Call this function early in your initialization
await setCurrentAdminName();
  
  // Check if user has System Admin role
  const isAssistantAdmin = await checkAssistantAdminRole();
  if (!isAssistantAdmin) {
    alert('Access Denied: Secondary System Administrator only.');
    window.location.href = '/private/html/adminPages/secondarySuperAdmin/secondaryDashboard.html';
    return;
  }
  
  await initialize();
});

async function checkAssistantAdminRole() {
  try {
    const res = await fetch(`${API_BASE}/admin-accounts`);
    if (!res.ok) return false;
    
    const data = await res.json();
    const currentUser = data.admins.find(a => a.adminid === currentAdminId);
    
    return currentUser && currentUser.role_name === 'Assistant Super Administrator';
  } catch (error) {
    console.error('❌ Role check error:', error);
    return false;
  }
}

async function initialize() {
  
  try {
    await loadRoles();
    await loadAdmins();
    
    renderUI();
    attachEvents();
    updateStats();
    displayAdmins();
    
    console.log('✅ Limited User Management loaded');
  } catch (error) {
    console.error('❌ Init error:', error);
    showError('Failed to initialize');
  }
}

async function loadRoles() {
  try {
    const res = await fetch(`${API_BASE}/roles`);
    if (!res.ok) throw new Error('Failed to load roles');
    roles = await res.json();
    
    // Filter out protected roles (Super Administrator)
    roles = roles.filter(r => !PROTECTED_ROLE_IDS.includes(r.id));
    
    console.log('✅ Roles loaded (filtered):', roles.length);
  } catch (error) {
    console.error('❌ Roles error:', error);
    // Fallback roles excluding Super Administrator
    roles = [
      { id: 7, name: 'Assistant Super Administrator', hierarchy_level: 90 },
      { id: 3, name: 'Data Manager', hierarchy_level: 50 },
      { id: 4, name: 'Content Manager', hierarchy_level: 50 },
      { id: 5, name: 'Student Services Manager', hierarchy_level: 50 },
      { id: 6, name: 'Accreditation Manager', hierarchy_level: 50 }
    ];
  }
}

async function loadAdmins() {
  try {
    const res = await fetch(`${API_BASE}/admin-accounts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    
    if (data.success && data.admins) {
      allAdmins = data.admins;
    } else {
      throw new Error('Invalid response');
    }
    
    console.log('✅ Loaded admins:', allAdmins.length);
    filteredAdmins = [...allAdmins];
    
  } catch (error) {
    console.error('❌ Load error:', error);
    allAdmins = [];
    filteredAdmins = [];
    throw error;
  }
}

function renderUI() {
  const main = document.getElementById('mainContent');
  
  // Remove existing access banner if present
  const existingBanner = main.querySelector('.access-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  main.innerHTML += `
    <div class="user-management-container">
      <div class="um-header">
        <div class="um-header-right">
          <button class="btn-secondary" id="btnRoles">
            <i class="fas fa-user-tag"></i> Roles
          </button>
          <button class="btn-primary" id="btnCreate">
            <i class="fas fa-user-plus"></i> Create Admin
          </button>
          <button class="btn-primary" id="btnRefresh">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Limitation Notice -->
      <div class="limitation-notice">
        <div class="notice-header">
          <i class="fas fa-shield-alt"></i>
          <h4>Your Access Limitations</h4>
        </div>
        <div class="limitation-grid">
          <div class="limitation-item allowed">
            <i class="fas fa-check"></i>
            <span>Create admin-level users</span>
          </div>
          <div class="limitation-item allowed">
            <i class="fas fa-check"></i>
            <span>Assign non-superadmin roles</span>
          </div>
          <div class="limitation-item allowed">
            <i class="fas fa-check"></i>
            <span>Reactivate disabled accounts</span>
          </div>
          <div class="limitation-item restricted">
            <i class="fas fa-times"></i>
            <span>Cannot edit Campus Director</span>
          </div>
          <div class="limitation-item restricted">
            <i class="fas fa-times"></i>
            <span>Cannot create superadmins</span>
          </div>
          <div class="limitation-item restricted">
            <i class="fas fa-times"></i>
            <span>Cannot modify superadmin permissions</span>
          </div>
        </div>
      </div>

      <div class="um-stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-content">
            <h3 id="statTotal">0</h3>
            <p>Total Admins</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <i class="fas fa-user-check"></i>
          </div>
          <div class="stat-content">
            <h3 id="statActive">0</h3>
            <p>Active</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <i class="fas fa-user-lock"></i>
          </div>
          <div class="stat-content">
            <h3 id="statSuspended">0</h3>
            <p>Suspended</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <i class="fas fa-user-shield"></i>
          </div>
          <div class="stat-content">
            <h3 id="statManageable">0</h3>
            <p>Manageable Users</p>
          </div>
        </div>
      </div>

      <div class="um-controls">
        <div class="um-search">
          <i class="fas fa-search"></i>
          <input type="text" id="searchInput" placeholder="Search...">
        </div>
        <div class="um-filters">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="active">Active</button>
          <button class="filter-btn" data-filter="suspended">Suspended</button>
        </div>
      </div>

      <div class="um-table-container">
        <table class="um-table">
          <thead>
            <tr>
              <th><input type="checkbox" id="selectAll"></th>
              <th>Admin ID</th>
              <th>Role</th>
              <th>Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tableBody"></tbody>
        </table>
      </div>

      <div class="bulk-actions-bar" id="bulkBar" style="display:none">
        <span class="selected-count" id="selectedCount">0 selected</span>
        <button class="bulk-btn danger" id="btnBulkDelete">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>

    <div id="modalRoot"></div>
  `;
}

function attachEvents() {
  document.getElementById('btnRefresh').onclick = async () => {
    await loadAdmins();
    updateStats();
    displayAdmins();
    toast('Refreshed', 'success');
  };
  
  document.getElementById('btnCreate').onclick = openCreateModal;
  document.getElementById('btnRoles').onclick = () => {
    window.location.href = '/private/html/adminPages/secondarySuperAdmin/roleManagementLimited.html';
  };
  
  document.getElementById('searchInput').oninput = (e) => {
    currentSearchTerm = e.target.value.toLowerCase();
    filterAdmins();
  };
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.dataset.filter;
      filterAdmins();
    };
  });
  
  document.getElementById('selectAll').onchange = handleSelectAll;
  document.getElementById('btnBulkDelete').onclick = bulkDelete;
}

function updateStats() {
  const total = allAdmins.length;
  const active = allAdmins.filter(a => a.status === 'active').length;
  const suspended = allAdmins.filter(a => a.status === 'suspended').length;
  
  // Count manageable users (exclude protected admins)
  const manageable = allAdmins.filter(a => !PROTECTED_ADMINS.includes(a.adminid)).length;
  
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statSuspended').textContent = suspended;
  document.getElementById('statManageable').textContent = manageable;
}

function filterAdmins() {
  filteredAdmins = allAdmins;

  if (currentStatusFilter !== 'all') {
    filteredAdmins = filteredAdmins.filter(a => a.status === currentStatusFilter);
  }

  if (currentSearchTerm) {
    filteredAdmins = filteredAdmins.filter(a => 
      a.adminid.toLowerCase().includes(currentSearchTerm) ||
      (a.role_name && a.role_name.toLowerCase().includes(currentSearchTerm))
    );
  }

  displayAdmins();
}

function displayAdmins() {
  const tbody = document.getElementById('tableBody');
  
  if (filteredAdmins.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="empty-cell">
        <i class="fas fa-inbox"></i><p>No admins found</p>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = filteredAdmins.map(a => {
    const isProtected = PROTECTED_ADMINS.includes(a.adminid);
    const protectedBadge = isProtected ? '<span class="protected-badge"><i class="fas fa-shield-alt"></i> Protected</span>' : '';
    
    return `
    <tr ${isProtected ? 'class="protected-row"' : ''}>
      <td>
        <input type="checkbox" class="cb" data-id="${a.id}" 
          ${isProtected ? 'disabled' : ''}>
      </td>
      <td class="user-id">
        <div class="user-avatar"><i class="fas fa-user-shield"></i></div>
        <div>
          <strong>${a.adminid}</strong>
          ${protectedBadge}
        </div>
      </td>
      <td>
        <span class="role-badge role-${a.role_id || 'default'}">
          <i class="fas fa-user-tag"></i> ${a.role_name}
        </span>
      </td>
      <td>${formatDate(a.created_at)}</td>
      <td>
        <span class="status-badge status-${a.status || 'active'}">
          ${(a.status || 'active').charAt(0).toUpperCase() + (a.status || 'active').slice(1)}
        </span>
      </td>
      <td class="actions-cell">
        <button class="btn-action btn-view" onclick="viewAdmin(${a.id})" title="View">
          <i class="fas fa-eye"></i>
        </button>
        ${!isProtected ? `
          <button class="btn-action btn-edit" onclick="editAdmin(${a.id})" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action btn-edit" onclick="resetPass(${a.id})" title="Reset">
            <i class="fas fa-key"></i>
          </button>
          <button class="btn-action btn-delete" onclick="deleteAdmin(${a.id})" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        ` : `
          <span class="no-action-badge">
            <i class="fas fa-lock"></i> No Actions
          </span>
        `}
      </td>
    </tr>
  `}).join('');

  document.querySelectorAll('.cb').forEach(cb => {
    cb.onchange = updateBulkBar;
  });
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });
}

function handleSelectAll(e) {
  document.querySelectorAll('.cb:not([disabled])').forEach(cb => {
    cb.checked = e.target.checked;
  });
  updateBulkBar();
}

function updateBulkBar() {
  const checked = document.querySelectorAll('.cb:checked');
  const bar = document.getElementById('bulkBar');
  const count = document.getElementById('selectedCount');
  
  if (checked.length > 0) {
    bar.style.display = 'flex';
    count.textContent = `${checked.length} selected`;
  } else {
    bar.style.display = 'none';
  }
}

function getSelectedIds() {
  return Array.from(document.querySelectorAll('.cb:checked'))
    .map(cb => parseInt(cb.dataset.id));
}

window.viewAdmin = viewAdmin;
window.editAdmin = editAdmin;
window.resetPass = resetPass;
window.deleteAdmin = deleteAdmin;

// userManagementLimited.js - PART 2: Modal Functions and CRUD Operations

// ============================================
// CREATE MODAL (with role restrictions)
// ============================================
function openCreateModal() {
  const modal = document.getElementById('modalRoot');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-user-plus"></i> Create Admin</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        
        <div class="access-restriction-notice">
          <i class="fas fa-info-circle"></i>
          <p>You can only assign non-superadmin roles. Super Administrator role is restricted.</p>
        </div>
        
        <form id="formCreate" class="modal-body">
          <div class="form-group">
            <label>Admin ID *</label>
            <input type="text" id="inpAdminId" required>
          </div>
          <div class="form-group">
            <label>Role *</label>
            <select id="inpRole" required>
              <option value="">Select...</option>
              ${roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
            </select>
            <small class="form-help">Super Administrator role not available</small>
          </div>
          <div class="form-group">
            <label>Password *</label>
            <div class="password-input-group">
              <input type="password" id="inpPass" required>
              <button type="button" class="toggle-password" onclick="togglePass('inpPass')">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Confirm *</label>
            <div class="password-input-group">
              <input type="password" id="inpConfirm" required>
              <button type="button" class="toggle-password" onclick="togglePass('inpConfirm')">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          <button type="button" class="btn-link" onclick="genPass()">
            <i class="fas fa-random"></i> Generate
          </button>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  document.getElementById('formCreate').onsubmit = handleCreate;
}

async function handleCreate(e) {
  e.preventDefault();
  
  const adminid = document.getElementById('inpAdminId').value.trim();
  const role_id = parseInt(document.getElementById('inpRole').value);
  const password = document.getElementById('inpPass').value;
  const confirm = document.getElementById('inpConfirm').value;
  
  if (password !== confirm) {
    toast('Passwords do not match', 'error');
    return;
  }
  
  if (password.length < 8) {
    toast('Password must be 8+ characters', 'error');
    return;
  }
  
  // Check if trying to create a protected role
  if (PROTECTED_ROLE_IDS.includes(role_id)) {
    toast('Cannot create superadmin accounts - Access Denied', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/admin-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminid, password, role_id })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
    // Log the action
    await logAction('User Created', adminid, `Created admin account with role ID ${role_id}`);
    
    toast(`Created ${adminid}`, 'success');
    closeModal();
    await loadAdmins();
    updateStats();
    displayAdmins();
    
  } catch (error) {
    console.error('❌ Create error:', error);
    toast(error.message, 'error');
  }
}

// ============================================
// EDIT ADMIN (with protection checks)
// ============================================
function editAdmin(id) {
  const admin = allAdmins.find(a => a.id === id);
  if (!admin) return;
  
  // Check if admin is protected
  if (PROTECTED_ADMINS.includes(admin.adminid)) {
    toast('Cannot edit Campus Director - Access Denied', 'error');
    return;
  }
  
  const modal = document.getElementById('modalRoot');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-edit"></i> Edit Admin: ${admin.adminid}</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        
        <div class="access-restriction-notice">
          <i class="fas fa-info-circle"></i>
          <p>You can only assign non-superadmin roles. Current role restrictions apply.</p>
        </div>
        
        <form id="formEdit" class="modal-body">
          <div class="form-group">
            <label>Admin ID</label>
            <input type="text" value="${admin.adminid}" disabled>
          </div>
          <div class="form-group">
            <label>Role *</label>
            <select id="editRole" required>
              ${roles.map(r => `
                <option value="${r.id}" ${r.id === admin.role_id ? 'selected' : ''}>
                  ${r.name}
                </option>
              `).join('')}
            </select>
            <small class="form-help">Cannot assign Super Administrator role</small>
          </div>
          <div class="form-group">
            <label>Status *</label>
            <select id="editStatus" required>
              <option value="active" ${admin.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="suspended" ${admin.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  document.getElementById('formEdit').onsubmit = (e) => handleEdit(e, id, admin.adminid);
}

async function handleEdit(e, id, adminid) {
  e.preventDefault();
  
  const role_id = parseInt(document.getElementById('editRole').value);
  const status = document.getElementById('editStatus').value;
  
  // Check if trying to assign a protected role
  if (PROTECTED_ROLE_IDS.includes(role_id)) {
    toast('Cannot assign Super Administrator role - Access Denied', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id, status })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
    // Log the action
    await logAction('User Updated', adminid, `Updated role to ${role_id} and status to ${status}`);
    
    toast('Updated successfully', 'success');
    closeModal();
    await loadAdmins();
    updateStats();
    displayAdmins();
    
  } catch (error) {
    console.error('❌ Edit error:', error);
    toast(error.message, 'error');
  }
}

// ============================================
// VIEW ADMIN
// ============================================
function viewAdmin(id) {
  const admin = allAdmins.find(a => a.id === id);
  if (!admin) return;
  
  const isProtected = PROTECTED_ADMINS.includes(admin.adminid);
  
  const modal = document.getElementById('modalRoot');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content details-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-id-card"></i> Admin Details</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="details-card">
            <div class="details-header">
              <div class="user-avatar-large">
                <i class="fas fa-user-shield"></i>
              </div>
              <div class="user-header-info">
                <h2>${admin.adminid}</h2>
                <p>${admin.role_name}</p>
                <span class="status-badge status-${admin.status || 'active'}">
                  ${(admin.status || 'active').charAt(0).toUpperCase() + (admin.status || 'active').slice(1)}
                </span>
                ${isProtected ? '<span class="protected-badge large"><i class="fas fa-shield-alt"></i> Protected Account</span>' : ''}
              </div>
            </div>
            
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Admin ID</div>
                <div class="detail-value">${admin.adminid}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Role</div>
                <div class="detail-value">
                  <span class="role-badge role-${admin.role_id}">
                    ${admin.role_name}
                  </span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Created</div>
                <div class="detail-value">${formatDate(admin.created_at)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                  <span class="status-badge status-${admin.status || 'active'}">
                    ${(admin.status || 'active').charAt(0).toUpperCase() + (admin.status || 'active').slice(1)}
                  </span>
                </div>
              </div>
            </div>
            
            ${isProtected ? `
              <div class="protection-notice">
                <i class="fas fa-shield-alt"></i>
                <div>
                  <strong>Protected Account</strong>
                  <p>This is the Campus Director account. You cannot edit, reset password, or delete this account.</p>
                </div>
              </div>
            ` : ''}
          </div>
          
          ${!isProtected ? `
            <div class="details-actions">
              <button class="btn-secondary" onclick="closeModal(); editAdmin(${id})">
                <i class="fas fa-edit"></i> Edit Role/Status
              </button>
              <button class="btn-secondary" onclick="closeModal(); resetPass(${id})">
                <i class="fas fa-key"></i> Reset Password
              </button>
              <button class="btn-danger" onclick="closeModal(); deleteAdmin(${id})">
                <i class="fas fa-trash"></i> Delete Admin
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

// ============================================
// RESET PASSWORD (with protection check)
// ============================================
function resetPass(id) {
  const admin = allAdmins.find(a => a.id === id);
  if (!admin) return;
  
  if (PROTECTED_ADMINS.includes(admin.adminid)) {
    toast('Cannot reset Campus Director password - Access Denied', 'error');
    return;
  }
  
  const modal = document.getElementById('modalRoot');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-key"></i> Reset Password</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <p>Reset password for <strong>${admin.adminid}</strong>?</p>
          <p style="color:#6b7280;font-size:14px">A temp password will be generated.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn-primary" onclick="execReset(${id}, '${admin.adminid}')">Reset</button>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

async function execReset(id, adminid) {
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/${id}/reset-password`, {
      method: 'POST'
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
    // Log the action
    await logAction('Password Reset', adminid, 'Generated temporary password');
    
    showTempPass(data.adminid, data.tempPassword);
    
  } catch (error) {
    console.error('❌ Reset error:', error);
    toast('Reset failed', 'error');
  }
}

function showTempPass(adminid, tempPass) {
  const modal = document.getElementById('modalRoot');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header success">
          <i class="fas fa-check-circle"></i>
          <h3>Password Reset</h3>
        </div>
        <div class="modal-body">
          <p>Temp password for <strong>${adminid}</strong>:</p>
          <div class="temp-password-display">
            <code id="tempCode">${tempPass}</code>
            <button class="btn-copy" onclick="copyPass()">
              <i class="fas fa-copy"></i> Copy
            </button>
          </div>
          <p class="info-text">
            <i class="fas fa-info-circle"></i>
            Share securely. Change on first login.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" onclick="closeModal()">Done</button>
        </div>
      </div>
    </div>
  `;
}

function copyPass() {
  const code = document.getElementById('tempCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    toast('Copied', 'success');
  });
}

window.execReset = execReset;
window.copyPass = copyPass;

// userManagementLimited.js - PART 3: Delete, Logging, and Utility Functions

// ============================================
// DELETE (with protection check)
// ============================================
function deleteAdmin(id) {
  const admin = allAdmins.find(a => a.id === id);
  if (!admin) return;
  
  if (PROTECTED_ADMINS.includes(admin.adminid)) {
    toast('Cannot delete Campus Director - Access Denied', 'error');
    return;
  }
  
  if (!confirm(`Delete "${admin.adminid}"? This action cannot be undone.`)) return;
  
  execDelete(id, admin.adminid);
}

async function execDelete(id, adminid) {
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/${id}`, {
      method: 'DELETE'
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
    // Log the action
    await logAction('User Deleted', adminid, `Deleted admin account`);
    
    toast('Deleted', 'success');
    await loadAdmins();
    updateStats();
    displayAdmins();
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    toast('Delete failed', 'error');
  }
}

async function bulkDelete() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    toast('No selection', 'warning');
    return;
  }
  
  // Check if any selected IDs are protected
  const selectedAdmins = allAdmins.filter(a => ids.includes(a.id));
  const protectedInSelection = selectedAdmins.filter(a => PROTECTED_ADMINS.includes(a.adminid));
  
  if (protectedInSelection.length > 0) {
    toast('Cannot delete protected accounts (Campus Director)', 'error');
    return;
  }
  
  if (!confirm(`Delete ${ids.length} admin(s)? This cannot be undone.`)) return;
  
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
    // Log the action
    await logAction('Bulk Delete', '', `Deleted ${data.count} admin accounts`);
    
    toast(`Deleted ${data.count}`, 'success');
    await loadAdmins();
    updateStats();
    displayAdmins();
    
    document.getElementById('selectAll').checked = false;
    updateBulkBar();
    
  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    toast('Bulk delete failed', 'error');
  }
}

// ============================================
// ACTION LOGGING
// ============================================
async function logAction(actionType, targetUser, details) {
  try {
    const res = await fetch(`${API_BASE}/superadmin-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminid: currentAdminId,
        action_type: actionType,
        target_user: targetUser,
        details: details,
        ip_address: await getClientIP()
      })
    });
    
    if (!res.ok) {
      console.warn('Failed to log action');
    }
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'Unknown';
  }
}

// ============================================
// UTILITIES
// ============================================
function togglePass(id) {
  const inp = document.getElementById(id);
  const btn = inp.nextElementSibling;
  const icon = btn.querySelector('i');
  
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    inp.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

function genPass() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  
  document.getElementById('inpPass').value = pass;
  document.getElementById('inpConfirm').value = pass;
  toast('Generated', 'success');
}

function closeModal() {
  document.getElementById('modalRoot').style.display = 'none';
  document.getElementById('modalRoot').innerHTML = '';
}

function showError(msg) {
  document.getElementById('mainContent').innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-triangle fa-3x"></i>
      <p>${msg}</p>
    </div>
  `;
}

function toast(msg, type = 'info') {
  const existing = document.querySelectorAll('.toast');
  existing.forEach(t => t.remove());
  
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' :
               type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
  
  t.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
  
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 100);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// Global function exports
window.togglePass = togglePass;
window.genPass = genPass;
window.closeModal = closeModal;

console.log('✅ Limited User Management loaded');