// adminSerrano.js - Academic Affairs Manager Dashboard (Updated)
// Dashboard with enhanced faculty tracking

// ============================================
// GLOBAL STATE & CONFIGURATION
// ============================================

const STATE = {
  facultyData: [],
  currentPage: 'dashboard'
};

const API_BASE = 'http://localhost:3000/api';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎓 Academic Affairs Manager Dashboard Loading...');
  
  // Check authentication
  const adminid = localStorage.getItem('adminid');
  if (!adminid) {
    window.location.href = '/private/html/AdminLogin/login.html';
    return;
  }
  
  // Initialize profile dropdown
  if (typeof initializeProfileDropdown === 'function') {
    initializeProfileDropdown();
  }
  
  // Load faculty data
  await loadFacultyData();
  
  // Update dashboard statistics
  updateDashboardStats();
  loadPDSAlerts();
  
  // Setup datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Setup program card clicks
  setupProgramCardListeners();
  
  console.log('✅ Dashboard initialized successfully');
});

// ============================================
// FACULTY DATA MANAGEMENT
// ============================================

async function loadFacultyData() {
  try {
    // Try to fetch from API
    const response = await fetch(`${API_BASE}/faculty`);
    if (response.ok) {
      STATE.facultyData = await response.json();
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem('facultyData');
      STATE.facultyData = stored ? JSON.parse(stored) : [];
    }
    
    console.log(`✅ Loaded ${STATE.facultyData.length} faculty records`);
  } catch (error) {
    console.error('❌ Error loading faculty data:', error);
    
    // Fallback to localStorage
    const stored = localStorage.getItem('facultyData');
    STATE.facultyData = stored ? JSON.parse(stored) : [];
    
    if (STATE.facultyData.length === 0) {
      showToast('Failed to load faculty data', 'error');
    }
  }
}

function getActiveFaculty() {
  return STATE.facultyData.filter(f => f.is_active);
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

function updateDashboardStats() {
  const activeFaculty = getActiveFaculty();
  
  // Total faculty count
  const totalCount = activeFaculty.length;
  const totalElement = document.getElementById('totalFacultyCount');
  if (totalElement) {
    totalElement.textContent = totalCount;
  }
  
  // Doctorate count
  const doctoralCount = activeFaculty.filter(f => f.highest_degree === 'Doctorate').length;
  const docElement = document.getElementById('totalDoctoralCount');
  if (docElement) {
    docElement.textContent = doctoralCount;
  }
  
  // Master's count
  const mastersCount = activeFaculty.filter(f => f.highest_degree === 'Master').length;
  const mastersElement = document.getElementById('totalMastersCount');
  if (mastersElement) {
    mastersElement.textContent = mastersCount;
  }
  
  // PDS updated count (last year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const pdsUpdatedCount = activeFaculty.filter(f => {
    if (!f.last_pds_update) return false;
    const pdsDate = new Date(f.last_pds_update);
    return pdsDate >= oneYearAgo;
  }).length;
  
  const pdsElement = document.getElementById('pdsUpdateCount');
  if (pdsElement) {
    pdsElement.textContent = pdsUpdatedCount;
  }
  
  // Program counts
  const programs = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
  programs.forEach(program => {
    const count = activeFaculty.filter(f => f.program === program).length;
    const element = document.getElementById(`${program.toLowerCase()}Count`);
    if (element) {
      element.textContent = `${count} Faculty`;
    }
  });
}

// ============================================
// PDS ALERTS
// ============================================

function loadPDSAlerts() {
  const alertGrid = document.getElementById('pdsAlertGrid');
  if (!alertGrid) return;
  
  const activeFaculty = getActiveFaculty();
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  // Find faculty with outdated PDS
  const alerts = [];
  
  activeFaculty.forEach(faculty => {
    if (!faculty.last_pds_update) {
      alerts.push({
        faculty: faculty,
        status: 'never',
        severity: 'critical',
        message: 'PDS never updated'
      });
    } else {
      const pdsDate = new Date(faculty.last_pds_update);
      
      if (pdsDate < twoYearsAgo) {
        alerts.push({
          faculty: faculty,
          status: 'severely-outdated',
          severity: 'critical',
          message: 'PDS severely outdated (2+ years)'
        });
      } else if (pdsDate < oneYearAgo) {
        alerts.push({
          faculty: faculty,
          status: 'outdated',
          severity: 'warning',
          message: 'PDS outdated (1+ year)'
        });
      }
    }
  });
  
  // Sort by severity
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  // Display alerts
  if (alerts.length === 0) {
    alertGrid.innerHTML = `
      <div class="alert-card success">
        <i class="fas fa-check-circle"></i>
        <div class="alert-content">
          <h4>All PDS Records Up to Date</h4>
          <p>All faculty members have updated their PDS within the last year.</p>
        </div>
      </div>
    `;
  } else {
    alertGrid.innerHTML = alerts.slice(0, 5).map(alert => `
      <div class="alert-card ${alert.severity}">
        <i class="fas ${alert.severity === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}"></i>
        <div class="alert-content">
          <h4>${alert.faculty.full_name}</h4>
          <p class="alert-program">${alert.faculty.program} - ${alert.faculty.employment_type}</p>
          <p class="alert-message">${alert.message}</p>
          ${alert.faculty.last_pds_update ? 
            `<p class="alert-date">Last updated: ${new Date(alert.faculty.last_pds_update).toLocaleDateString()}</p>` : 
            `<p class="alert-date">No update record</p>`
          }
        </div>
      </div>
    `).join('');
    
    if (alerts.length > 5) {
      alertGrid.innerHTML += `
        <div class="alert-card info">
          <i class="fas fa-info-circle"></i>
          <div class="alert-content">
            <h4>+${alerts.length - 5} More Alerts</h4>
            <p>View Faculty Management for complete list</p>
          </div>
        </div>
      `;
    }
  }
}

// ============================================
// PROGRAM CARD LISTENERS
// ============================================

function setupProgramCardListeners() {
  document.querySelectorAll('.program-card').forEach(card => {
    card.addEventListener('click', () => {
      const program = card.dataset.program;
      // Navigate to faculty management with program filter
      window.location.href = `facultyManagement.html?program=${program}`;
    });
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
  const dtElement = document.getElementById('datetime');
  if (dtElement) {
    dtElement.textContent = formatted;
  }
}

function showToast(message, type = 'info') {
  if (typeof toast === 'function') {
    toast(message, type);
    return;
  }
  
  console.log(`[${type.toUpperCase()}] ${message}`);
}

console.log('✅ adminSerrano.js (Dashboard) loaded successfully');