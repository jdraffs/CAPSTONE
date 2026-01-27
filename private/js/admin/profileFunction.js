// private/js/admin/profileFunction.js

/**
 * Initialize the profile dropdown menu
 * Displays the logged-in admin's username from localStorage
 */
function initializeProfileDropdown() {
  const profileLink = document.querySelector('.profile-button');
  if (!profileLink) {
    console.warn('Profile button not found');
    return;
  }

  // ✅ Check if dropdown already exists to prevent duplicates
  const existingDropdown = profileLink.parentElement.querySelector('.profile-dropdown');
  if (existingDropdown) {
    console.log('Dropdown already initialized');
    return;
  }

  const adminid = localStorage.getItem('adminid');

  // Create dropdown element
  const dropdown = document.createElement('div');
  dropdown.className = 'profile-dropdown';
  dropdown.innerHTML = `
    <div class="dropdown-header">
      <i class="fas fa-user-circle"></i>
      <div class="dropdown-user-info">
        <span class="dropdown-username">${adminid}</span>
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

  // Append dropdown to profile link parent
  profileLink.parentElement.style.position = 'relative';
  profileLink.parentElement.appendChild(dropdown);

  // Toggle dropdown on profile button click
  profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== profileLink) {
      dropdown.classList.remove('show');
    }
  });

  // View Profile action
  document.getElementById('viewProfile')?.addEventListener('click', (e) => {
    e.preventDefault();
    alertSystem.warning('View Profile - To be implemented');
    dropdown.classList.remove('show');
  });

  // Settings action
  document.getElementById('settings')?.addEventListener('click', (e) => {
    e.preventDefault();
    alertSystem.warning('Settings - To be implemented');
    dropdown.classList.remove('show');
  });

  // Logout action
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();

    if (confirm('Are you sure you want to logout?')) {
      // Clear all stored data
      sessionStorage.clear();
      localStorage.clear();
      
      // Redirect to home page
      window.location.href = '/public/index.html';
    }
  });

  console.log('Profile dropdown initialized successfully');
}

/**
 * Update the sidebar username with logged-in admin's ID
 */
function updateSidebarUsername() {
  const adminid = localStorage.getItem('adminid') || 'Admin';
  const sidebarUsername = document.querySelector('.user-name');
  
  if (sidebarUsername) {
    sidebarUsername.textContent = adminid;
    console.log('Sidebar username updated to:', adminid);
  }
}

// Expose functions globally so they can be called from HTML pages
window.initializeProfileDropdown = initializeProfileDropdown;
window.updateSidebarUsername = updateSidebarUsername;