// profile-dropdown.js
// ===================
// PROFILE DROPDOWN + LOGOUT ONLY

function initializeProfileDropdown() {
  const profileLink = document.querySelector('.profile-button');
  if (!profileLink) return;

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

  profileLink.parentElement.style.position = 'relative';
  profileLink.parentElement.appendChild(dropdown);

  // Toggle dropdown
  profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== profileLink) {
      dropdown.classList.remove('show');
    }
  });

  // Placeholder actions
  document.getElementById('viewProfile')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('View Profile - To be implemented');
    dropdown.classList.remove('show');
  });

  document.getElementById('settings')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Settings - To be implemented');
    dropdown.classList.remove('show');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();

    if (confirm('Are you sure you want to logout?')) {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = '/public/index.html';
    }
  });
}

// Expose globally (important)
window.initializeProfileDropdown = initializeProfileDropdown;