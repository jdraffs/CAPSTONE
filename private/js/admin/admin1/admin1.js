// admin1.js
// === HELPER: Logout ===
function logout() {
  window.location.href = '/public/index.html'; // adjust path if needed
}

// === HELPER: Profile Dropdown ===
function initializeProfileDropdown() {
  const profileLink = document.querySelector('.profile-button');
  
  if (!profileLink) return;
  
  // Create dropdown menu
  const dropdown = document.createElement('div');
  dropdown.className = 'profile-dropdown';
  dropdown.innerHTML = `
    <div class="dropdown-header">
      <i class="fas fa-user-circle"></i>
      <div class="dropdown-user-info">
        <span class="dropdown-username">Admin</span>
        <span class="dropdown-role">Administrator</span>
      </div>
    </div>
    <div class="dropdown-divider"></div>
    <a href="#" class="dropdown-item" id="viewProfile">
      <i class="fas fa-user"></i>
      <span>View Profile</span>
    </a>
    <a href="#" class="dropdown-item" id="settings">
      <i class="fas fa-cog"></i>
      <span>Settings</span>
    </a>
    <div class="dropdown-divider"></div>
    <a href="#" class="dropdown-item logout" id="logoutBtn">
      <i class="fas fa-sign-out-alt"></i>
      <span>Logout</span>
    </a>
  `;
  
  // Insert dropdown after profile link
  profileLink.parentElement.style.position = 'relative';
  profileLink.parentElement.appendChild(dropdown);
  
  // Toggle dropdown on click
  profileLink.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target) && e.target !== profileLink) {
      dropdown.classList.remove('show');
    }
  });
  
  // Handle dropdown items
  document.getElementById('viewProfile').addEventListener('click', function(e) {
    e.preventDefault();
    alert('View Profile functionality - To be implemented');
    dropdown.classList.remove('show');
  });
  
  document.getElementById('settings').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Settings functionality - To be implemented');
    dropdown.classList.remove('show');
  });
  
  // Handle logout
  document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
      // Clear any session data
      sessionStorage.clear();
      localStorage.clear();
      
      // Redirect to login page
      window.location.href = '/public/index.html';
    }
    dropdown.classList.remove('show');
  });
}

// === HELPER: Fetch and update total recent uploads ===
async function updateRecentUploadsCount() {
  try {
    const response = await fetch('http://localhost:3000/api/recent-uploads');
    const data = await response.json();

    if (data.success) {
      const countElement = document.getElementById('recentUploadsCount');
      if (countElement) {
        countElement.textContent = data.totalRecentUploads;
      }
    } else {
      console.error('Failed to fetch recent uploads:', data.message);
    }
  } catch (err) {
    console.error('Error fetching recent uploads:', err);
  }
}

// === MAIN DOM LOGIC ===
document.addEventListener('DOMContentLoaded', () => {
  // Initialize profile dropdown
  initializeProfileDropdown();

  // --- NAV HIGHLIGHTING ---
  const navItems = document.querySelectorAll('.nav-item');
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop();

  navItems.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;
    const href = link.getAttribute('href');

    // Case 1: Links with an actual page
    if (href.endsWith('.html')) {
      const linkFile = href.split('/').pop();
      item.classList.toggle('active', linkFile === currentFile);
    }
    // Case 2: Dashboard or hash links
    else if (href.startsWith('#') && currentFile === 'admin1.html') {
      item.classList.toggle('active', href === '#overview');
    }
  });

  // --- MOBILE MENU TOGGLE ---
  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.onclick = () => document.querySelector('.sidebar').classList.toggle('open');
  }

  // --- COUNTERS ---
  const counters = document.querySelectorAll('.card-number');
  counters.forEach(counter => {
    const updateCount = () => {
      const target = +counter.getAttribute('data-count');
      const current = +counter.innerText;
      const increment = Math.ceil(target / 100);
      if (current < target) {
        counter.innerText = Math.min(current + increment, target);
        setTimeout(updateCount, 20);
      } else {
        counter.innerText = target;
      }
    };
    updateCount();
  });

  // --- DATE/TIME ---
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
  setInterval(updateDateTime, 1000);
  updateDateTime();

  // --- RECENT UPLOADS ---
  updateRecentUploadsCount();
});