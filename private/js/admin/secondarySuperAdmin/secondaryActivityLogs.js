// secondaryActivityLogs.js - Action Logs for System Admin

document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  
  let allLogs = [];
  let filteredLogs = [];
  let currentAdminId = localStorage.getItem('adminid');
  let currentView = 'timeline';
  let currentPage = 1;
  const logsPerPage = 20;

  // Set admin name in sidebar
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

  // Initialize
  initializeProfileDropdown();
  await initializeActionLogs();

  async function initializeActionLogs() {
    showLoading();
    try {
      await fetchActionLogs();
      updateStatistics();
      renderActionBreakdown();
      renderLogs();
      attachEventListeners();
      
      console.log('✅ Action Logs initialized for:', currentAdminId);
    } catch (error) {
      console.error('Error initializing action logs:', error);
      showToast('Failed to load action logs', 'error');
    }
  }

  // ============ API CALLS ============
  
  async function fetchActionLogs() {
    try {
      console.log('🔄 Fetching action logs for:', currentAdminId);
      
      // Fetch logs filtered by current admin ID
      const response = await fetch(`${API_URL}/superadmin-actions?adminid=${currentAdminId}&limit=500`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      allLogs = data.actions || [];
      filteredLogs = [...allLogs];
      
      console.log(`✅ Loaded ${allLogs.length} action logs for ${currentAdminId}`);
      
    } catch (error) {
      console.error('❌ Error fetching logs:', error);
      showToast('Failed to load logs from server', 'error');
      
      // Don't use mock data - show empty state
      allLogs = [];
      filteredLogs = [];
    }
  }

  // ============ STATISTICS ============
  
  function updateStatistics() {
    const total = allLogs.length;
    
    // Count today's actions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = allLogs.filter(log => {
      const logDate = new Date(log.created_at || log.timestamp);
      return logDate >= today;
    }).length;
    
    // Count this week's actions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = allLogs.filter(log => {
      const logDate = new Date(log.created_at || log.timestamp);
      return logDate >= weekAgo;
    }).length;
    
    // Get last action time
    const lastActionTime = allLogs.length > 0 
      ? formatTimeAgo(new Date(allLogs[0].created_at || allLogs[0].timestamp))
      : 'No activity';
    
    // Update UI
    document.getElementById('totalActions').textContent = total;
    document.getElementById('todayActions').textContent = todayCount;
    document.getElementById('weekActions').textContent = weekCount;
    document.getElementById('lastActionTime').textContent = lastActionTime;
  }

  // ============ ACTION BREAKDOWN ============
  
  function renderActionBreakdown() {
    const breakdown = {};
    
    allLogs.forEach(log => {
      const type = log.action_type || 'Other';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    
    const total = allLogs.length || 1;
    const container = document.getElementById('actionBreakdown');
    
    if (allLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #a0aec0;">
          <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
          <p>No actions recorded yet</p>
        </div>
      `;
      return;
    }
    
    // Get top 5 action types
    const sortedTypes = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    container.innerHTML = sortedTypes.map(([type, count]) => {
      const percentage = Math.round((count / total) * 100);
      const icon = getActionIcon(type);
      const color = getActionColor(type);
      
      return `
        <div class="breakdown-item">
          <div class="breakdown-header">
            <div class="breakdown-label">
              <i class="${icon}" style="color: ${color}"></i>
              <span>${type}</span>
            </div>
            <div class="breakdown-count">
              <strong>${count}</strong>
              <span>${percentage}%</span>
            </div>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${percentage}%; background: ${color}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============ RENDER LOGS ============
  
  function renderLogs() {
    if (currentView === 'timeline') {
      renderTimeline();
    } else {
      renderTable();
    }
    renderPagination();
  }

  function renderTimeline() {
    const timeline = document.getElementById('timeline');
    const startIdx = (currentPage - 1) * logsPerPage;
    const endIdx = startIdx + logsPerPage;
    const pageLogs = filteredLogs.slice(startIdx, endIdx);
    
    if (pageLogs.length === 0) {
      timeline.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No Logs Found</h3>
          <p>${allLogs.length === 0 ? 'You haven\'t performed any actions yet' : 'No logs match your current filters'}</p>
        </div>
      `;
      return;
    }
    
    // Group by date
    const groupedLogs = {};
    pageLogs.forEach(log => {
      const date = new Date(log.created_at || log.timestamp).toDateString();
      if (!groupedLogs[date]) groupedLogs[date] = [];
      groupedLogs[date].push(log);
    });
    
    timeline.innerHTML = Object.entries(groupedLogs).map(([date, logs]) => `
      <div class="timeline-date-group">
        <div class="timeline-date-header">
          <i class="fas fa-calendar-day"></i>
          ${formatDateHeader(date)}
        </div>
        ${logs.map(log => renderTimelineItem(log)).join('')}
      </div>
    `).join('');
  }

  function renderTimelineItem(log) {
    const icon = getActionIcon(log.action_type);
    const color = getActionColor(log.action_type);
    const timestamp = log.created_at || log.timestamp;
    
    return `
      <div class="timeline-item" onclick="viewLogDetails(${log.id})">
        <div class="timeline-marker" style="background: ${color}">
          <i class="${icon}"></i>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h4>${log.action_type}</h4>
            <span class="timeline-time">${formatTime(timestamp)}</span>
          </div>
          <div class="timeline-body">
            ${log.target_user ? `
              <div class="timeline-target">
                <i class="fas fa-user"></i>
                <strong>Target:</strong> ${log.target_user}
              </div>
            ` : ''}
            <div class="timeline-details">
              <i class="fas fa-info-circle"></i>
              ${log.details || 'No additional details'}
            </div>
            ${log.ip_address ? `
              <div class="timeline-ip">
                <i class="fas fa-globe"></i>
                ${log.ip_address}
              </div>
            ` : ''}
          </div>
          <div class="timeline-footer">
            <span class="action-badge" style="background: ${color}20; color: ${color}">
              ${log.action_type}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function renderTable() {
    const tbody = document.getElementById('tableBody');
    const startIdx = (currentPage - 1) * logsPerPage;
    const endIdx = startIdx + logsPerPage;
    const pageLogs = filteredLogs.slice(startIdx, endIdx);
    
    if (pageLogs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">
            <i class="fas fa-inbox"></i>
            <p>${allLogs.length === 0 ? 'No actions recorded yet' : 'No logs found'}</p>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = pageLogs.map(log => {
      const timestamp = log.created_at || log.timestamp;
      return `
        <tr onclick="viewLogDetails(${log.id})">
          <td>${formatFullDateTime(timestamp)}</td>
          <td>
            <span class="action-type-badge" style="background: ${getActionColor(log.action_type)}20; color: ${getActionColor(log.action_type)}">
              <i class="${getActionIcon(log.action_type)}"></i>
              ${log.action_type}
            </span>
          </td>
          <td>${log.target_user || '-'}</td>
          <td class="details-cell">${log.details || 'No details'}</td>
          <td>${log.ip_address || 'Unknown'}</td>
          <td>
            <span class="status-badge success">
              <i class="fas fa-check-circle"></i>
              Completed
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ============ PAGINATION ============
  
  function renderPagination() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }
    
    let pages = '';
    
    // Previous button
    pages += `
      <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
        onclick="changePage(${currentPage - 1})" 
        ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
      pages += `<button class="page-btn" onclick="changePage(1)">1</button>`;
      if (startPage > 2) pages += `<span class="page-ellipsis">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages += `
        <button class="page-btn ${i === currentPage ? 'active' : ''}" 
          onclick="changePage(${i})">
          ${i}
        </button>
      `;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages += `<span class="page-ellipsis">...</span>`;
      pages += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    pages += `
      <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
        onclick="changePage(${currentPage + 1})" 
        ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    pagination.innerHTML = pages;
  }

  window.changePage = function(page) {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderLogs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============ FILTERS ============
  
  function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const actionType = document.getElementById('actionTypeFilter').value;
    const dateRange = document.getElementById('dateRangeFilter').value;
    
    filteredLogs = allLogs.filter(log => {
      const timestamp = log.created_at || log.timestamp;
      
      // Search filter
      const matchesSearch = !searchTerm || 
        (log.action_type && log.action_type.toLowerCase().includes(searchTerm)) ||
        (log.target_user && log.target_user.toLowerCase().includes(searchTerm)) ||
        (log.details && log.details.toLowerCase().includes(searchTerm)) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(searchTerm));
      
      // Action type filter
      const matchesType = actionType === 'all' || log.action_type === actionType;
      
      // Date range filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const logDate = new Date(timestamp);
        const now = new Date();
        
        if (dateRange === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          matchesDate = logDate >= today;
        } else if (dateRange === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          matchesDate = logDate >= yesterday && logDate < today;
        } else if (dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = logDate >= weekAgo;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = logDate >= monthAgo;
        } else if (dateRange === 'custom') {
          const startDate = document.getElementById('startDate').value;
          const endDate = document.getElementById('endDate').value;
          
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = logDate >= start && logDate <= end;
          }
        }
      }
      
      return matchesSearch && matchesType && matchesDate;
    });
    
    currentPage = 1;
    renderLogs();
  }

  // Continue to Part 2...
  // ============ LOG DETAILS MODAL ============
  
  window.viewLogDetails = function(logId) {
    const log = allLogs.find(l => l.id === logId);
    if (!log) return;
    
    const modalBody = document.getElementById('modalBody');
    const icon = getActionIcon(log.action_type);
    const color = getActionColor(log.action_type);
    const timestamp = log.created_at || log.timestamp;
    
    modalBody.innerHTML = `
      <div class="log-details">
        <div class="detail-header" style="background: ${color}20; border-left: 4px solid ${color}">
          <i class="${icon}" style="color: ${color}; font-size: 2rem;"></i>
          <div>
            <h3>${log.action_type}</h3>
            <p>${formatFullDateTime(timestamp)}</p>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Action Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Action Type</label>
              <p>${log.action_type}</p>
            </div>
            <div class="detail-item">
              <label>Timestamp</label>
              <p>${formatFullDateTime(timestamp)}</p>
            </div>
            <div class="detail-item">
              <label>IP Address</label>
              <p>${log.ip_address || 'Unknown'}</p>
            </div>
            <div class="detail-item">
              <label>Status</label>
              <p><span class="status-badge success">Completed</span></p>
            </div>
          </div>
        </div>
        
        ${log.target_user ? `
          <div class="detail-section">
            <h4><i class="fas fa-bullseye"></i> Target</h4>
            <div class="target-info">
              <i class="fas fa-user"></i>
              <strong>${log.target_user}</strong>
            </div>
          </div>
        ` : ''}
        
        <div class="detail-section">
          <h4><i class="fas fa-file-alt"></i> Details</h4>
          <div class="details-content">
            <p>${log.details || 'No additional details provided'}</p>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-fingerprint"></i> Session Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Admin ID</label>
              <p>${currentAdminId}</p>
            </div>
            <div class="detail-item">
              <label>Log ID</label>
              <p>#${log.id}</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('logModal').classList.add('active');
  };

  // ============ EXPORT LOGS ============
  
  async function exportLogs() {
    try {
      const csv = convertToCSV(filteredLogs);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_action_logs_${currentAdminId}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast('Logs exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export logs', 'error');
    }
  }

  function convertToCSV(logs) {
    const headers = ['Timestamp', 'Action Type', 'Target User', 'Details', 'IP Address'];
    const rows = logs.map(log => {
      const timestamp = log.created_at || log.timestamp;
      return [
        formatFullDateTime(timestamp),
        log.action_type,
        log.target_user || '',
        log.details || '',
        log.ip_address || ''
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  // ============ EVENT LISTENERS ============
  
  function attachEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      showToast('Refreshing logs...', 'info');
      await fetchActionLogs();
      updateStatistics();
      renderActionBreakdown();
      applyFilters();
      showToast('Logs refreshed', 'success');
    });
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportLogs);
    
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('actionTypeFilter').addEventListener('change', applyFilters);
    document.getElementById('dateRangeFilter').addEventListener('change', (e) => {
      const customRange = document.getElementById('customDateRange');
      if (e.target.value === 'custom') {
        customRange.style.display = 'flex';
      } else {
        customRange.style.display = 'none';
        applyFilters();
      }
    });
    
    document.getElementById('applyDateBtn').addEventListener('click', applyFilters);
    
    // View toggle
    document.getElementById('timelineViewBtn').addEventListener('click', () => {
      switchView('timeline');
    });
    
    document.getElementById('tableViewBtn').addEventListener('click', () => {
      switchView('table');
    });
    
    // Modal
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);
  }

  function switchView(view) {
    currentView = view;
    
    // Update buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (view === 'timeline') {
      document.getElementById('timelineViewBtn').classList.add('active');
      document.getElementById('timelineView').style.display = 'block';
      document.getElementById('tableView').style.display = 'none';
    } else {
      document.getElementById('tableViewBtn').classList.add('active');
      document.getElementById('timelineView').style.display = 'none';
      document.getElementById('tableView').style.display = 'block';
    }
    
    renderLogs();
  }

  function closeModal() {
    document.getElementById('logModal').classList.remove('active');
  }

  // ============ UTILITY FUNCTIONS ============
  
  function getActionIcon(actionType) {
    const icons = {
      'User Created': 'fas fa-user-plus',
      'User Updated': 'fas fa-user-edit',
      'User Deleted': 'fas fa-user-minus',
      'Password Reset': 'fas fa-key',
      'Role Created': 'fas fa-user-tag',
      'Role Updated': 'fas fa-edit',
      'Role Deleted': 'fas fa-trash',
      'Bulk Delete': 'fas fa-trash-alt',
      'Login': 'fas fa-sign-in-alt',
      'Logout': 'fas fa-sign-out-alt',
      'Permission Changed': 'fas fa-shield-alt',
      'Settings Updated': 'fas fa-cog',
      'Data Export': 'fas fa-download',
      'Data Import': 'fas fa-upload'
    };
    
    return icons[actionType] || 'fas fa-circle';
  }

  function getActionColor(actionType) {
    const colors = {
      'User Created': '#48bb78',
      'User Updated': '#4299e1',
      'User Deleted': '#f56565',
      'Password Reset': '#ed8936',
      'Role Created': '#9f7aea',
      'Role Updated': '#4299e1',
      'Role Deleted': '#f56565',
      'Bulk Delete': '#e53e3e',
      'Login': '#48bb78',
      'Logout': '#718096',
      'Permission Changed': '#ed8936',
      'Settings Updated': '#4299e1',
      'Data Export': '#38b2ac',
      'Data Import': '#38b2ac'
    };
    
    return colors[actionType] || '#718096';
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

  function formatDateHeader(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatFullDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function showLoading() {
    if (currentView === 'timeline') {
      document.getElementById('timeline').innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <h3>Loading Logs</h3>
          <p>Fetching your activity history...</p>
        </div>
      `;
    } else {
      document.getElementById('tableBody').innerHTML = `
        <tr>
          <td colspan="6" class="loading-cell">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading logs...</p>
          </td>
        </tr>
      `;
    }
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
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  console.log('✅ Secondary Activity Logs initialized');
});