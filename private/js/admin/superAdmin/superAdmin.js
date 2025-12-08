// superAdmin.js

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeProfileDropdown();
    updateDateTime();
    initializeCardAnimations();
    initializeUpdatesModal();
    
    // Update date/time every minute
    setInterval(updateDateTime, 60000);
});

// Profile Dropdown Functionality
function initializeProfileDropdown() {
    const profileLink = document.querySelector('.profile-button');
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';
    dropdown.innerHTML = `
        <div class="dropdown-header">
            <i class="fas fa-user-circle"></i>
            <div class="dropdown-user-info">
                <span class="dropdown-username">Admin</span>
                <span class="dropdown-role">Super Administrator</span>
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
            window.location.href = '/private/html/AdminLogin/login.html';
        }
        dropdown.classList.remove('show');
    });
}

// Update Date and Time
function updateDateTime() {
    const datetimeElement = document.getElementById('datetime');
    if (datetimeElement) {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        datetimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Animate card numbers on load
function initializeCardAnimations() {
    const cards = document.querySelectorAll('.card-number');
    
    cards.forEach(card => {
        const target = parseInt(card.getAttribute('data-count')) || 0;
        animateValue(card, 0, target, 1000);
    });
}

function animateValue(element, start, end, duration) {
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

// Updates Modal Functionality
function initializeUpdatesModal() {
    const modal = document.getElementById('updatesModal');
    const viewAllBtn = document.getElementById('viewAllUpdatesBtn');
    const closeBtn = document.querySelector('.updates-close');
    const modalTableBody = document.getElementById('updatesModalTableBody');
    
    // Get all rows from the main table
    const mainTableRows = document.querySelectorAll('.updates-table tbody tr');
    
    viewAllBtn.addEventListener('click', function() {
        // Clear modal table
        modalTableBody.innerHTML = '';
        
        // Clone all rows to modal
        mainTableRows.forEach(row => {
            const clone = row.cloneNode(true);
            modalTableBody.appendChild(clone);
        });
        
        // Show modal
        modal.style.display = 'flex';
    });
    
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Sidebar navigation active state
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        this.parentElement.classList.add('active');
    });
});