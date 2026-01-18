// admin1.js - Enhanced Dashboard for Admin Ave
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize profile dropdown
  if (typeof initializeProfileDropdown === 'function') {
    initializeProfileDropdown();
  }

  // --- NAV HIGHLIGHTING ---
  highlightCurrentNav();

  // --- MOBILE MENU TOGGLE ---
  setupMobileMenu();

  // --- DATE/TIME ---
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // --- LOAD DASHBOARD DATA ---
  await loadDashboardData();

  // --- SETUP EVENT LISTENERS ---
  setupEventListeners();
});

// ===== NAVIGATION HIGHLIGHTING =====
function highlightCurrentNav() {
  const navItems = document.querySelectorAll('.nav-item');
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop();

  navItems.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;
    const href = link.getAttribute('href');

    if (href.endsWith('.html')) {
      const linkFile = href.split('/').pop();
      item.classList.toggle('active', linkFile === currentFile);
    } else if (href.startsWith('#') && currentFile === 'admin1.html') {
      item.classList.toggle('active', href === '#overview');
    }
  });
}

// ===== MOBILE MENU =====
function setupMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.onclick = () => {
      document.querySelector('.sidebar').classList.toggle('open');
    };
  }
}

// ===== DATE/TIME =====
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  };
  const formatted = now.toLocaleString('en-US', options);
  const dt = document.getElementById('datetime');
  if (dt) dt.textContent = formatted;
}

