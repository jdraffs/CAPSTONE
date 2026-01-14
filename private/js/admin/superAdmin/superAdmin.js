// superAdmin.js - ENHANCED VERSION WITH ACCURATE CROSS-TAB DATA
document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  initializeProfileDropdown();
  
  let dashboardData = {
    datasets: [],
    users: [],
    roles: [],
    activities: [],
    feedback: [],
    notifications: [],
    storageInfo: { used: 0, total: 100 * 1024 * 1024 * 1024 }
  };

  let refreshInterval;

  await initializeDashboard();

  async function initializeDashboard() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    await loadAllData();
    updateAllMetrics();
    renderActivities();
    renderNotifications();
    updateLastSync();
    startAutoRefresh();
    attachEventListeners();
  }

  // ============ COMPREHENSIVE DATA LOADING ============

  async function loadAllData() {
    try {
      await Promise.all([
        fetchDatasets(),
        fetchUsers(),
        fetchRoles(),
        fetchActivities(),
        fetchFeedback(),
        fetchStorageInfo()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  }

  async function fetchDatasets() {
    try {
      const response = await fetch(`${API_URL}/files/data`);
      if (!response.ok) throw new Error('Failed to fetch datasets');
      dashboardData.datasets = await response.json();
    } catch (error) {
      console.error('Error fetching datasets:', error);
      dashboardData.datasets = [];
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      dashboardData.users = Array.isArray(data) ? data : (data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      dashboardData.users = [];
    }
  }

  async function fetchRoles() {
    try {
      const response = await fetch(`${API_URL}/roles`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      dashboardData.roles = await response.json();
    } catch (error) {
      console.error('Error fetching roles:', error);
      dashboardData.roles = [];
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch(`${API_URL}/activity-logs`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      const logs = await response.json();
      
      dashboardData.activities = logs.map(log => ({
        id: log.id,
        type: determineActivityType(log.action || log.type),
        title: log.action || log.message,
        description: log.details || log.message,
        module: log.module || 'System',
        timestamp: new Date(log.timestamp),
        user: log.adminid
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      dashboardData.activities = [];
    }
  }

  async function fetchFeedback() {
    try {
      const response = await fetch(`${API_URL}/feedback`);
      if (!response.ok) throw new Error('Failed to fetch feedback');
      dashboardData.feedback = await response.json();
    } catch (error) {
      console.error('Error fetching feedback:', error);
      dashboardData.feedback = [];
    }
  }

  async function fetchStorageInfo() {
    try {
      const totalSize = dashboardData.datasets.reduce((sum, ds) => 
        sum + (ds.file_size || 0), 0
      );
      dashboardData.storageInfo = {
        used: totalSize,
        total: 100 * 1024 * 1024 * 1024
      };
    } catch (error) {
      console.error('Error calculating storage:', error);
    }
  }

  // ============ METRICS UPDATE - ALL TABS ============

  function updateAllMetrics() {
    // Data Management Metrics
    updateTotalDatasets();
    updateRecentUploads();
    updateRepositoryFiles();
    updateStorageUsage();
    updateLastUpload();
    updateUploadInsights();
    updateAnalyticsSnapshot();
    
    // User Management Metrics
    updateUserMetrics();
    
    // Role Management Metrics
    updateRoleMetrics();
    
    // Feedback Metrics
    updateFeedbackMetrics();
    
    // System Metrics
    updateNotificationBadge();
    updateSystemHealth();
  }

  // DATA MANAGEMENT METRICS
  function updateTotalDatasets() {
    const element = document.getElementById('totalDatasets');
    if (element) animateValue(element, 0, dashboardData.datasets.length, 1000);
  }

  function updateRecentUploads() {
    const now = new Date();
    const last24h = dashboardData.datasets.filter(ds => {
      const uploadTime = new Date(ds.uploaded_at || ds.created_at);
      return (now - uploadTime) <= 24 * 60 * 60 * 1000;
    });
    
    const element = document.getElementById('recentUploads');
    if (element) animateValue(element, 0, last24h.length, 1000);
  }

  function updateRepositoryFiles() {
    const element = document.getElementById('repositoryFiles');
    if (element) animateValue(element, 0, dashboardData.datasets.length, 1000);
  }

  function updateStorageUsage() {
    const usedGB = (dashboardData.storageInfo.used / (1024 * 1024 * 1024)).toFixed(2);
    const totalGB = (dashboardData.storageInfo.total / (1024 * 1024 * 1024)).toFixed(0);
    const percentage = ((dashboardData.storageInfo.used / dashboardData.storageInfo.total) * 100).toFixed(1);

    const usedEl = document.getElementById('storageUsed');
    const subtextEl = document.getElementById('storageSubtext');
    const fillEl = document.getElementById('storageFill');

    if (usedEl) usedEl.textContent = `${usedGB} GB`;
    if (subtextEl) subtextEl.textContent = `of ${totalGB}GB`;
    if (fillEl) fillEl.style.width = `${percentage}%`;

    if (percentage > 90) {
      addNotification({
        type: 'error',
        title: 'Storage Critical',
        message: `Storage is ${percentage}% full. Immediate action required.`
      });
    } else if (percentage > 75) {
      addNotification({
        type: 'warning',
        title: 'Storage Warning',
        message: `Storage is ${percentage}% full.`
      });
    }
  }

  function updateLastUpload() {
    const timeEl = document.getElementById('lastUploadTime');
    const nameEl = document.getElementById('lastUploadName');
    
    if (!timeEl || !nameEl) return;

    if (dashboardData.datasets.length === 0) {
      timeEl.textContent = 'Never';
      nameEl.textContent = 'No recent uploads';
      return;
    }

    const sorted = [...dashboardData.datasets].sort((a, b) => 
      new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at)
    );

    const latest = sorted[0];
    timeEl.textContent = formatTimeAgo(new Date(latest.uploaded_at || latest.created_at));
    nameEl.textContent = latest.filename || latest.file_name || 'Unknown file';
  }

  function updateUploadInsights() {
    const now = new Date();
    const last7days = dashboardData.datasets.filter(ds => {
      const diff = now - new Date(ds.uploaded_at || ds.created_at);
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const previous7days = dashboardData.datasets.filter(ds => {
      const diff = now - new Date(ds.uploaded_at || ds.created_at);
      return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000;
    }).length;

    const trendIcon = document.getElementById('trendIcon');
    const trendText = document.getElementById('uploadTrend');
    
    if (!trendIcon || !trendText) return;

    if (last7days > previous7days) {
      trendText.textContent = `Increasing - ${last7days} uploads this week`;
      trendIcon.className = 'insight-icon trending';
      trendIcon.innerHTML = '<i class="fas fa-arrow-up"></i>';
    } else if (last7days < previous7days) {
      trendText.textContent = `Decreasing - ${last7days} uploads this week`;
      trendIcon.className = 'insight-icon trending down';
      trendIcon.innerHTML = '<i class="fas fa-arrow-down"></i>';
    } else {
      trendText.textContent = `Stable - ${last7days} uploads this week`;
      trendIcon.className = 'insight-icon trending stable';
      trendIcon.innerHTML = '<i class="fas fa-minus"></i>';
    }

    // Most recent dataset
    const recentNameEl = document.getElementById('recentDatasetName');
    if (recentNameEl && dashboardData.datasets.length > 0) {
      const sorted = [...dashboardData.datasets].sort((a, b) => 
        new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at)
      );
      recentNameEl.textContent = sorted[0].filename || sorted[0].file_name || 'Unknown';
    }

    // File type breakdown
    const fileTypes = {};
    dashboardData.datasets.forEach(ds => {
      const ext = (ds.file_name || ds.filename || '').split('.').pop().toLowerCase();
      const type = ext === 'csv' ? 'CSV' : ext === 'xlsx' || ext === 'xls' ? 'Excel' : 'JSON';
      fileTypes[type] = (fileTypes[type] || 0) + 1;
    });

    const breakdownEl = document.getElementById('fileTypeBreakdown');
    if (breakdownEl) {
      breakdownEl.innerHTML = Object.entries(fileTypes).map(([type, count]) => `
        <div class="file-type-item">
          <div class="file-type-info">
            <div class="file-type-icon ${type.toLowerCase()}">
              <i class="fas fa-file-${type === 'CSV' ? 'csv' : type === 'Excel' ? 'excel' : 'code'}"></i>
            </div>
            <span class="file-type-name">${type}</span>
          </div>
          <span class="file-type-count">${count}</span>
        </div>
      `).join('') || '<p style="color: #a0aec0;">No files uploaded yet</p>';
    }
  }

  function updateAnalyticsSnapshot() {
    const countEl = document.getElementById('analyticsCount');
    const timeEl = document.getElementById('lastReportTime');
    const nameEl = document.getElementById('recentReportName');
    const insightEl = document.getElementById('analyticsInsight');

    if (countEl) countEl.textContent = dashboardData.datasets.length;

    if (dashboardData.datasets.length > 0) {
      const sorted = [...dashboardData.datasets].sort((a, b) => 
        new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at)
      );
      
      const latest = sorted[0];
      if (timeEl) timeEl.textContent = formatTimeAgo(new Date(latest.uploaded_at || latest.created_at));
      if (nameEl) nameEl.textContent = latest.filename || latest.file_name || 'Unknown';

      const avgSize = dashboardData.datasets.reduce((sum, r) => sum + (r.file_size || 0), 0) / 
                      dashboardData.datasets.length;
      const avgSizeMB = (avgSize / (1024 * 1024)).toFixed(2);
      
      if (insightEl) {
        insightEl.innerHTML = `
          <i class="fas fa-lightbulb"></i>
          <p>System has ${dashboardData.datasets.length} datasets (avg ${avgSizeMB}MB). 
          ${dashboardData.datasets.length > 5 ? 'Excellent data volume!' : 'Upload more for better insights.'}</p>
        `;
      }
    } else {
      if (timeEl) timeEl.textContent = 'N/A';
      if (nameEl) nameEl.textContent = 'No reports available';
      if (insightEl) {
        insightEl.innerHTML = `
          <i class="fas fa-lightbulb"></i>
          <p>Upload your first dataset to start analytics.</p>
        `;
      }
    }
  }

  // USER MANAGEMENT METRICS
  function updateUserMetrics() {
    const totalUsers = dashboardData.users.length;
    const activeUsers = dashboardData.users.filter(u => u.status === 'active').length;
    const inactiveUsers = dashboardData.users.filter(u => u.status === 'inactive').length;
    const suspendedUsers = dashboardData.users.filter(u => u.status === 'suspended').length;
    
    const elements = {
      total: document.getElementById('metricTotalUsers'),
      active: document.getElementById('metricActiveUsers'),
      inactive: document.getElementById('metricInactiveUsers'),
      suspended: document.getElementById('metricSuspendedUsers')
    };
    
    if (elements.total) animateValue(elements.total, 0, totalUsers, 1000);
    if (elements.active) animateValue(elements.active, 0, activeUsers, 1000);
    if (elements.inactive) animateValue(elements.inactive, 0, inactiveUsers, 1000);
    if (elements.suspended) animateValue(elements.suspended, 0, suspendedUsers, 1000);

    // Check for inactive user warnings
    if (inactiveUsers > 5) {
      addNotification({
        type: 'warning',
        title: 'Inactive Users Alert',
        message: `${inactiveUsers} inactive users. Review user accounts.`
      });
    }

    if (suspendedUsers > 0) {
      addNotification({
        type: 'info',
        title: 'Suspended Users',
        message: `${suspendedUsers} users currently suspended.`
      });
    }
  }

  // ROLE MANAGEMENT METRICS
  function updateRoleMetrics() {
    const totalRoles = dashboardData.roles.length;
    const systemRoles = dashboardData.roles.filter(r => r.is_system).length;
    const customRoles = totalRoles - systemRoles;
    
    const rolesWithUsers = dashboardData.roles.filter(r => r.user_count > 0).length;
    const emptyRoles = totalRoles - rolesWithUsers;
    
    const elements = {
      total: document.getElementById('metricTotalRoles'),
      system: document.getElementById('metricSystemRoles'),
      custom: document.getElementById('metricCustomRoles'),
      empty: document.getElementById('metricEmptyRoles')
    };
    
    if (elements.total) animateValue(elements.total, 0, totalRoles, 1000);
    if (elements.system) animateValue(elements.system, 0, systemRoles, 1000);
    if (elements.custom) animateValue(elements.custom, 0, customRoles, 1000);
    if (elements.empty) animateValue(elements.empty, 0, emptyRoles, 1000);

    // Alert for empty roles
    if (emptyRoles > 3) {
      addNotification({
        type: 'info',
        title: 'Unused Roles',
        message: `${emptyRoles} roles have no users assigned.`
      });
    }
  }

  // FEEDBACK METRICS
  function updateFeedbackMetrics() {
    const totalFeedback = dashboardData.feedback.length;
    const pending = dashboardData.feedback.filter(f => f.status === 'pending').length;
    const resolved = dashboardData.feedback.filter(f => f.status === 'resolved').length;
    const inProgress = dashboardData.feedback.filter(f => f.status === 'in_progress').length;
    
    const elements = {
      total: document.getElementById('metricTotalFeedback'),
      pending: document.getElementById('metricPendingFeedback'),
      resolved: document.getElementById('metricResolvedFeedback'),
      inProgress: document.getElementById('metricInProgressFeedback')
    };
    
    if (elements.total) animateValue(elements.total, 0, totalFeedback, 1000);
    if (elements.pending) animateValue(elements.pending, 0, pending, 1000);
    if (elements.resolved) animateValue(elements.resolved, 0, resolved, 1000);
    if (elements.inProgress) animateValue(elements.inProgress, 0, inProgress, 1000);

    // Alert for pending feedback
    if (pending > 10) {
      addNotification({
        type: 'warning',
        title: 'Pending Feedback',
        message: `${pending} feedback items need attention.`
      });
    }
  }

  // SYSTEM HEALTH
  function updateSystemHealth() {
    const statusEl = document.getElementById('systemStatus');
    if (!statusEl) return;

    const isHealthy = dashboardData.datasets.length > 0 && dashboardData.users.length > 0;
    
    if (isHealthy) {
      statusEl.innerHTML = `
        <div class="status-dot operational"></div>
        <div class="status-text">
          <span class="status-label">System Status</span>
          <span class="status-value">Operational</span>
        </div>
      `;
    } else {
      statusEl.innerHTML = `
        <div class="status-dot maintenance"></div>
        <div class="status-text">
          <span class="status-label">System Status</span>
          <span class="status-value">Needs Attention</span>
        </div>
      `;
    }
  }

  // ============ ACTIVITIES ============

  function renderActivities(filter = 'all', timeFilter = 'all') {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    let activities = [...dashboardData.activities];

    if (filter !== 'all') {
      activities = activities.filter(a => a.type === filter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      activities = activities.filter(a => {
        const diff = now - a.timestamp;
        const days = diff / (1000 * 60 * 60 * 24);
        
        if (timeFilter === 'today') return days < 1;
        if (timeFilter === 'week') return days < 7;
        if (timeFilter === 'month') return days < 30;
        return true;
      });
    }

    activities.sort((a, b) => b.timestamp - a.timestamp);
    const displayActivities = activities.slice(0, 8);

    if (displayActivities.length === 0) {
      activityList.innerHTML = `
        <div class="empty-activities">
          <i class="fas fa-inbox"></i>
          <h4>No activities yet</h4>
          <p>System activities will appear here</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = displayActivities.map(activity => `
      <div class="activity-item ${activity.type}">
        <div class="activity-icon">
          ${getActivityIcon(activity.type)}
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-meta">
            <span class="activity-module">
              <i class="fas fa-tag"></i>
              ${activity.module}
            </span>
            <span class="activity-time">
              <i class="far fa-clock"></i>
              ${formatTimeAgo(activity.timestamp)}
            </span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ============ NOTIFICATIONS ============

  function renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    
    checkSystemNotifications();

    if (dashboardData.notifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="no-notifications">
          <i class="fas fa-check-circle"></i>
          <p>All systems operational</p>
        </div>
      `;
      return;
    }

    notificationsList.innerHTML = dashboardData.notifications.map(notif => `
      <div class="notification-item ${notif.type}">
        <div class="notification-icon">
          ${getNotificationIcon(notif.type)}
        </div>
        <div class="notification-content">
          <div class="notification-title">${notif.title}</div>
          <div class="notification-message">${notif.message}</div>
        </div>
      </div>
    `).join('');
  }

  function checkSystemNotifications() {
    dashboardData.notifications = [];

    // Data checks
    if (dashboardData.datasets.length === 0) {
      addNotification({
        type: 'info',
        title: 'No Data',
        message: 'Upload datasets to enable analytics.'
      });
    }

    // User checks
    const inactiveUsers = dashboardData.users.filter(u => u.status === 'inactive').length;
    if (inactiveUsers > 5) {
      addNotification({
        type: 'warning',
        title: `${inactiveUsers} Inactive Users`,
        message: 'Review and update user accounts.'
      });
    }

    // Feedback checks
    const pendingFeedback = dashboardData.feedback.filter(f => f.status === 'pending').length;
    if (pendingFeedback > 10) {
      addNotification({
        type: 'warning',
        title: `${pendingFeedback} Pending Feedback`,
        message: 'Respond to user feedback.'
      });
    }

    // Activity check
    const recentActivity = dashboardData.activities.filter(a => {
      const diff = new Date() - a.timestamp;
      return diff <= 7 * 24 * 60 * 60 * 1000;
    });

    if (recentActivity.length === 0 && dashboardData.datasets.length > 0) {
      addNotification({
        type: 'info',
        title: 'Low Activity',
        message: 'No system activity in 7 days.'
      });
    }

    // Success
    if (dashboardData.datasets.length > 0 && recentActivity.length > 0) {
      addNotification({
        type: 'success',
        title: 'System Healthy',
        message: 'All systems normal.'
      });
    }
  }

  function addNotification(notification) {
    const exists = dashboardData.notifications.some(n => 
      n.title === notification.title && n.type === notification.type
    );
    if (!exists) {
      dashboardData.notifications.push(notification);
    }
  }

  function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const count = dashboardData.notifications.filter(n => 
      n.type === 'error' || n.type === 'warning'
    ).length;
    
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
  }

  // ============ AUTO REFRESH ============

  function startAutoRefresh() {
    refreshInterval = setInterval(async () => {
      await fetchActivities();
      renderActivities();
      updateLastSync();
    }, 60000);
  }

  function updateLastSync() {
    const el = document.getElementById('lastSync');
    if (el) el.textContent = formatTimeAgo(new Date());
  }

  // ============ EVENT LISTENERS ============

  function attachEventListeners() {
    const viewAllBtn = document.getElementById('viewAllActivitiesBtn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', openActivityModal);
    }

    const closeModalBtn = document.getElementById('closeActivityModal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeActivityModal);
    }

    const overlay = document.querySelector('#activityModal .modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', closeActivityModal);
    }

    const typeFilter = document.getElementById('activityTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        const timeFilter = document.getElementById('activityTimeFilter').value;
        renderAllActivities(e.target.value, timeFilter);
      });
    }

    const timeFilter = document.getElementById('activityTimeFilter');
    if (timeFilter) {
      timeFilter.addEventListener('change', (e) => {
        const typeFilter = document.getElementById('activityTypeFilter').value;
        renderAllActivities(typeFilter, e.target.value);
      });
    }

    const vizBtn = document.getElementById('generateVisualizationBtn');
    if (vizBtn) {
      vizBtn.addEventListener('click', () => {
        if (dashboardData.datasets.length === 0) {
          showToast('Upload data first', 'warning');
        } else {
          window.location.href = './analyticsDashboard.html';
        }
      });
    }
  }

  function openActivityModal() {
    const modal = document.getElementById('activityModal');
    if (modal) {
      modal.classList.add('active');
      renderAllActivities();
    }
  }

  function closeActivityModal() {
    const modal = document.getElementById('activityModal');
    if (modal) modal.classList.remove('active');
  }

  function renderAllActivities(filter = 'all', timeFilter = 'all') {
    const modalList = document.getElementById('modalActivityList');
    if (!modalList) return;
    
    let activities = [...dashboardData.activities];

    if (filter !== 'all') {
      activities = activities.filter(a => a.type === filter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      activities = activities.filter(a => {
        const diff = now - a.timestamp;
        const days = diff / (1000 * 60 * 60 * 24);
        
        if (timeFilter === 'today') return days < 1;
        if (timeFilter === 'week') return days < 7;
        if (timeFilter === 'month') return days < 30;
        return true;
      });
    }

    activities.sort((a, b) => b.timestamp - a.timestamp);

    if (activities.length === 0) {
      modalList.innerHTML = `
        <div class="empty-activities">
          <i class="fas fa-inbox"></i>
          <h4>No activities found</h4>
          <p>Try adjusting filters</p>
        </div>
      `;
      return;
    }

    modalList.innerHTML = activities.map(activity => `
      <div class="activity-item ${activity.type}">
        <div class="activity-icon">
          ${getActivityIcon(activity.type)}
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-meta">
            <span class="activity-module">
              <i class="fas fa-tag"></i>
              ${activity.module}
            </span>
            <span class="activity-time">
              <i class="far fa-clock"></i>
              ${formatTimeAgo(activity.timestamp)}
            </span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ============ UTILITY FUNCTIONS ============

  function updateDateTime() {
    const el = document.getElementById('currentDateTime');
    if (!el) return;
    
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    el.textContent = now.toLocaleDateString('en-US', options);
  }

  function animateValue(element, start, end, duration) {
    if (!element) return;
    
    element.innerHTML = '';
    
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

  function determineActivityType(action) {
    const lower = (action || '').toLowerCase();
    if (lower.includes('upload')) return 'upload';
    if (lower.includes('report') || lower.includes('analytics')) return 'report';
    if (lower.includes('repository') || lower.includes('file')) return 'repository';
    if (lower.includes('chart') || lower.includes('visualization')) return 'visualization';}
  })