// adminMila.js - Enhanced Dashboard with Optimized Loading & Audit Trail

const ADMIN_ID = 1; // Replace with actual admin ID from session
const ADMIN_NAME = 'AdminMila'; // Replace with actual admin name from session

// Dashboard state
let dashboardData = {
  scholarships: [],
  careers: [],
  certificates: [],
  recentActivity: [],
  allActivity: [] // Store all activity for audit trail
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setInterval(() => {
    updateDateTime();
    loadRecentActivity(); // Refresh activity feed
  }, 60000); // Refresh every minute
  initializeProfileDropdown();
});

// Main initialization - OPTIMIZED
async function initializeDashboard() {
  showLoading();
  
  try {
    // Load all data in parallel for faster loading
    const [scholarships, careers, certificates] = await Promise.all([
      loadScholarshipStats(),
      loadCareerStats(),
      loadCertificateStats()
    ]);
    
    // Load recent activity after data is loaded
    await loadRecentActivity();
    
    updateAllMetrics();
    hideLoading();
  } catch (err) {
    console.error('Error initializing dashboard:', err);
    showToast('Failed to load dashboard data', 'error');
    hideLoading();
  }
}

// ============================================
// SCHOLARSHIP STATISTICS
// ============================================

async function loadScholarshipStats() {
  try {
    const res = await fetch('http://localhost:3000/api/scholarships/all');
    const data = await res.json();

    if (data.success) {
      dashboardData.scholarships = data.scholarships;
      
      const total = data.scholarships.length;
      const open = data.scholarships.filter(s => s.status === 'open').length;
      const upcoming = data.scholarships.filter(s => s.status === 'upcoming').length;
      const closed = data.scholarships.filter(s => s.status === 'closed').length;
      
      document.getElementById('totalScholarships').textContent = total;
      document.getElementById('openScholarships').textContent = open;
      
      // Update detailed stats if elements exist
      updateElementText('upcomingScholarships', upcoming);
      updateElementText('closedScholarships', closed);
      
      // Calculate and display trends
      calculateScholarshipTrends(data.scholarships);
      
      return data.scholarships;
    }
  } catch (err) {
    console.error('Error loading scholarship stats:', err);
    return [];
  }
}

function calculateScholarshipTrends(scholarships) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentScholarships = scholarships.filter(s => 
    new Date(s.created_at) >= thirtyDaysAgo
  );
  
  updateElementText('recentScholarshipsCount', recentScholarships.length);
  
  // Upcoming deadlines (next 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = scholarships.filter(s => {
    const deadline = new Date(s.deadline);
    return deadline >= now && deadline <= sevenDaysFromNow && s.status === 'open';
  });
  
  updateElementText('upcomingDeadlinesCount', upcomingDeadlines.length);
}

// ============================================
// CAREER STATISTICS
// ============================================

async function loadCareerStats() {
  try {
    const res = await fetch('http://localhost:3000/api/career/organizations/all');
    const data = await res.json();

    if (data.success) {
      dashboardData.careers = data.organizations;
      
      const total = data.organizations.length;
      const active = data.organizations.filter(o => o.status === 'active').length;
      const inactive = data.organizations.filter(o => o.status === 'inactive').length;
      
      // Update career partner count
      document.getElementById('activeOrganizations').textContent = active;
      updateElementText('totalOrganizations', total);
      updateElementText('inactiveOrganizations', inactive);
      
      // Category breakdown
      calculateCareerBreakdown(data.organizations);
      
      return data.organizations;
    }
  } catch (err) {
    console.error('Error loading career stats:', err);
    return [];
  }
}

function calculateCareerBreakdown(organizations) {
  const categories = {
    'Government': 0,
    'University Unit': 0,
    'Private Company': 0
  };
  
  organizations.forEach(org => {
    if (categories.hasOwnProperty(org.category)) {
      categories[org.category]++;
    }
  });
  
  updateElementText('governmentOrgs', categories['Government']);
  updateElementText('universityOrgs', categories['University Unit']);
  updateElementText('privateOrgs', categories['Private Company']);
}

// ============================================
// CERTIFICATE STATISTICS
// ============================================

