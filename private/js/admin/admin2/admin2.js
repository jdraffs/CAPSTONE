// HELPER: Logout
function logout() {
  window.location.href = '/public/index.html'; 
}

// HELPER: Fetch and update total recent uploads 
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

// MAIN DOM LOGIC
document.addEventListener('DOMContentLoaded', () => {
  // NAV HIGHLIGHTING 
  const navItems = document.querySelectorAll('.nav-item');
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop();

  navItems.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;
    const href = link.getAttribute('href');

    // case 1: links with an actual page
    if (href.endsWith('.html')) {
      const linkFile = href.split('/').pop();
      item.classList.toggle('active', linkFile === currentFile);
    }
    // case 2: dashboard or hash links
    else if (href.startsWith('#') && currentFile === 'admin2.html') {
      item.classList.toggle('active', href === '#overview');
    }
  });

  // --- TAB SWITCHING ---
  // document.querySelectorAll('.nav-link').forEach(link => {
  //   link.addEventListener('click', e => {
  //     e.preventDefault();

  //     // Update active nav item
  //     document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  //     link.closest('.nav-item').classList.add('active');

  //     // Hide all pages
  //     document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active', 'fade-up'));

  //     // Show selected page
  //     const pageName = link.getAttribute('data-page');
  //     const pageDiv = document.getElementById(pageName + '-page');
  //     if (pageDiv) {
  //       pageDiv.classList.add('active');
  //       void pageDiv.offsetWidth; // trigger reflow for animation
  //       pageDiv.classList.add('fade-up');
  //     }
  //   });
  // });

  // MOBILE MENU TOGGLE 
  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.onclick = () => document.querySelector('.sidebar').classList.toggle('open');
  }

  // COUNTERS 
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

  // DATE/TIME 
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

  // RECENT UPLOADS 
  updateRecentUploadsCount();
});