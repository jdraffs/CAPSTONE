// /private/js/login.js

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
  // Remove active class from all tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Remove active class from all tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  // Add active class to clicked tab
  const clickedTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (clickedTab) {
    clickedTab.classList.add('active');
  }

  // Show corresponding tab pane
  const tabPane = document.getElementById(tabName);
  if (tabPane) {
    tabPane.classList.add('active');
  }

  // Clear any error messages when switching tabs
  hideAccreditationError();
}

// ============================================
// PASSWORD TOGGLE
// ============================================

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// ============================================
// ADMIN LOGIN
// ============================================

// /private/js/login.js - UPDATE ADMIN LOGIN SECTION

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const adminid = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminid, password })
    });

    const data = await response.json();

    if (data.success) {
      // Store admin info
      localStorage.setItem("adminid", data.adminid);
      localStorage.setItem("role_name", data.role_name);
      localStorage.setItem("role_id", data.role_id);
      localStorage.setItem("hierarchy_level", data.hierarchy_level);

      // Redirect based on role
      if (data.role_name === 'Assistant Super Administrator') {
        window.location.href = '/private/html/adminPages/secondarySuperAdmin/secondaryDashboard.html';
      } else if (data.adminid === 'adminSalao') {
        window.location.href = '/private/html/adminPages/superAdmin/superAdmin.html';
      } else if (data.adminid === 'adminave') {
        window.location.href = '/private/html/adminPages/adminAve/admin1.html';
      } else if (data.adminid === 'adminEnierga') {
        window.location.href = '/private/html/adminPages/adminEnierga/admin2.html';
      } else if (data.adminid === 'adminMila') {
        window.location.href = '/private/html/adminPages/adminMila/adminMila.html';
      } else if (data.adminid === 'adminLlave') {
        window.location.href = '/private/html/adminPages/adminLlave/adminLlave.html';
      } else if (data.adminid === 'adminSerrano') {
        window.location.href = '/private/html/adminPages/adminSerrano/adminSerrano.html';
      } else if (data.adminid === 'adminCMO') {
        window.location.href = '/private/html/adminPages/adminCMO/cmoDashboard.html';
      } else {
        alertSystem.error('Unknown admin role. Please contact support.');
      }
    } else {
      alertSystem.error('Invalid admin ID or password.');
    }

  } catch (error) {
    console.error('Error:', error);
    alertSystem.error('Server error. Please try again later.');
  }
});

// ============================================
// ACCREDITATION LOGIN
// ============================================

document.getElementById('accreditation-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('accreditation-username').value.trim();
  const password = document.getElementById('accreditation-password').value;

  if (!username || !password) {
    showAccreditationError('Please enter both username and password');
    return;
  }

  // Get submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');
  
  // Disable button and show loading
  submitBtn.disabled = true;
  btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  hideAccreditationError();

  try {
    const response = await fetch('http://localhost:3000/api/accreditation/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      // Store user data in localStorage
      localStorage.setItem('accreditation_user', JSON.stringify(data.user));

      // Redirect based on role
      window.location.href = data.redirectUrl;
    } else {
      showAccreditationError(data.error || 'Login failed. Please try again.');
      submitBtn.disabled = false;
      btnText.innerHTML = 'Login';
    }
  } catch (error) {
    console.error('Accreditation login error:', error);
    showAccreditationError('Connection error. Please try again.');
    submitBtn.disabled = false;
    btnText.innerHTML = 'Login';
  }
});

// ============================================
// ERROR MESSAGE HELPERS
// ============================================

function showAccreditationError(message) {
  const errorDiv = document.getElementById('accreditation-error');
  const errorText = document.getElementById('accreditation-error-text');
  
  if (errorDiv && errorText) {
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
  }
}

function hideAccreditationError() {
  const errorDiv = document.getElementById('accreditation-error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// ============================================
// CHECK EXISTING SESSION ON PAGE LOAD
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  // Check if admin is already logged in
  const adminid = localStorage.getItem('adminid');
  if (adminid) {
    // Redirect to appropriate admin page
    if (adminid === 'adminave') {
      window.location.href = '/private/html/adminPages/adminAve/admin1.html';
    } else if (adminid === 'adminEnierga') {
      window.location.href = '/private/html/adminPages/adminEnierga/admin2.html';
    } else if (adminid === 'adminSalao') {
      window.location.href = '/private/html/adminPages/superAdmin/superAdmin.html';
    } else if (adminid === 'adminMila') {
      window.location.href = '/private/html/adminPages/adminMila/adminMila.html';
    } else if (adminid === 'adminLlave') {
      window.location.href = '/private/html/adminPages/adminLlave/adminLlave.html';
    } else if (adminid === 'adminCMO') {
      window.location.href = '/private/html/adminPages/adminCMO/cmoDashboard.html';
    } else if (adminid === 'adminSerrano') {
      window.location.href = '/private/html/adminPages/adminSerrano/adminSerrano.html';
    }
  }

  // Check if accreditation user is already logged in
  const accreditationUser = localStorage.getItem('accreditation_user');
  if (accreditationUser) {
    const userData = JSON.parse(accreditationUser);
    const redirectUrl = userData.role === 'Area Head'
      ? '/private/html/adminPages/adminLlave/areaHead/areaHead.html'
      : '/private/html/adminPages/adminLlave/accreditor/accreditor.html';
    window.location.href = redirectUrl;
  }
});