async function loadCertificateStats() {
  try {
    const res = await fetch('http://localhost:3000/api/certificate-requests/admin/stats');
    const data = await res.json();

    if (data.success) {
      const stats = data.stats;
      
      updateElementText('totalCertificateRequests', stats.total_requests || 0);
      updateElementText('pendingCertificates', stats.pending_count || 0);
      updateElementText('generatedCertificates', stats.generated_count || 0);
      updateElementText('printedCertificates', stats.printed_count || 0);
      updateElementText('releasedCertificates', stats.released_count || 0);
      
      // Calculate processing rate
      const total = stats.total_requests || 1;
      const completed = (stats.released_count || 0);
      const processingRate = ((completed / total) * 100).toFixed(1);
      
      updateElementText('certificateProcessingRate', `${processingRate}%`);
      
      return stats;
    }
  } catch (err) {
    console.error('Error loading certificate stats:', err);
    return {};
  }
}

// ============================================
// RECENT ACTIVITY FEED - OPTIMIZED
// ============================================

async function loadRecentActivity() {
  try {
    const allActivities = [];
    
    // Load recent scholarships
    if (dashboardData.scholarships.length > 0) {
      const recentScholarships = dashboardData.scholarships
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(s => ({
          type: 'scholarship',
          title: `New Scholarship: ${s.title}`,
          description: `${s.provider} - ${s.amount}`,
          timestamp: s.created_at,
          icon: 'fa-graduation-cap'
        }));
      
      allActivities.push(...recentScholarships);
    }
    
    // Load recent career organizations
    if (dashboardData.careers.length > 0) {
      const recentCareers = dashboardData.careers
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(c => ({
          type: 'career',
          title: `New Partner: ${c.name}`,
          description: `${c.category} organization added`,
          timestamp: c.created_at,
          icon: 'fa-building'
        }));
      
      allActivities.push(...recentCareers);
    }
    
    // Load recent certificates - with error handling
    try {
      const certRes = await fetch('http://localhost:3000/api/certificate-requests/admin/recent');
      
      if (certRes.ok) {
        const certData = await certRes.json();
        if (certData.success && certData.requests && certData.requests.length > 0) {
          const recentCertificates = certData.requests.slice(0, 10).map(r => ({
            type: 'certificate',
            title: `Certificate Request: ${r.request_number}`,
            description: `${r.full_name} - ${r.certificate_type === 'no_id' ? 'No ID Certificate' : 'ID Fill-Out'}`,
            timestamp: r.created_at,
            icon: 'fa-certificate'
          }));
          
          allActivities.push(...recentCertificates);
        }
      }
    } catch (certErr) {
      console.warn('Certificate data not available:', certErr);
    }
    
    // Sort all activities by timestamp
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Store all activities for audit trail
    dashboardData.allActivity = sortedActivities;
    
    // Display only recent 10
    const recentActivities = sortedActivities.slice(0, 10);
    dashboardData.recentActivity = recentActivities;
    
    renderActivityFeed(recentActivities);
    
  } catch (err) {
    console.error('Error loading recent activity:', err);
    renderActivityFeed([]);
  }
}

