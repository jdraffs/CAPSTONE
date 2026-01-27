// adminActivityLogs.js - Admin Activity Logs Dashboard for SuperAdmin
// UPDATED: Removed mock data fallback, now uses actual API data only

document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  
  let allLogs = [];
  let filteredLogs = [];
  let admins = [];
  let currentView = 'timeline'; // 'timeline' or 'table'
  let currentFilters = {
    admin: '',
    actionType: '',
    timeRange: 'all',
    startDate: '',
    endDate: ''
  };

  await initializeDashboard();

  async function initializeDashboard() {
    try {
      await Promise.all([
        fetchActivityLogs(),
        fetchAdmins()
      ]);

      populateAdminFilter();
      updateMetrics();
      renderLogs();
      renderCharts();
      attachEventListeners();

      console.log('✅ Activity Logs Dashboard initialized');
    } catch (error) {
      console.error('❌ Initialization error:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  }

  async function fetchActivityLogs() {
    try {
      console.log('🔄 Fetching all activity logs from API...');
      
      const response = await fetch(`${API_URL}/superadmin-actions?limit=500`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      allLogs = data.actions || [];
      filteredLogs = [...allLogs];
      
      console.log(`✅ Loaded ${allLogs.length} activity logs`);
    } catch (error) {
      console.error('❌ Error fetching logs:', error);
      showToast('Failed to load logs from server', 'error');
      
      // Don't use mock data - show empty state
      allLogs = [];
      filteredLogs = [];
    }
  }

  async function fetchAdmins() {
    try {
      console.log('🔄 Fetching admin accounts...');
      
      const response = await fetch(`${API_URL}/admin-accounts`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      admins = data.admins || [];
      
      console.log(`✅ Loaded ${admins.length} admins`);
    } catch (error) {
      console.error('❌ Error fetching admins:', error);
      showToast('Failed to load admin accounts', 'error');
      admins = [];
    }
  }

  function populateAdminFilter() {
    const adminFilter = document.getElementById('adminFilter');
    
    const uniqueAdmins = [...new Set(allLogs.map(log => log.adminid))];
    
    uniqueAdmins.forEach(adminId => {
      const option = document.createElement('option');
      option.value = adminId;
      option.textContent = adminId;
      adminFilter.appendChild(option);
    });
  }

  function updateMetrics() {
    // Total Actions
    const totalActions = allLogs.length;
    animateValue(document.getElementById('totalActions'), 0, totalActions, 1000);

    // Active Admins (with activity in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeAdmins = new Set(
      allLogs
        .filter(log => new Date(log.created_at) >= thirtyDaysAgo)
        .map(log => log.adminid)
    ).size;
    animateValue(document.getElementById('activeAdmins'), 0, activeAdmins, 1000);

    // Recent Actions (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const recentActions = allLogs.filter(log => 
      new Date(log.created_at) >= twentyFourHoursAgo
    ).length;
    animateValue(document.getElementById('recentActions'), 0, recentActions, 1000);

    // System Admin Actions
    const backupAdminActions = allLogs.filter(log => {
      const admin = admins.find(a => a.adminid === log.adminid);
      return admin && admin.role_name === 'Backup Campus System Administrator';
    }).length;
    animateValue(document.getElementById('backupAdminActions'), 0, backupAdminActions, 1000);

    // Notification badge
    const criticalActions = allLogs.filter(log => 
      log.action_type.toLowerCase().includes('delete') ||
      log.action_type.toLowerCase().includes('suspend')
    ).length;
    
    const notifBadge = document.getElementById('notificationBadge');
    if (notifBadge) {
      notifBadge.textContent = criticalActions;
      notifBadge.style.display = criticalActions > 0 ? 'block' : 'none';
    }
  }

  function renderLogs() {
    if (currentView === 'timeline') {
      renderTimelineView();
    } else {
      renderTableView();
    }
  }

  function renderTimelineView() {
    const timelineContent = document.getElementById('timelineContent');
    const tableContent = document.getElementById('tableContent');
    
    timelineContent.style.display = 'block';
    tableContent.style.display = 'none';

    if (filteredLogs.length === 0) {
      timelineContent.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No Activity Logs</h3>
          <p>${allLogs.length === 0 ? 'No activity logs recorded yet' : 'No logs match the current filters'}</p>
        </div>
      `;
      return;
    }

    // Sort by date descending
    const sortedLogs = [...filteredLogs].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    timelineContent.innerHTML = sortedLogs.map(log => {
      const actionClass = getActionClass(log.action_type);
      const admin = admins.find(a => a.adminid === log.adminid);
      const isBackupAdmin = admin && admin.role_name === 'Backup Campus System Administrator';

      return `
        <div class="timeline-item ${actionClass}" onclick="viewActionDetails(${log.id})">
          <div class="timeline-item-header">
            <div class="timeline-action">
              <span class="action-badge ${actionClass}">${log.action_type}</span>
              <span class="action-title">${log.action_type}</span>
            </div>
            <div class="timeline-timestamp">
              <i class="far fa-clock"></i>
              ${formatTimeAgo(new Date(log.created_at))}
            </div>
          </div>
          
          <div class="timeline-details">
            <div class="detail-row">
              <strong>Admin:</strong>
              <span class="${isBackupAdmin ? 'backup-admin-badge' : 'admin-badge'}">
                ${log.adminid}
                ${isBackupAdmin ? ' (Backup)' : ''}
              </span>
            </div>
            ${log.target_user ? `
              <div class="detail-row">
                <strong>Target User:</strong>
                <span>${log.target_user}</span>
              </div>
            ` : ''}
            ${log.details ? `
              <div class="detail-row">
                <strong>Details:</strong>
                <span>${log.details}</span>
              </div>
            ` : ''}
            ${log.ip_address ? `
              <div class="detail-row">
                <strong>IP Address:</strong>
                <span>${log.ip_address}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Render critical actions
    renderCriticalActions(sortedLogs);
  }

  function renderTableView() {
    const timelineContent = document.getElementById('timelineContent');
    const tableContent = document.getElementById('tableContent');
    
    timelineContent.style.display = 'none';
    tableContent.style.display = 'block';

    const tableBody = document.getElementById('activityTableBody');

    if (filteredLogs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-table">
            <i class="fas fa-inbox"></i>
            <p>${allLogs.length === 0 ? 'No activity logs recorded yet' : 'No logs match the current filters'}</p>
          </td>
        </tr>
      `;
      return;
    }

    const sortedLogs = [...filteredLogs].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    tableBody.innerHTML = sortedLogs.map(log => `
      <tr onclick="viewActionDetails(${log.id})">
        <td>${new Date(log.created_at).toLocaleString()}</td>
        <td>${log.adminid}</td>
        <td>
          <span class="action-badge ${getActionClass(log.action_type)}">
            ${log.action_type}
          </span>
        </td>
        <td>${log.target_user || '-'}</td>
        <td>${log.details || '-'}</td>
        <td>${log.ip_address || '-'}</td>
      </tr>
    `).join('');
  }

  function renderCriticalActions(logs) {
    const criticalList = document.getElementById('criticalActionsList');
    
    const criticalActions = logs.filter(log => 
      log.action_type.toLowerCase().includes('delete') ||
      log.action_type.toLowerCase().includes('suspend') ||
      log.action_type.toLowerCase().includes('role updated')
    ).slice(0, 10);

    const criticalCount = document.getElementById('criticalCount');
    if (criticalCount) {
      criticalCount.textContent = criticalActions.length;
    }

    if (criticalActions.length === 0) {
      criticalList.innerHTML = `
        <div class="empty-state" style="padding: 30px;">
          <i class="fas fa-check-circle" style="color: #48bb78;"></i>
          <p>No critical actions recently</p>
        </div>
      `;
      return;
    }

    criticalList.innerHTML = criticalActions.map(log => `
      <div class="critical-item" onclick="viewActionDetails(${log.id})">
        <div class="critical-header">
          <span class="critical-action">${log.action_type}</span>
          <span class="critical-timestamp">${formatTimeAgo(new Date(log.created_at))}</span>
        </div>
        <div class="critical-details">
          <strong>${log.adminid}</strong>
          ${log.target_user ? ` performed action on <strong>${log.target_user}</strong>` : ''}
          ${log.details ? ` - ${log.details}` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderCharts() {
    renderAdminActivityChart();
    renderActionTypeChart();
  }

  function renderAdminActivityChart() {
    const container = document.getElementById('adminActivityChart');
    
    // Count actions per admin
    const adminCounts = {};
    filteredLogs.forEach(log => {
      adminCounts[log.adminid] = (adminCounts[log.adminid] || 0) + 1;
    });

    const sortedAdmins = Object.entries(adminCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sortedAdmins.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 20px;">No data available</p>';
      return;
    }

    const maxCount = Math.max(...sortedAdmins.map(([, count]) => count));

    container.innerHTML = sortedAdmins.map(([adminId, count]) => {
      const percentage = (count / maxCount) * 100;
      const admin = admins.find(a => a.adminid === adminId);
      const isBackupAdmin = admin && admin.role_name === 'Backup Campus System Administrator';
      
      return `
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-weight: 600; color: #2d3748;">
              ${adminId}
              ${isBackupAdmin ? '<span style="color: #ed8936; font-size: 0.8rem;"> (Backup)</span>' : ''}
            </span>
            <span style="font-weight: 700; color: #667eea;">${count}</span>
          </div>
          <div style="height: 12px; background: #e2e8f0; border-radius: 10px; overflow: hidden;">
            <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); transition: width 0.5s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderActionTypeChart() {
    const container = document.getElementById('actionTypeChart');
    
    // Count actions by type
    const typeCounts = {};
    filteredLogs.forEach(log => {
      const type = log.action_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1]);

    if (sortedTypes.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 20px;">No data available</p>';
      return;
    }

    const total = sortedTypes.reduce((sum, [, count]) => sum + count, 0);

    container.innerHTML = sortedTypes.map(([type, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const actionClass = getActionClass(type);
      
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f7fafc; border-radius: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
            <span class="action-badge ${actionClass}" style="font-size: 0.75rem; padding: 4px 10px;">
              ${type}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 0.9rem; color: #718096;">${percentage}%</span>
            <span style="font-weight: 700; color: #2d3748; min-width: 40px; text-align: right;">${count}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  window.viewActionDetails = function(actionId) {
    const action = allLogs.find(a => a.id === actionId);
    if (!action) return;

    const admin = admins.find(a => a.adminid === action.adminid);
    const isBackupAdmin = admin && admin.role_name === 'Backup Campus System Administrator';
    const modalBody = document.getElementById('actionDetailsBody');

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="padding: 20px; background: #f7fafc; border-radius: 10px;">
          <h4 style="margin: 0 0 15px 0; color: #2d3748; font-size: 1.1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <i class="fas fa-info-circle"></i> Action Information
          </h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div>
              <div style="font-size: 0.85rem; color: #718096; font-weight: 600; margin-bottom: 5px;">Action Type</div>
              <span class="action-badge ${getActionClass(action.action_type)}">${action.action_type}</span>
            </div>
            <div>
              <div style="font-size: 0.85rem; color: #718096; font-weight: 600; margin-bottom: 5px;">Timestamp</div>
              <div style="font-size: 1rem; color: #2d3748; font-weight: 500;">${new Date(action.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div style="font-size: 0.85rem; color: #718096; font-weight: 600; margin-bottom: 5px;">Performed By</div>
              <div>
                <span class="${isBackupAdmin ? 'backup-admin-badge' : 'admin-badge'}">
                  ${action.adminid}
                  ${isBackupAdmin ? ' (System Admin)' : ''}
                </span>
              </div>
            </div>
            ${action.target_user ? `
              <div>
                <div style="font-size: 0.85rem; color: #718096; font-weight: 600; margin-bottom: 5px;">Target User</div>
                <div style="font-size: 1rem; color: #2d3748; font-weight: 500;">${action.target_user}</div>
              </div>
            ` : ''}
            ${action.ip_address ? `
              <div>
                <div style="font-size: 0.85rem; color: #718096; font-weight: 600; margin-bottom: 5px;">IP Address</div>
                <div style="font-size: 1rem; color: #2d3748; font-weight: 500;">${action.ip_address}</div>
              </div>
            ` : ''}
          </div>
        </div>

        ${action.details ? `
          <div style="padding: 20px; background: #f7fafc; border-radius: 10px;">
            <h4 style="margin: 0 0 15px 0; color: #2d3748; font-size: 1.1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              <i class="fas fa-file-alt"></i> Details
            </h4>
            <p style="line-height: 1.6; color: #4a5568; margin: 0;">${action.details}</p>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('actionDetailsModal').classList.add('active');
  };

  function applyFilters() {
    filteredLogs = allLogs.filter(log => {
      // Admin filter
      if (currentFilters.admin && log.adminid !== currentFilters.admin) {
        return false;
      }

      // Action type filter
      if (currentFilters.actionType && !log.action_type.toLowerCase().includes(currentFilters.actionType)) {
        return false;
      }

      // Time filter
      if (currentFilters.timeRange !== 'all') {
        const logDate = new Date(log.created_at);
        const now = new Date();

        if (currentFilters.timeRange === 'today') {
          if (logDate.toDateString() !== now.toDateString()) return false;
        } else if (currentFilters.timeRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < weekAgo) return false;
        } else if (currentFilters.timeRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (logDate < monthAgo) return false;
        } else if (currentFilters.timeRange === 'custom') {
          if (currentFilters.startDate && logDate < new Date(currentFilters.startDate)) return false;
          if (currentFilters.endDate && logDate > new Date(currentFilters.endDate)) return false;
        }
      }

      return true;
    });

    updateMetrics();
    renderLogs();
    renderCharts();
  }

  function attachEventListeners() {
    // Refresh button
    document.getElementById('refreshLogs').addEventListener('click', async () => {
      const btn = document.getElementById('refreshLogs');
      const icon = btn.querySelector('i');
      icon.classList.add('fa-spin');
      btn.disabled = true;

      try {
        await fetchActivityLogs();
        await fetchAdmins();
        populateAdminFilter();
        applyFilters();
        showToast('Logs refreshed successfully', 'success');
      } catch (error) {
        showToast('Failed to refresh logs', 'error');
      } finally {
        icon.classList.remove('fa-spin');
        btn.disabled = false;
      }
    });

    // Filters
    document.getElementById('adminFilter').addEventListener('change', (e) => {
      currentFilters.admin = e.target.value;
      applyFilters();
    });

    document.getElementById('actionTypeFilter').addEventListener('change', (e) => {
      currentFilters.actionType = e.target.value;
      applyFilters();
    });

    document.getElementById('timeFilter').addEventListener('change', (e) => {
      currentFilters.timeRange = e.target.value;
      const dateRangeContainer = document.getElementById('dateRangeContainer');
      
      if (e.target.value === 'custom') {
        dateRangeContainer.style.display = 'flex';
      } else {
        dateRangeContainer.style.display = 'none';
        applyFilters();
      }
    });

    document.getElementById('applyDateRange').addEventListener('click', () => {
      currentFilters.startDate = document.getElementById('startDate').value;
      currentFilters.endDate = document.getElementById('endDate').value;
      applyFilters();
    });

    document.getElementById('clearFilters').addEventListener('click', () => {
      currentFilters = {
        admin: '',
        actionType: '',
        timeRange: 'all',
        startDate: '',
        endDate: ''
      };

      document.getElementById('adminFilter').value = '';
      document.getElementById('actionTypeFilter').value = '';
      document.getElementById('timeFilter').value = 'all';
      document.getElementById('dateRangeContainer').style.display = 'none';

      filteredLogs = [...allLogs];
      applyFilters();
      showToast('Filters cleared', 'info');
    });

    // View toggle
    document.querySelectorAll('.timeline-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.timeline-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        renderLogs();
      });
    });

    // Modal close
    document.getElementById('closeDetailsModal').addEventListener('click', () => {
      document.getElementById('actionDetailsModal').classList.remove('active');
    });

    document.querySelector('#actionDetailsModal .modal-overlay').addEventListener('click', () => {
      document.getElementById('actionDetailsModal').classList.remove('active');
    });

    // Export buttons
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
  }

  function exportToCSV() {
    const csvContent = [
      ['Timestamp', 'Admin', 'Action Type', 'Target User', 'Details', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.adminid,
        log.action_type,
        log.target_user || '',
        `"${(log.details || '').replace(/"/g, '""')}"`,
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('CSV exported successfully', 'success');
  }

  function exportToPDF() {
    showToast('PDF export feature coming soon', 'info');
  }

  // Utility Functions
  function getActionClass(actionType) {
    const type = actionType.toLowerCase();
    if (type.includes('create')) return 'create';
    if (type.includes('edit') || type.includes('update')) return 'edit';
    if (type.includes('delete')) return 'delete';
    if (type.includes('assign')) return 'assign';
    if (type.includes('reset')) return 'reset';
    if (type.includes('suspend') || type.includes('activate')) return 'suspend';
    return 'edit';
  }

  function animateValue(element, start, end, duration) {
    if (!element) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      element.textContent = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
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

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
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

  console.log('✅ SuperAdmin Activity Logs Dashboard initialized');
});