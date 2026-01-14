// superAdminDashboard.js - Enhanced Dashboard with Real-time Updates

document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  initializeProfileDropdown();
  
  let dashboardData = {
    datasets: [],
    reports: [],
    activities: [],
    notifications: [],
    storageInfo: { used: 0, total: 100 * 1024 * 1024 * 1024 } // 100GB default
  };

  let refreshInterval;

  // Initialize Dashboard
  await initializeDashboard();

  async function initializeDashboard() {
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update every second

    await loadDashboardData();
    startAutoRefresh();
    attachEventListeners();
  }

  // ============ DATA LOADING ============

  async function loadDashboardData() {
    try {
      await Promise.all([
        fetchDatasets(),
        fetchActivities(),
        fetchStorageInfo()
      ]);

      updateAllMetrics();
      renderActivities();
      renderNotifications();
      updateLastSync();
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
      dashboardData.reports = dashboardData.datasets; // Reports are same as datasets for now
    } catch (error) {
      console.error('Error fetching datasets:', error);
      dashboardData.datasets = getMockDatasets();
      dashboardData.reports = dashboardData.datasets;
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch(`${API_URL}/activity-logs`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      const logs = await response.json();
      
      // Transform activity logs into dashboard activities
      dashboardData.activities = logs.map(log => ({
        id: log.id,
        type: determineActivityType(log.action),
        title: log.action,
        description: log.details,
        module: log.module || 'System',
        timestamp: new Date(log.timestamp),
        user: log.adminid
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      dashboardData.activities = getMockActivities();
    }
  }

  async function fetchStorageInfo() {
    try {
      const response = await fetch(`${API_URL}/storage-info`);
      if (!response.ok) throw new Error('Failed to fetch storage info');
      dashboardData.storageInfo = await response.json();
    } catch (error) {
      console.error('Error fetching storage info:', error);
      // Calculate from datasets
      const totalSize = dashboardData.datasets.reduce((sum, ds) => 
        sum + (ds.file_size || 0), 0
      );
      dashboardData.storageInfo = {
        used: totalSize,
        total: 100 * 1024 * 1024 * 1024 // 100GB
      };
    }
  }

  // ============ METRICS UPDATE ============

  function updateAllMetrics() {
    updateTotalDatasets();
    updateRecentUploads();
    updateTotalReports();
    updateRepositoryFiles();
    updateStorageUsage();
    updateLastUpload();
    updateUploadInsights();
    updateAnalyticsSnapshot();
    updateNotificationBadge();
  }

  function updateTotalDatasets() {
    const element = document.getElementById('totalDatasets');
    animateValue(element, 0, dashboardData.datasets.length, 1000);
  }

  function updateRecentUploads() {
    const now = new Date();
    const last24h = dashboardData.datasets.filter(ds => {
      const uploadTime = new Date(ds.uploaded_at || ds.created_at);
      const diff = now - uploadTime;
      return diff <= 24 * 60 * 60 * 1000; // 24 hours
    });
    
    const element = document.getElementById('recentUploads');
    animateValue(element, 0, last24h.length, 1000);
  }

  function updateTotalReports() {
    const element = document.getElementById('totalReports');
    animateValue(element, 0, dashboardData.reports.length, 1000);
  }

  function updateRepositoryFiles() {
    const element = document.getElementById('repositoryFiles');
    animateValue(element, 0, dashboardData.datasets.length, 1000);
  }

  function updateStorageUsage() {
    const usedGB = (dashboardData.storageInfo.used / (1024 * 1024 * 1024)).toFixed(2);
    const totalGB = (dashboardData.storageInfo.total / (1024 * 1024 * 1024)).toFixed(0);
    const percentage = ((dashboardData.storageInfo.used / dashboardData.storageInfo.total) * 100).toFixed(1);

    document.getElementById('storageUsed').textContent = `${usedGB} GB`;
    document.getElementById('storageSubtext').textContent = `of ${totalGB}GB`;
    document.getElementById('storageFill').style.width = `${percentage}%`;

    // Check storage warnings
    if (percentage > 90) {
      addNotification({
        type: 'error',
        title: 'Storage Critical',
        message: `Storage is ${percentage}% full. Consider freeing up space.`
      });
    } else if (percentage > 75) {
      addNotification({
        type: 'warning',
        title: 'Storage Warning',
        message: `Storage is ${percentage}% full. Running low on space.`
      });
    }
  }

  function updateLastUpload() {
    if (dashboardData.datasets.length === 0) {
      document.getElementById('lastUploadTime').textContent = 'Never';
      document.getElementById('lastUploadName').textContent = 'No uploads yet';
      return;
    }

    const sorted = [...dashboardData.datasets].sort((a, b) => 
      new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at)
    );

    const latest = sorted[0];
    const time = new Date(latest.uploaded_at || latest.created_at);
    
    document.getElementById('lastUploadTime').textContent = formatTimeAgo(time);
    document.getElementById('lastUploadName').textContent = latest.filename || latest.file_name || 'Unknown file';
  }

  function updateUploadInsights() {
    // Calculate upload trend
    const now = new Date();
    const last7days = dashboardData.datasets.filter(ds => {
      const uploadTime = new Date(ds.uploaded_at || ds.created_at);
      const diff = now - uploadTime;
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const previous7days = dashboardData.datasets.filter(ds => {
      const uploadTime = new Date(ds.uploaded_at || ds.created_at);
      const diff = now - uploadTime;
      return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000;
    }).length;

    let trendText = '';
    let trendIcon = document.getElementById('trendIcon');
    
    if (last7days > previous7days) {
      trendText = `Increasing activity - ${last7days} uploads this week`;
      trendIcon.className = 'insight-icon trending';
      trendIcon.innerHTML = '<i class="fas fa-arrow-up"></i>';
    } else if (last7days < previous7days) {
      trendText = `Decreasing activity - ${last7days} uploads this week`;
      trendIcon.className = 'insight-icon trending down';
      trendIcon.innerHTML = '<i class="fas fa-arrow-down"></i>';
    } else {
      trendText = `Stable activity - ${last7days} uploads this week`;
      trendIcon.className = 'insight-icon trending stable';
      trendIcon.innerHTML = '<i class="fas fa-minus"></i>';
    }

    document.getElementById('uploadTrend').textContent = trendText;

    // Most recent dataset
    if (dashboardData.datasets.length > 0) {
      const sorted = [...dashboardData.datasets].sort((a, b) => 
        new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at)
      );
      document.getElementById('recentDatasetName').textContent = 
        sorted[0].filename || sorted[0].file_name || 'Unknown';
    }

    // File type breakdown
    const fileTypes = {};
    dashboardData.datasets.forEach(ds => {
      const ext = (ds.file_name || ds.filename || '').split('.').pop().toLowerCase();
      const type = ext === 'csv' ? 'CSV' : ext === 'xlsx' || ext === 'xls' ? 'Excel' : 'JSON';
      fileTypes[type] = (fileTypes[type] || 0) + 1;
    });

    const breakdownEl = document.getElementById('fileTypeBreakdown');
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

  function updateAnalyticsSnapshot() {
    document.getElementById('analyticsCount').textContent = dashboardData.reports.length;

    if (dashboardData.reports.length > 0) {
      const sorted = [...dashboardData.reports].sort((a, b) => 
        new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at)
      );
      
      const latest = sorted[0];
      const time = new Date(latest.uploaded_at || latest.created_at);
      
      document.getElementById('lastReportTime').textContent = formatTimeAgo(time);
      document.getElementById('recentReportName').textContent = 
        latest.filename || latest.file_name || 'Unknown Report';

      // Generate insight
      const avgSize = dashboardData.reports.reduce((sum, r) => sum + (r.file_size || 0), 0) / 
                      dashboardData.reports.length;
      const avgSizeMB = (avgSize / (1024 * 1024)).toFixed(2);
      
      document.getElementById('analyticsInsight').innerHTML = `
        <i class="fas fa-lightbulb"></i>
        <p>Your system has processed ${dashboardData.reports.length} datasets with an average size of ${avgSizeMB}MB. 
        ${dashboardData.reports.length > 5 ? 'Great job maintaining regular data updates!' : 'Consider uploading more data for better insights.'}</p>
      `;
    } else {
      document.getElementById('lastReportTime').textContent = 'N/A';
      document.getElementById('recentReportName').textContent = 'No reports available';
      document.getElementById('analyticsInsight').innerHTML = `
        <i class="fas fa-lightbulb"></i>
        <p>Upload your first dataset to start generating analytics insights.</p>
      `;
    }
  }

  // ============ ACTIVITIES RENDERING ============

  function renderActivities(filter = 'all', timeFilter = 'all') {
    const activityList = document.getElementById('activityList');
    
    let activities = [...dashboardData.activities];

    // Apply filters
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

    // Sort by most recent
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to 8 for main view
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

  function renderAllActivities(filter = 'all', timeFilter = 'all') {
    const modalList = document.getElementById('modalActivityList');
    
    let activities = [...dashboardData.activities];

    // Apply filters
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
          <p>Try adjusting your filters</p>
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

  // ============ NOTIFICATIONS ============

  function renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    
    // Generate system notifications
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

    // Check if no datasets uploaded
    if (dashboardData.datasets.length === 0) {
      addNotification({
        type: 'info',
        title: 'No Data Available',
        message: 'Upload your first dataset to start generating analytics.'
      });
    }

    // Check if no recent activity
    const recentActivities = dashboardData.activities.filter(a => {
      const diff = new Date() - a.timestamp;
      return diff <= 7 * 24 * 60 * 60 * 1000;
    });

    if (recentActivities.length === 0 && dashboardData.datasets.length > 0) {
      addNotification({
        type: 'warning',
        title: 'Low Activity',
        message: 'No system activity in the past 7 days.'
      });
    }

    // Check storage (already done in updateStorageUsage)

    // Success message if all is well
    if (dashboardData.datasets.length > 0 && recentActivities.length > 0) {
      addNotification({
        type: 'success',
        title: 'System Healthy',
        message: 'All systems operating normally with regular activity.'
      });
    }
  }

  function addNotification(notification) {
    // Avoid duplicates
    const exists = dashboardData.notifications.some(n => 
      n.title === notification.title && n.type === notification.type
    );
    if (!exists) {
      dashboardData.notifications.push(notification);
    }
  }

  function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
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
    }, 60000); // Refresh every 60 seconds
  }

  function updateLastSync() {
    document.getElementById('lastSync').textContent = formatTimeAgo(new Date());
  }

  // ============ EVENT LISTENERS ============

  function attachEventListeners() {
    // View all activities
    document.getElementById('viewAllActivitiesBtn').addEventListener('click', openActivityModal);

    // Close activity modal
    document.getElementById('closeActivityModal').addEventListener('click', closeActivityModal);
    document.querySelector('#activityModal .modal-overlay').addEventListener('click', closeActivityModal);

    // Activity filters
    document.getElementById('activityTypeFilter').addEventListener('change', (e) => {
      const timeFilter = document.getElementById('activityTimeFilter').value;
      renderAllActivities(e.target.value, timeFilter);
    });

    document.getElementById('activityTimeFilter').addEventListener('change', (e) => {
      const typeFilter = document.getElementById('activityTypeFilter').value;
      renderAllActivities(typeFilter, e.target.value);
    });

    // Generate visualization button
    document.getElementById('generateVisualizationBtn').addEventListener('click', () => {
      if (dashboardData.datasets.length === 0) {
        showToast('Please upload data first before generating visualizations', 'warning');
      } else {
        window.location.href = './analyticsDashboard.html';
      }
    });
  }

  function openActivityModal() {
    document.getElementById('activityModal').classList.add('active');
    renderAllActivities();
  }

  function closeActivityModal() {
    document.getElementById('activityModal').classList.remove('active');
  }

  // ============ UTILITY FUNCTIONS ============

  function updateDateTime() {
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
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-US', options);
  }

  function animateValue(element, start, end, duration) {
    if (!element) return;
    
    element.innerHTML = ''; // Remove skeleton loader
    
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
    if (action.toLowerCase().includes('upload')) return 'upload';
    if (action.toLowerCase().includes('report') || action.toLowerCase().includes('analytics')) return 'report';
    if (action.toLowerCase().includes('repository') || action.toLowerCase().includes('file')) return 'repository';
    if (action.toLowerCase().includes('chart') || action.toLowerCase().includes('visualization')) return 'visualization';
    return 'upload';
  }

  function getActivityIcon(type) {
    const icons = {
      upload: '<i class="fas fa-cloud-upload-alt"></i>',
      report: '<i class="fas fa-chart-pie"></i>',
      repository: '<i class="fas fa-folder"></i>',
      visualization: '<i class="fas fa-chart-area"></i>'
    };
    return icons[type] || icons.upload;
  }

  function getNotificationIcon(type) {
    const icons = {
      info: '<i class="fas fa-info-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      success: '<i class="fas fa-check-circle"></i>'
    };
    return icons[type] || icons.info;
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

  // ============ MOCK DATA ============

  function getMockDatasets() {
    return [
      {
        id: 1,
        filename: 'enrollment_2025.xlsx',
        file_name: 'enrollment_2025.xlsx',
        file_size: 2048576,
        uploaded_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        filename: 'graduates_2024.csv',
        file_name: 'graduates_2024.csv',
        file_size: 1024576,
        uploaded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  function getMockActivities() {
    return [
      {
        id: 1,
        type: 'upload',
        title: 'Dataset Uploaded',
        description: 'enrollment_2025.xlsx uploaded successfully',
        module: 'Data Uploads',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 2,
        type: 'report',
        title: 'Analytics Report Generated',
        description: 'Enrollment trends report created',
        module: 'Analytics',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
});