// ===== LOAD DASHBOARD DATA =====
async function loadDashboardData() {
  try {
    // Fetch all data in parallel
    const [recentUploads, ojtPosts, nstpPosts, researchPosts, formsFolders] = await Promise.all([
      fetch('http://localhost:3000/api/recent-uploads').then(r => r.json()),
      fetch('http://localhost:3000/api/ojt/posts').then(r => r.json()),
      fetch('http://localhost:3000/api/nstp/posts').then(r => r.json()),
      fetch('http://localhost:3000/api/researchextension/posts').then(r => r.json()),
      fetch('http://localhost:3000/api/forms/folders?all=true').then(r => r.json())
    ]);

    // Update metrics
    updateMetrics({
      recentUploads: recentUploads.totalRecentUploads || 0,
      ojtCount: ojtPosts.posts?.length || 0,
      nstpCount: nstpPosts.posts?.length || 0,
      researchCount: researchPosts.posts?.length || 0,
      formsCount: formsFolders.folders?.length || 0
    });

    // Update recent activity
    updateRecentActivity({
      ojt: ojtPosts.posts || [],
      nstp: nstpPosts.posts || [],
      research: researchPosts.posts || []
    });

    // Update content breakdown
    updateContentBreakdown({
      ojt: ojtPosts.posts?.length || 0,
      nstp: nstpPosts.posts?.length || 0,
      research: researchPosts.posts?.length || 0
    });

    // Animate counters
    animateCounters();

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

// ===== UPDATE METRICS =====
function updateMetrics(data) {
  // Recent Uploads
  const recentUploadsEl = document.getElementById('recentUploadsCount');
  if (recentUploadsEl) {
    recentUploadsEl.textContent = data.recentUploads;
    recentUploadsEl.setAttribute('data-count', data.recentUploads);
  }

  // Total Posts (OJT + NSTP + Research)
  const totalPosts = data.ojtCount + data.nstpCount + data.researchCount;
  const totalPostsEl = document.querySelector('.card-number[data-metric="total-posts"]');
  if (totalPostsEl) {
    totalPostsEl.textContent = totalPosts;
    totalPostsEl.setAttribute('data-count', totalPosts);
  }

  // Forms Repository
  const formsCountEl = document.querySelector('.card-number[data-metric="forms"]');
  if (formsCountEl) {
    formsCountEl.textContent = data.formsCount;
    formsCountEl.setAttribute('data-count', data.formsCount);
  }

  // Update breakdown numbers
  document.getElementById('ojtCount').textContent = data.ojtCount;
  document.getElementById('nstpCount').textContent = data.nstpCount;
  document.getElementById('researchCount').textContent = data.researchCount;
}

// ===== UPDATE RECENT ACTIVITY =====
function updateRecentActivity(data) {
  const activityList = document.getElementById('activityFeed');
  if (!activityList) return;

  // Combine all activities
  const activities = [];

  // OJT posts
  if (data.ojt.length > 0) {
    data.ojt.slice(0, 3).forEach(post => {
      activities.push({
        type: 'ojt',
        title: post.title || 'Untitled OJT Post',
        time: post.created_at,
        icon: 'fa-briefcase',
        color: '#667eea'
      });
    });
  }

  // NSTP posts
  if (data.nstp.length > 0) {
    data.nstp.slice(0, 3).forEach(post => {
      activities.push({
        type: 'nstp',
        title: post.title || 'Untitled NSTP Post',
        time: post.created_at,
        icon: 'fa-handshake-angle',
        color: '#48bb78'
      });
    });
  }

  // Research posts
  if (data.research.length > 0) {
    data.research.slice(0, 3).forEach(post => {
      activities.push({
        type: 'research',
        title: post.title || 'Untitled Article',
        time: post.created_at,
        icon: 'fa-book',
        color: '#ed8936'
      });
    });
  }

  // Sort by date (newest first)
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));

  // Take only the 5 most recent
  const recentActivities = activities.slice(0, 5);

  if (recentActivities.length === 0) {
    activityList.innerHTML = `
      <div class="empty-activity">
        <i class="fas fa-inbox"></i>
        <p>No recent activity</p>
      </div>
    `;
    return;
  }

  // Render activities
  activityList.innerHTML = recentActivities.map(activity => {
    const timeAgo = getTimeAgo(activity.time);
    return `
      <div class="activity-item ${activity.type}">
        <div class="activity-icon" style="background: ${activity.color}">
          <i class="fas ${activity.icon}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-meta">
            <span><i class="far fa-clock"></i> ${timeAgo}</span>
            <span><i class="fas fa-tag"></i> ${activity.type.toUpperCase()}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== UPDATE CONTENT BREAKDOWN =====
function updateContentBreakdown(data) {
  const total = data.ojt + data.nstp + data.research;
  
  if (total === 0) {
    document.getElementById('contentBreakdown').innerHTML = `
      <div class="empty-breakdown">
        <p>No content yet</p>
      </div>
    `;
    return;
  }

  const ojtPercent = Math.round((data.ojt / total) * 100);
  const nstpPercent = Math.round((data.nstp / total) * 100);
  const researchPercent = Math.round((data.research / total) * 100);

  document.getElementById('contentBreakdown').innerHTML = `
    <div class="breakdown-item">
      <div class="breakdown-info">
        <i class="fas fa-briefcase" style="color: #667eea;"></i>
        <span class="breakdown-label">OJT</span>
      </div>
      <div class="breakdown-stats">
        <span class="breakdown-count">${data.ojt}</span>
        <span class="breakdown-percent">${ojtPercent}%</span>
      </div>
      <div class="breakdown-bar">
        <div class="breakdown-fill" style="width: ${ojtPercent}%; background: #667eea;"></div>
      </div>
    </div>

    <div class="breakdown-item">
      <div class="breakdown-info">
        <i class="fas fa-handshake-angle" style="color: #48bb78;"></i>
        <span class="breakdown-label">NSTP</span>
      </div>
      <div class="breakdown-stats">
        <span class="breakdown-count">${data.nstp}</span>
        <span class="breakdown-percent">${nstpPercent}%</span>
      </div>
      <div class="breakdown-bar">
        <div class="breakdown-fill" style="width: ${nstpPercent}%; background: #48bb78;"></div>
      </div>
    </div>

    <div class="breakdown-item">
      <div class="breakdown-info">
        <i class="fas fa-book" style="color: #ed8936;"></i>
        <span class="breakdown-label">Research & Extension</span>
      </div>
      <div class="breakdown-stats">
        <span class="breakdown-count">${data.research}</span>
        <span class="breakdown-percent">${researchPercent}%</span>
      </div>
      <div class="breakdown-bar">
        <div class="breakdown-fill" style="width: ${researchPercent}%; background: #ed8936;"></div>
      </div>
    </div>
  `;
}

// ===== ANIMATE COUNTERS =====
function animateCounters() {
  const counters = document.querySelectorAll('.card-number[data-count]');
  
  counters.forEach(counter => {
    const target = +counter.getAttribute('data-count');
    const duration = 1000; // 1 second
    const increment = target / (duration / 16); // 60fps
    let current = 0;

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        counter.textContent = Math.ceil(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target;
      }
    };

    updateCounter();
  });
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
  // Quick action buttons
  const actionButtons = document.querySelectorAll('.action-btn');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const action = this.querySelector('span').textContent;
      handleQuickAction(action);
    });
  });
}

// ===== HANDLE QUICK ACTIONS =====
function handleQuickAction(action) {
  switch(action) {
    case 'Add Post':
      // Redirect to OJT page (or show modal to choose which section)
      showPostTypeModal();
      break;
    case 'View Repository':
      window.location.href = '/private/html/adminPages/adminAve/forms-repository.html';
      break;
    case 'Audit Trail':
      showToast('Audit Trail feature coming soon', 'info');
      break;
    default:
      console.log('Unknown action:', action);
  }
}

// ===== POST TYPE MODAL =====
function showPostTypeModal() {
  const modal = document.createElement('div');
  modal.className = 'quick-modal';
  modal.innerHTML = `
    <div class="quick-modal-overlay"></div>
    <div class="quick-modal-content">
      <h3>Choose Post Type</h3>
      <div class="post-type-options">
        <a href="/private/html/adminPages/adminAve/ojt.html" class="post-type-card">
          <i class="fas fa-briefcase"></i>
          <span>OJT</span>
        </a>
        <a href="/private/html/adminPages/adminAve/nstp.html" class="post-type-card">
          <i class="fas fa-handshake-angle"></i>
          <span>NSTP</span>
        </a>
        <a href="/private/html/adminPages/adminAve/research&extension.html" class="post-type-card">
          <i class="fas fa-book"></i>
          <span>Research & Extension</span>
        </a>
      </div>
      <button class="modal-close-btn">Cancel</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal
  modal.querySelector('.modal-close-btn').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('.quick-modal-overlay').addEventListener('click', () => {
    modal.remove();
  });
}

// ===== UTILITY FUNCTIONS =====
function getTimeAgo(timestamp) {
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
  
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  toast.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <span>${message}</span>
  `;

  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}