function renderActivityFeed(activities) {
  const feedContainer = document.getElementById('activityFeed');
  
  if (!feedContainer) return;
  
  if (activities.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clock"></i>
        <p>No recent activity</p>
      </div>
    `;
    return;
  }
  
  feedContainer.innerHTML = activities.map(activity => `
    <div class="activity-item ${activity.type}">
      <div class="activity-icon">
        <i class="fa-solid ${activity.icon}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-description">${activity.description}</div>
        <div class="activity-time">${formatTimeAgo(activity.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// AUDIT TRAIL MODAL
// ============================================

function openAuditTrailModal() {
  const modal = document.getElementById('auditTrailModal');
  const modalBody = document.getElementById('auditTrailBody');
  
  if (!modal || !modalBody) return;
  
  // Render all activities in the modal
  if (dashboardData.allActivity.length === 0) {
    modalBody.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clock"></i>
        <p>No activity recorded yet</p>
      </div>
    `;
  } else {
    modalBody.innerHTML = dashboardData.allActivity.map((activity, index) => `
      <div class="audit-item ${activity.type}">
        <div class="audit-number">#${index + 1}</div>
        <div class="audit-icon">
          <i class="fa-solid ${activity.icon}"></i>
        </div>
        <div class="audit-content">
          <div class="audit-title">${activity.title}</div>
          <div class="audit-description">${activity.description}</div>
          <div class="audit-timestamp">
            <i class="far fa-clock"></i>
            ${new Date(activity.timestamp).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    `).join('');
  }
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeAuditTrailModal() {
  const modal = document.getElementById('auditTrailModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Export functions for HTML use
window.openAuditTrailModal = openAuditTrailModal;
window.closeAuditTrailModal = closeAuditTrailModal;

// ============================================
// UPDATE ALL METRICS
// ============================================

function updateAllMetrics() {
  // Calculate totals
  const totalScholarships = dashboardData.scholarships.length;
  const totalCareers = dashboardData.careers.length;
  const totalItems = totalScholarships + totalCareers;
  
  updateElementText('totalManagedItems', totalItems);
  
  // Update quick stats
  const activeScholarships = dashboardData.scholarships.filter(s => s.status === 'open').length;
  const activeCareers = dashboardData.careers.filter(c => c.status === 'active').length;
  
  updateElementText('activeItems', activeScholarships + activeCareers);
  
  // Update insights
  updateInsights();
}

function updateInsights() {
  const insightContainer = document.getElementById('dashboardInsights');
  
  if (!insightContainer) return;
  
  const insights = [];
  
  // Scholarship insights
  const upcomingDeadlines = dashboardData.scholarships.filter(s => {
    const deadline = new Date(s.deadline);
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return deadline >= now && deadline <= sevenDays && s.status === 'open';
  });
  
  if (upcomingDeadlines.length > 0) {
    insights.push({
      type: 'warning',
      icon: 'fa-exclamation-triangle',
      message: `${upcomingDeadlines.length} scholarship${upcomingDeadlines.length > 1 ? 's' : ''} closing within 7 days`
    });
  }
  
  // Career partner insights
  const inactiveCareers = dashboardData.careers.filter(c => c.status === 'inactive').length;
  
  if (inactiveCareers > 0) {
    insights.push({
      type: 'info',
      icon: 'fa-info-circle',
      message: `${inactiveCareers} career partner${inactiveCareers > 1 ? 's' : ''} marked as inactive`
    });
  }
  
  // Render insights
  if (insights.length > 0) {
    insightContainer.innerHTML = insights.map(insight => `
      <div class="insight-alert ${insight.type}">
        <i class="fa-solid ${insight.icon}"></i>
        <span>${insight.message}</span>
      </div>
    `).join('');
  } else {
    insightContainer.innerHTML = `
      <div class="insight-alert success">
        <i class="fa-solid fa-check-circle"></i>
        <span>All systems running smoothly</span>
      </div>
    `;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateElementText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function updateDateTime() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const dateTimeStr = now.toLocaleDateString('en-US', options);
  updateElementText('currentDateTime', dateTimeStr);
  updateElementText('lastSync', 'Just now');
}

function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showLoading() {
  const loaders = document.querySelectorAll('.skeleton-loader');
  loaders.forEach(loader => loader.style.display = 'block');
}

function hideLoading() {
  const loaders = document.querySelectorAll('.skeleton-loader');
  loaders.forEach(loader => loader.style.display = 'none');
}

function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
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
      <i class="fa-solid ${icons[type]}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// ============================================
// QUICK ACTIONS
// ============================================

// Navigate to pages
const quickActionButtons = {
  scholarships: () => window.location.href = '/private/html/adminPages/adminMila/scholarships.html',
  careers: () => window.location.href = '/private/html/adminPages/adminMila/careers.html',
  certificates: () => window.location.href = '/private/html/adminPages/adminMila/certificates.html'
};

// Export for use in HTML
window.navigateToPage = (page) => {
  if (quickActionButtons[page]) {
    quickActionButtons[page]();
  }
};