// userManagement.js - ENHANCED WITH ROLE & STATUS MANAGEMENT
const API_BASE = 'http://localhost:3000/api';
let currentAdminId = localStorage.getItem('adminid');
let allAdmins = [];
let filteredAdmins = [];
let roles = [];
let currentSearchTerm = '';
let currentStatusFilter = 'all'; // all, active, suspended

document.addEventListener('DOMContentLoaded', async () => {
  initializeProfileDropdown();
  
  if (!currentAdminId) {
    alertSystem.error('You must be logged in.');
    window.location.href = '/private/html/AdminLogin/login.html';
    return;
  }
  
  if (currentAdminId !== 'adminSalao') {
    alertSystem.error('Access Denied: Super Admin only.');
    window.location.href = '/private/html/adminPages/superAdmin/superAdmin.html';
    return;
  }
  
  await initialize();
});

async function initialize() {
  showLoading();
  
  try {
    await loadRoles();
    await loadAdmins();
    
    renderUI();
    attachEvents();
    updateStats();
    displayAdmins();
    
    console.log('✅ User Management loaded');
  } catch (error) {
    console.error('❌ Init error:', error);
    showError('Failed to initialize');
  }
}


// Di pa updated sa actual roles
async function loadRoles() {
  try {
    const res = await fetch(`${API_BASE}/roles`);
    if (!res.ok) throw new Error('Failed to load roles');
    roles = await res.json();
    console.log('✅ Roles:', roles.length);
  } catch (error) {
    console.error('❌ Roles error:', error);
    roles = [
      { id: 1, name: 'Super Administrator', hierarchy_level: 100 },
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
  
  main.innerHTML = `
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
    window.location.href = '/private/html/adminPages/superAdmin/roleManagement.html';
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
  
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statSuspended').textContent = suspended;
}

function filterAdmins() {
  filteredAdmins = allAdmins;

  // Filter by status
  if (currentStatusFilter !== 'all') {
    filteredAdmins = filteredAdmins.filter(a => a.status === currentStatusFilter);
  }

  // Filter by search
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

  tbody.innerHTML = filteredAdmins.map(a => `
    <tr>
      <td>
        <input type="checkbox" class="cb" data-id="${a.id}" 
          ${a.adminid === 'adminSalao' ? 'disabled' : ''}>
      </td>
      <td class="user-id">
        <div class="user-avatar"><i class="fas fa-user-shield"></i></div>
        <strong>${a.adminid}</strong>
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
        ${a.adminid !== 'adminSalao' ? `
          <button class="btn-action btn-edit" onclick="editAdmin(${a.id})" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action btn-edit" onclick="resetPass(${a.id})" title="Reset">
            <i class="fas fa-key"></i>
          </button>
          <button class="btn-action btn-delete" onclick="deleteAdmin(${a.id})" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');

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

// ============================================
// CREATE MODAL
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
  const role_id = document.getElementById('inpRole').value;
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
  
  try {
    const res = await fetch(`${API_BASE}/admin-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminid, password, role_id: parseInt(role_id) })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
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
// EDIT ADMIN (Role & Status)
// ============================================
function editAdmin(id) {
  const admin = allAdmins.find(a => a.id === id);
  if (!admin) return;
  
  const modal = document.getElementById('modalRoot');
  
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fas fa-edit"></i> Edit Admin: ${admin.adminid}</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
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
  document.getElementById('formEdit').onsubmit = (e) => handleEdit(e, id);
}

async function handleEdit(e, id) {
  e.preventDefault();
  
  const role_id = document.getElementById('editRole').value;
  const status = document.getElementById('editStatus').value;
  
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: parseInt(role_id), status })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
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
          </div>
          
          ${admin.adminid !== 'adminSalao' ? `
            <div class="details-actions">
              <button class="btn-secondary" onclick="closeModal(); editAdmin(${id})">
                <i class="fas fa-edit"></i> Edit Role/Status
              </button>
              <button class="btn-secondary" onclick="closeModal(); resetPass(${id})">
                <i class="fas fa-key"></i> Reset Password
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
// RESET PASSWORD
// ============================================
function resetPass(id) {
  const admin = allAdmins.find(a => a.id === id);
  if (!admin) return;
  
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
          <button class="btn-primary" onclick="execReset(${id})">Reset</button>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

async function execReset(id) {
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/${id}/reset-password`, {
      method: 'POST'
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
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

// ============================================
// DELETE
// ============================================
function deleteAdmin(id) {
  const admin = allAdmins.find(a => a.id === id);
  if (!admin) return;
  
  if (admin.adminid === 'adminSalao') {
    toast('Cannot delete Super Admin', 'error');
    return;
  }
  
  if (!confirm(`Delete "${admin.adminid}"?`)) return;
  
  execDelete(id);
}

async function execDelete(id) {
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/${id}`, {
      method: 'DELETE'
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
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
  
  if (!confirm(`Delete ${ids.length} admin(s)?`)) return;
  
  try {
    const res = await fetch(`${API_BASE}/admin-accounts/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Failed');
    
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

function showLoading() {
  document.getElementById('mainContent').innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin fa-3x"></i>
      <p>Loading...</p>
    </div>
  `;
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

// Global functions
window.viewAdmin = viewAdmin;
window.editAdmin = editAdmin;
window.resetPass = resetPass;
window.execReset = execReset;
window.deleteAdmin = deleteAdmin;
window.copyPass = copyPass;
window.togglePass = togglePass;
window.genPass = genPass;
window.closeModal = closeModal;

console.log('✅ User Management loaded');