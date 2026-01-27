// secondaryDashboard.js - Backup SuperAdmin Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  const currentAdminId = localStorage.getItem('adminid');
  
  // Verify this is a backup superadmin
  await verifyBackupSuperAdmin();
  
  let dashboardData = {
    users: [],
    roles: [],
    feedback: [],
    myActions: []
  };

  initializeProfileDropdown();
  await initializeDashboard();

  async function verifyBackupSuperAdmin() {
    try {
      const response = await fetch(`${API_URL}/admin-accounts`);
      const data = await response.json();
      
      const currentUser = data.admins.find(a => a.adminid === currentAdminId);
      
      if (!currentUser) {
        alert('User not found. Redirecting to login.');
        window.location.href = '/private/html/AdminLogin/login.html';
        return;
      }

      // Check if user has Assistant Super Administrator role
      if (currentUser.role_name !== 'Assistant Super Administrator') {
        alert('Access Denied: This page is for Assistant Super Administrator only.');
        window.location.href = '/private/html/AdminLogin/login.html';
        return;
      }

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

      console.log('✅ Backup SuperAdmin verified:', currentAdminId);
      
    } catch (error) {
      console.error('❌ Verification error:', error);
      alert('Failed to verify access. Please try again.');
      window.location.href = '/private/html/AdminLogin/login.html';
    }
  }

  async function initializeDashboard() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    try {
      await loadAllData();
      updateMetrics();
      renderRecentActions();
      
      console.log('✅ Backup SuperAdmin Dashboard initialized');
    } catch (error) {
      console.error('❌ Dashboard initialization error:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  }

  async function loadAllData() {
    try {
      // Load users
      const usersResponse = await fetch(`${API_URL}/admin-accounts`);
      const usersData = await usersResponse.json();
      dashboardData.users = usersData.admins || [];

      // Load roles
      const rolesResponse = await fetch(`${API_URL}/roles`);
      dashboardData.roles = await rolesResponse.json();

      // Load feedback
      try {
        const feedbackResponse = await fetch(`${API_URL}/feedback/director/analytics`);
        const feedbackData = await feedbackResponse.json();
        dashboardData.feedback = feedbackData.analytics || [];
      } catch (err) {
        console.log('No feedback data available');
        dashboardData.feedback = [];
      }

      // Load my action logs
      await loadMyActions();

    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  async function loadMyActions() {
    try {
      const response = await fetch(`${API_URL}/superadmin-actions?adminid=${currentAdminId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        dashboardData.myActions = data.actions || [];
      }
    } catch (error) {
      console.error('Error loading action logs:', error);
      dashboardData.myActions = [];
    }
  }

  function updateMetrics() {
    const totalUsers = dashboardData.users.length;
    const activeUsers = dashboardData.users.filter(u => u.status === 'active').length;
    const totalRoles = dashboardData.roles.length;
    
    let pendingFeedback = 0;
    dashboardData.feedback.forEach(dept => {
      // Count low ratings or pending items
      if (dept.low_rating_count) {
        pendingFeedback += dept.low_rating_count;
      }
    });

    animateValue(document.getElementById('totalUsers'), 0, totalUsers, 1000);
    animateValue(document.getElementById('activeUsers'), 0, activeUsers, 1000);
    animateValue(document.getElementById('totalRoles'), 0, totalRoles, 1000);
    animateValue(document.getElementById('pendingFeedback'), 0, pendingFeedback, 1000);

    // Update notification badge
    const notifBadge = document.getElementById('notificationBadge');
    if (notifBadge) {
      notifBadge.textContent = pendingFeedback;
      notifBadge.style.display = pendingFeedback > 0 ? 'block' : 'none';
    }
  }

  function renderRecentActions() {
    const container = document.getElementById('recentActionsList');
    
    if (!container) return;

    if (dashboardData.myActions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No actions recorded yet</p>
          <small>Your administrative actions will appear here</small>
        </div>
      `;
      return;
    }

    container.innerHTML = dashboardData.myActions.map(action => `
      <div class="action-item">
        <div class="action-icon ${getActionTypeClass(action.action_type)}">
          <i class="${getActionIcon(action.action_type)}"></i>
        </div>
        <div class="action-content">
          <div class="action-title">${action.action_type}</div>
          <div class="action-details">${action.details || 'No details'}</div>
          ${action.target_user ? `<div class="action-target">Target: ${action.target_user}</div>` : ''}
          <div class="action-time">
            <i class="far fa-clock"></i>
            ${formatTimeAgo(new Date(action.created_at))}
          </div>
        </div>
      </div>
    `).join('');
  }

  function getActionTypeClass(actionType) {
    const type = actionType.toLowerCase();
    if (type.includes('create')) return 'create';
    if (type.includes('edit') || type.includes('update')) return 'edit';
    if (type.includes('delete') || type.includes('disable')) return 'delete';
    if (type.includes('assign')) return 'assign';
    return 'default';
  }

  function getActionIcon(actionType) {
    const type = actionType.toLowerCase();
    if (type.includes('create')) return 'fas fa-plus-circle';
    if (type.includes('edit') || type.includes('update')) return 'fas fa-edit';
    if (type.includes('delete')) return 'fas fa-trash';
    if (type.includes('disable')) return 'fas fa-ban';
    if (type.includes('assign')) return 'fas fa-user-tag';
    return 'fas fa-info-circle';
  }

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

  function showToast(message, type = 'info') {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);

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
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, 4000);
  }
});