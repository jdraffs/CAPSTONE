// /private/js/admin/adminCMO/cmoDashboard.js - UPGRADED VERSION

const API_BASE = 'http://localhost:3000/api/news';

// DOM Elements
const totalNewsEl = document.getElementById('totalNews');
const publishedNewsEl = document.getElementById('publishedNews');
const trashedNewsEl = document.getElementById('trashedNews');
const recentNewsEl = document.getElementById('recentNews');
const recentNewsGrid = document.getElementById('recentNewsGrid');

// Quick Nav Counts
const navManageCount = document.getElementById('navManageCount');
const navPublishedCount = document.getElementById('navPublishedCount');
const navTrashCount = document.getElementById('navTrashCount');

let dashboardData = {
  published: [],
  trashed: [],
  notifications: []
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  loadDashboardStats();
  updateLastSync();
  setInterval(updateLastSync, 60000);
  initializeProfileDropdown();
});

// Update date and time
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

// Update last sync time
function updateLastSync() {
  const el = document.getElementById('lastSync');
  if (el) el.textContent = 'Just now';
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Format time ago
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

// Calculate news from this month
function isThisMonth(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  return date.getMonth() === now.getMonth() && 
         date.getFullYear() === now.getFullYear();
}

// Animate counting numbers
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

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Fetch published posts
    const publishedRes = await fetch(`${API_BASE}/posts`);
    const publishedData = await publishedRes.json();

    // Fetch trashed posts
    const trashedRes = await fetch(`${API_BASE}/trash`);
    const trashedData = await trashedRes.json();

    dashboardData.published = publishedData.success ? publishedData.posts : [];
    dashboardData.trashed = trashedData.success ? trashedData.posts : [];

    // Calculate statistics
    const totalCount = dashboardData.published.length + dashboardData.trashed.length;
    const publishedCount = dashboardData.published.length;
    const trashedCount = dashboardData.trashed.length;
    const recentCount = dashboardData.published.filter(post => isThisMonth(post.created_at)).length;

    // Update stats with animation
    animateValue(totalNewsEl, 0, totalCount, 1000);
    animateValue(publishedNewsEl, 0, publishedCount, 1000);
    animateValue(trashedNewsEl, 0, trashedCount, 1000);
    animateValue(recentNewsEl, 0, recentCount, 1000);

    // Update quick nav counts
    if (navManageCount) navManageCount.textContent = totalCount;
    if (navPublishedCount) navPublishedCount.textContent = publishedCount;
    if (navTrashCount) navTrashCount.textContent = trashedCount;

    // Load recent news articles
    loadRecentNews(dashboardData.published);

    // Update publishing insights
    updatePublishingInsights();

    // Update notifications
    updateNotifications();

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    
    // Show error in stats
    totalNewsEl.textContent = '-';
    publishedNewsEl.textContent = '-';
    trashedNewsEl.textContent = '-';
    recentNewsEl.textContent = '-';
    
    // Show error in recent news
    recentNewsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-exclamation-triangle"></i>
        <h4>Error Loading Data</h4>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

// Load recent news articles
function loadRecentNews(posts) {
  recentNewsGrid.innerHTML = '';

  if (posts.length === 0) {
    recentNewsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-newspaper"></i>
        <h4>No News Articles Yet</h4>
        <p>Start by creating your first news article.</p>
      </div>
    `;
    return;
  }

  // Show latest 6 articles
  const recentPosts = posts.slice(0, 6);

  recentPosts.forEach(post => {
    const newsItem = document.createElement('div');
    newsItem.className = 'news-item';
    newsItem.dataset.id = post.id;

    newsItem.innerHTML = `
      <div class="news-icon">
        <i class="fa fa-newspaper"></i>
      </div>
      <div class="news-content">
        <h4 class="news-title">${post.title}</h4>
        <div class="news-meta">
          <span><i class="fa fa-calendar"></i> ${formatDate(post.created_at)}</span>
          <span><i class="fa fa-clock"></i> ${formatTimeAgo(new Date(post.created_at))}</span>
        </div>
      </div>
    `;

    // Click handler to go to news management page
    newsItem.addEventListener('click', () => {
      window.location.href = '/private/html/adminPages/adminCMO/news-management.html';
    });

    recentNewsGrid.appendChild(newsItem);
  });
}

// Update publishing insights
function updatePublishingInsights() {
  const now = new Date();
  
  // Calculate this week vs last week
  const thisWeekPosts = dashboardData.published.filter(post => {
    const diff = now - new Date(post.created_at);
    return diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const lastWeekPosts = dashboardData.published.filter(post => {
    const diff = now - new Date(post.created_at);
    return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000;
  }).length;

  const trendIcon = document.getElementById('trendIcon');
  const trendText = document.getElementById('publishingTrend');
  
  if (trendIcon && trendText) {
    if (thisWeekPosts > lastWeekPosts) {
      trendText.textContent = `Increasing - ${thisWeekPosts} articles this week`;
      trendIcon.className = 'insight-icon trending';
      trendIcon.innerHTML = '<i class="fas fa-arrow-up"></i>';
    } else if (thisWeekPosts < lastWeekPosts) {
      trendText.textContent = `Decreasing - ${thisWeekPosts} articles this week`;
      trendIcon.className = 'insight-icon trending down';
      trendIcon.innerHTML = '<i class="fas fa-arrow-down"></i>';
    } else {
      trendText.textContent = `Stable - ${thisWeekPosts} articles this week`;
      trendIcon.className = 'insight-icon trending stable';
      trendIcon.innerHTML = '<i class="fas fa-minus"></i>';
    }
  }

  // Last published time
  const lastPublishedEl = document.getElementById('lastPublishedTime');
  if (lastPublishedEl && dashboardData.published.length > 0) {
    const sorted = [...dashboardData.published].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    lastPublishedEl.textContent = formatTimeAgo(new Date(sorted[0].created_at));
  } else if (lastPublishedEl) {
    lastPublishedEl.textContent = 'No recent posts';
  }

  // Publishing insight message
  const insightEl = document.getElementById('publishingInsight');
  if (insightEl) {
    if (dashboardData.published.length === 0) {
      insightEl.innerHTML = `
        <i class="fas fa-lightbulb"></i>
        <p>Start publishing articles to engage with your audience and keep them informed.</p>
      `;
    } else if (thisWeekPosts === 0) {
      insightEl.innerHTML = `
        <i class="fas fa-lightbulb"></i>
        <p>No articles published this week. Consider creating fresh content to maintain engagement.</p>
      `;
    } else if (thisWeekPosts > lastWeekPosts) {
      insightEl.innerHTML = `
        <i class="fas fa-lightbulb"></i>
        <p>Great momentum! You've published ${thisWeekPosts} articles this week, up from ${lastWeekPosts} last week.</p>
      `;
    } else {
      insightEl.innerHTML = `
        <i class="fas fa-lightbulb"></i>
        <p>You have ${dashboardData.published.length} total articles published. Keep up the great work!</p>
      `;
    }
  }
}

// Update notifications
function updateNotifications() {
  const notificationsList = document.getElementById('notificationsList');
  const notificationBadge = document.getElementById('notificationBadge');
  
  if (!notificationsList) return;

  dashboardData.notifications = [];

  // Check for no articles
  if (dashboardData.published.length === 0) {
    dashboardData.notifications.push({
      type: 'info',
      title: 'No Published Articles',
      message: 'Start creating content to engage with your audience.'
    });
  }

  // Check for old content
  const now = new Date();
  const oldArticles = dashboardData.published.filter(post => {
    const diff = now - new Date(post.created_at);
    return diff > 30 * 24 * 60 * 60 * 1000;
  });

  if (oldArticles.length > 5) {
    dashboardData.notifications.push({
      type: 'warning',
      title: 'Outdated Content',
      message: `${oldArticles.length} articles are over a month old. Consider updating or archiving.`
    });
  }

  // Check for trash items
  if (dashboardData.trashed.length > 10) {
    dashboardData.notifications.push({
      type: 'info',
      title: 'Trash Full',
      message: `${dashboardData.trashed.length} items in trash. Consider permanent deletion.`
    });
  }

  // Success message
  if (dashboardData.published.length > 0 && dashboardData.notifications.length === 0) {
    dashboardData.notifications.push({
      type: 'success',
      title: 'System Healthy',
      message: 'All systems operational. Keep up the great work!'
    });
  }

  // Render notifications
  if (dashboardData.notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="no-notifications">
        <i class="fas fa-check-circle"></i>
        <p>All systems operational</p>
      </div>
    `;
  } else {
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

  // Update badge
  const alertCount = dashboardData.notifications.filter(n => 
    n.type === 'error' || n.type === 'warning'
  ).length;
  
  if (notificationBadge) {
    notificationBadge.textContent = alertCount;
    notificationBadge.style.display = alertCount > 0 ? 'block' : 'none';
  }
}

// Get notification icon
function getNotificationIcon(type) {
  const icons = {
    success: '<i class="fas fa-check-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
    error: '<i class="fas fa-times-circle"></i>',
    info: '<i class="fas fa-info-circle"></i>'
  };
  return icons[type] || icons.info;
}