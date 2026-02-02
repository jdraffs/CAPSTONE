// adminSerrano.js - Academic Affairs Manager Dashboard
// Faculty Management System with Analytics and AI Insights

// ============================================
// GLOBAL STATE & CONFIGURATION
// ============================================

const STATE = {
  facultyData: [],
  filteredFaculty: [],
  currentPage: 'dashboard',
  charts: {},
  editingFacultyId: null
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
  
  // Setup event listeners
  setupNavigationListeners();
  setupFormListeners();
  setupFilterListeners();
  
  // Load faculty data
  await loadFacultyData();
  
  // Update dashboard
  updateDashboardStats();
  
  // Setup datetime
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  console.log('✅ Dashboard initialized successfully');
});

// ============================================
// NAVIGATION SYSTEM
// ============================================

function setupNavigationListeners() {
  // Sidebar navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page) {
        navigateToPage(page);
      }
    });
  });
  
  // Quick action buttons
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = btn.dataset.page;
      if (page) {
        navigateToPage(page);
      }
    });
  });
  
  // Program cards navigation
  document.querySelectorAll('.program-card').forEach(card => {
    card.addEventListener('click', () => {
      const program = card.dataset.program;
      navigateToPage('faculty-list');
      setTimeout(() => {
        document.getElementById('filterProgram').value = program;
        applyFilters();
      }, 100);
    });
  });
}

function navigateToPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.content-page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show target page
  const targetPage = document.getElementById(`${pageName}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
    STATE.currentPage = pageName;
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) {
      activeLink.closest('.nav-item').classList.add('active');
    }
    
    // Update page title
    updatePageTitle(pageName);
    
    // Page-specific actions
    if (pageName === 'faculty-list') {
      renderFacultyList();
    } else if (pageName === 'deactivated-faculty') {
      renderDeactivatedFaculty();
    } else if (pageName === 'analytics') {
      renderAnalytics();
    } else if (pageName === 'dashboard') {
      updateDashboardStats();
    }
  }
}

function updatePageTitle(pageName) {
  const titles = {
    'dashboard': 'Dashboard',
    'faculty-list': 'Faculty Directory',
    'add-faculty': 'Add New Faculty',
    'deactivated-faculty': 'Deactivated Faculty',
    'analytics': 'Faculty Analytics',
    'ai-report': 'AI Insights Report'
  };
  
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    pageTitle.textContent = titles[pageName] || 'Dashboard';
  }
}

// ============================================
// FACULTY DATA MANAGEMENT
// ============================================

async function loadFacultyData() {
  try {
    // In production, this would be an API call
    // For now, using localStorage with fallback to sample data
    const stored = localStorage.getItem('facultyData');
    
    if (stored) {
      STATE.facultyData = JSON.parse(stored);
    } else {
      // Initialize with empty array
      STATE.facultyData = [];
      saveFacultyData();
    }
    
    STATE.filteredFaculty = STATE.facultyData.filter(f => f.is_active);
    
    console.log(`✅ Loaded ${STATE.facultyData.length} faculty records`);
  } catch (error) {
    console.error('❌ Error loading faculty data:', error);
    showToast('Failed to load faculty data', 'error');
  }
}

function saveFacultyData() {
  try {
    localStorage.setItem('facultyData', JSON.stringify(STATE.facultyData));
    console.log('✅ Faculty data saved');
  } catch (error) {
    console.error('❌ Error saving faculty data:', error);
    showToast('Failed to save faculty data', 'error');
  }
}

function getFacultyById(id) {
  return STATE.facultyData.find(f => f.id === id);
}

function getActiveFaculty() {
  return STATE.facultyData.filter(f => f.is_active);
}

function getDeactivatedFaculty() {
  return STATE.facultyData.filter(f => !f.is_active);
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

function updateDashboardStats() {
  const activeFaculty = getActiveFaculty();
  
  // Total faculty count
  const totalCount = activeFaculty.length;
  document.getElementById('totalFacultyCount').textContent = totalCount;
  
  // Doctorate count
  const doctoralCount = activeFaculty.filter(f => f.highest_degree === 'Doctorate').length;
  document.getElementById('totalDoctoralCount').textContent = doctoralCount;
  
  // Master's count
  const mastersCount = activeFaculty.filter(f => f.highest_degree === 'Master').length;
  document.getElementById('totalMastersCount').textContent = mastersCount;
  
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
// FACULTY LIST & FILTERS
// ============================================

function setupFilterListeners() {
  const searchInput = document.getElementById('facultySearch');
  const filterProgram = document.getElementById('filterProgram');
  const filterEmployment = document.getElementById('filterEmployment');
  const filterDegree = document.getElementById('filterDegree');
  const clearFilters = document.getElementById('clearFilters');
  
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  
  if (filterProgram) {
    filterProgram.addEventListener('change', applyFilters);
  }
  
  if (filterEmployment) {
    filterEmployment.addEventListener('change', applyFilters);
  }
  
  if (filterDegree) {
    filterDegree.addEventListener('change', applyFilters);
  }
  
  if (clearFilters) {
    clearFilters.addEventListener('click', () => {
      searchInput.value = '';
      filterProgram.value = '';
      filterEmployment.value = '';
      filterDegree.value = '';
      applyFilters();
    });
  }
}

function applyFilters() {
  const searchTerm = document.getElementById('facultySearch')?.value.toLowerCase() || '';
  const programFilter = document.getElementById('filterProgram')?.value || '';
  const employmentFilter = document.getElementById('filterEmployment')?.value || '';
  const degreeFilter = document.getElementById('filterDegree')?.value || '';
  
  STATE.filteredFaculty = getActiveFaculty().filter(faculty => {
    const matchesSearch = !searchTerm || 
      faculty.full_name.toLowerCase().includes(searchTerm);
    
    const matchesProgram = !programFilter || 
      faculty.program === programFilter;
    
    const matchesEmployment = !employmentFilter || 
      faculty.employment_type === employmentFilter;
    
    const matchesDegree = !degreeFilter || 
      faculty.highest_degree === degreeFilter;
    
    return matchesSearch && matchesProgram && matchesEmployment && matchesDegree;
  });
  
  renderFacultyList();
}

function renderFacultyList() {
  const grid = document.getElementById('facultyGrid');
  if (!grid) return;
  
  if (STATE.filteredFaculty.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users-slash"></i>
        <p>No faculty members found</p>
        <button class="btn-primary" data-page="add-faculty">
          <i class="fas fa-user-plus"></i> Add Faculty
        </button>
      </div>
    `;
    
    // Reattach event listener
    const btn = grid.querySelector('.btn-primary');
    if (btn) {
      btn.addEventListener('click', () => navigateToPage('add-faculty'));
    }
    return;
  }
  
  grid.innerHTML = STATE.filteredFaculty.map(faculty => createFacultyCard(faculty)).join('');
  
  // Attach event listeners
  attachFacultyCardListeners();
}

function createFacultyCard(faculty) {
  const imageSrc = faculty.image_path || '/public/assets/images/default-avatar.png';
  
  return `
    <div class="faculty-card" data-id="${faculty.id}">
      <div class="faculty-image-container">
        <img src="${imageSrc}" alt="${faculty.full_name}" onerror="this.src='/public/assets/images/default-avatar.png'">
      </div>
      <h3 class="faculty-name">${faculty.full_name}</h3>
      <div class="faculty-info">
        <span class="faculty-badge badge-program">${faculty.program}</span>
        <span class="faculty-badge badge-employment badge-${faculty.employment_type.toLowerCase().replace('-', '')}">${faculty.employment_type}</span>
        <span class="faculty-badge badge-degree badge-${faculty.highest_degree.toLowerCase()}">${faculty.highest_degree}</span>
      </div>
      <div class="faculty-actions">
        <button class="btn-edit" data-id="${faculty.id}">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn-deactivate" data-id="${faculty.id}">
          <i class="fas fa-user-slash"></i> Deactivate
        </button>
      </div>
    </div>
  `;
}

function attachFacultyCardListeners() {
  // Edit buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      openEditModal(id);
    });
  });
  
  // Deactivate buttons
  document.querySelectorAll('.btn-deactivate').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      confirmDeactivate(id);
    });
  });
}

// ============================================
// DEACTIVATED FACULTY
// ============================================

function renderDeactivatedFaculty() {
  const grid = document.getElementById('deactivatedFacultyGrid');
  if (!grid) return;
  
  const deactivated = getDeactivatedFaculty();
  
  if (deactivated.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <p>No deactivated faculty members</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = deactivated.map(faculty => createDeactivatedFacultyCard(faculty)).join('');
  
  // Attach restore listeners
  document.querySelectorAll('.btn-restore').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      restoreFaculty(id);
    });
  });
}

function createDeactivatedFacultyCard(faculty) {
  const imageSrc = faculty.image_path || '/public/assets/images/default-avatar.png';
  
  return `
    <div class="faculty-card" data-id="${faculty.id}">
      <div class="faculty-image-container">
        <img src="${imageSrc}" alt="${faculty.full_name}" onerror="this.src='/public/assets/images/default-avatar.png'">
      </div>
      <h3 class="faculty-name">${faculty.full_name}</h3>
      <div class="faculty-info">
        <span class="faculty-badge badge-program">${faculty.program}</span>
        <span class="faculty-badge badge-employment">${faculty.employment_type}</span>
        <span class="faculty-badge badge-degree">${faculty.highest_degree}</span>
      </div>
      <div class="faculty-actions">
        <button class="btn-restore" data-id="${faculty.id}">
          <i class="fas fa-undo"></i> Restore
        </button>
      </div>
    </div>
  `;
}

// ============================================
// FACULTY CRUD OPERATIONS
// ============================================

function setupFormListeners() {
  // Add faculty form
  const addForm = document.getElementById('addFacultyForm');
  if (addForm) {
    addForm.addEventListener('submit', handleAddFaculty);
  }
  
  // Edit faculty form
  const editForm = document.getElementById('editFacultyForm');
  if (editForm) {
    editForm.addEventListener('submit', handleEditFaculty);
  }
  
  // Cancel button
  const cancelBtn = document.getElementById('cancelAddFaculty');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      navigateToPage('faculty-list');
    });
  }
  
  // Image preview handlers
  setupImagePreview('facultyImage', 'imagePreview');
  setupImagePreview('editFacultyImage', 'editImagePreview');
  
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // Modal overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', closeModal);
  });
  
  // Generate report button
  const generateReportBtn = document.getElementById('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', generateAIReport);
  }
}

function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  
  if (input && preview) {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

async function handleAddFaculty(e) {
  e.preventDefault();
  
  // Get form data
  const imageFile = document.getElementById('facultyImage').files[0];
  const name = document.getElementById('facultyName').value.trim();
  const program = document.getElementById('facultyProgram').value;
  const employment = document.getElementById('employmentType').value;
  const degree = document.getElementById('highestDegree').value;
  
  if (!imageFile || !name || !program || !employment || !degree) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  // Convert image to base64 for storage
  const imageBase64 = await fileToBase64(imageFile);
  
  // Create new faculty object
  const newFaculty = {
    id: Date.now(), // Simple ID generation
    full_name: name,
    program: program,
    employment_type: employment,
    highest_degree: degree,
    image_path: imageBase64,
    is_active: true,
    created_at: new Date().toISOString()
  };
  
  // Add to data
  STATE.facultyData.push(newFaculty);
  saveFacultyData();
  
  // Update UI
  showToast(`Faculty "${name}" added successfully`, 'success');
  
  // Reset form
  document.getElementById('addFacultyForm').reset();
  document.getElementById('imagePreview').innerHTML = `
    <i class="fas fa-user-circle"></i>
    <p>Upload Photo</p>
  `;
  
  // Navigate to faculty list
  navigateToPage('faculty-list');
  
  // Reload data and update stats
  await loadFacultyData();
  updateDashboardStats();
}

function openEditModal(id) {
  const faculty = getFacultyById(id);
  if (!faculty) return;
  
  STATE.editingFacultyId = id;
  
  // Populate form
  document.getElementById('editFacultyId').value = id;
  document.getElementById('editFacultyName').value = faculty.full_name;
  document.getElementById('editFacultyProgram').value = faculty.program;
  document.getElementById('editEmploymentType').value = faculty.employment_type;
  document.getElementById('editHighestDegree').value = faculty.highest_degree;
  
  // Set image preview
  const preview = document.getElementById('editImagePreview');
  if (faculty.image_path) {
    preview.innerHTML = `<img src="${faculty.image_path}" id="editCurrentImage" alt="${faculty.full_name}">`;
  }
  
  // Show modal
  const modal = document.getElementById('editFacultyModal');
  modal.classList.add('active');
}

async function handleEditFaculty(e) {
  e.preventDefault();
  
  const id = STATE.editingFacultyId;
  const faculty = getFacultyById(id);
  if (!faculty) return;
  
  // Get updated data
  const imageFile = document.getElementById('editFacultyImage').files[0];
  const name = document.getElementById('editFacultyName').value.trim();
  const program = document.getElementById('editFacultyProgram').value;
  const employment = document.getElementById('editEmploymentType').value;
  const degree = document.getElementById('editHighestDegree').value;
  
  // Update faculty object
  faculty.full_name = name;
  faculty.program = program;
  faculty.employment_type = employment;
  faculty.highest_degree = degree;
  faculty.updated_at = new Date().toISOString();
  
  // Update image if new one uploaded
  if (imageFile) {
    faculty.image_path = await fileToBase64(imageFile);
  }
  
  // Save changes
  saveFacultyData();
  
  // Update UI
  showToast(`Faculty "${name}" updated successfully`, 'success');
  closeModal();
  
  // Reload data
  await loadFacultyData();
  renderFacultyList();
  updateDashboardStats();
}

function confirmDeactivate(id) {
  const faculty = getFacultyById(id);
  if (!faculty) return;
  
  if (confirm(`Are you sure you want to deactivate "${faculty.full_name}"?\n\nThis will exclude them from all analytics and reports.`)) {
    deactivateFaculty(id);
  }
}

function deactivateFaculty(id) {
  const faculty = getFacultyById(id);
  if (!faculty) return;
  
  faculty.is_active = false;
  faculty.deactivated_at = new Date().toISOString();
  
  saveFacultyData();
  
  showToast(`Faculty "${faculty.full_name}" has been deactivated`, 'success');
  
  // Reload and update
  loadFacultyData().then(() => {
    renderFacultyList();
    updateDashboardStats();
  });
}

function restoreFaculty(id) {
  const faculty = getFacultyById(id);
  if (!faculty) return;
  
  if (confirm(`Restore "${faculty.full_name}" to active status?`)) {
    faculty.is_active = true;
    faculty.restored_at = new Date().toISOString();
    
    saveFacultyData();
    
    showToast(`Faculty "${faculty.full_name}" has been restored`, 'success');
    
    // Reload and update
    loadFacultyData().then(() => {
      renderDeactivatedFaculty();
      updateDashboardStats();
    });
  }
}

// ============================================
// ANALYTICS & CHARTS
// ============================================

function renderAnalytics() {
  const activeFaculty = getActiveFaculty();
  
  if (activeFaculty.length === 0) {
    document.querySelector('#analytics-page .analytics-grid').innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-chart-bar"></i>
        <p>No data available for analytics</p>
        <button class="btn-primary" data-page="add-faculty">
          <i class="fas fa-user-plus"></i> Add Faculty
        </button>
      </div>
    `;
    return;
  }
  
  // Destroy existing charts
  Object.values(STATE.charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  STATE.charts = {};
  
  // Render all charts
  renderEmploymentChart(activeFaculty);
  renderDegreeChart(activeFaculty);
  renderProgramChart(activeFaculty);
  renderQualificationsChart(activeFaculty);
}

function renderEmploymentChart(faculty) {
  const ctx = document.getElementById('employmentChart');
  if (!ctx) return;
  
  const regular = faculty.filter(f => f.employment_type === 'Regular').length;
  const partTime = faculty.filter(f => f.employment_type === 'Part-Time').length;
  
  STATE.charts.employment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Regular', 'Part-Time'],
      datasets: [{
        data: [regular, partTime],
        backgroundColor: ['#4facfe', '#f5576c'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderDegreeChart(faculty) {
  const ctx = document.getElementById('degreeChart');
  if (!ctx) return;
  
  const bachelor = faculty.filter(f => f.highest_degree === 'Bachelor').length;
  const master = faculty.filter(f => f.highest_degree === 'Master').length;
  const doctorate = faculty.filter(f => f.highest_degree === 'Doctorate').length;
  
  STATE.charts.degree = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Bachelor', 'Master', 'Doctorate'],
      datasets: [{
        data: [bachelor, master, doctorate],
        backgroundColor: ['#fce7f3', '#e0e7ff', '#dbeafe'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderProgramChart(faculty) {
  const ctx = document.getElementById('programChart');
  if (!ctx) return;
  
  const programs = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
  const counts = programs.map(p => faculty.filter(f => f.program === p).length);
  
  STATE.charts.program = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: programs,
      datasets: [{
        label: 'Faculty Count',
        data: counts,
        backgroundColor: ['#667eea', '#f5576c', '#4facfe', '#fbc02d'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderQualificationsChart(faculty) {
  const ctx = document.getElementById('qualificationsChart');
  if (!ctx) return;
  
  const programs = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
  
  const doctoralData = programs.map(p => 
    faculty.filter(f => f.program === p && f.highest_degree === 'Doctorate').length
  );
  
  const masterData = programs.map(p => 
    faculty.filter(f => f.program === p && f.highest_degree === 'Master').length
  );
  
  const bachelorData = programs.map(p => 
    faculty.filter(f => f.program === p && f.highest_degree === 'Bachelor').length
  );
  
  STATE.charts.qualifications = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: programs,
      datasets: [
        {
          label: 'Doctorate',
          data: doctoralData,
          backgroundColor: '#dbeafe'
        },
        {
          label: 'Master',
          data: masterData,
          backgroundColor: '#e0e7ff'
        },
        {
          label: 'Bachelor',
          data: bachelorData,
          backgroundColor: '#fce7f3'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// ============================================
// AI REPORT GENERATION
// ============================================

function generateAIReport() {
  const activeFaculty = getActiveFaculty();
  
  if (activeFaculty.length === 0) {
    showToast('No faculty data available to generate report', 'error');
    return;
  }
  
  const reportContainer = document.getElementById('reportContainer');
  reportContainer.innerHTML = `
    <div class="report-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Generating AI insights report...</p>
    </div>
  `;
  
  // Simulate AI processing delay
  setTimeout(() => {
    const report = generateComprehensiveReport(activeFaculty);
    displayAIReport(report);
  }, 1500);
}

function generateComprehensiveReport(faculty) {
  // Calculate statistics
  const total = faculty.length;
  
  // Employment statistics
  const regular = faculty.filter(f => f.employment_type === 'Regular').length;
  const partTime = faculty.filter(f => f.employment_type === 'Part-Time').length;
  const regularPercent = ((regular / total) * 100).toFixed(1);
  const partTimePercent = ((partTime / total) * 100).toFixed(1);
  
  // Degree statistics
  const doctoral = faculty.filter(f => f.highest_degree === 'Doctorate').length;
  const masters = faculty.filter(f => f.highest_degree === 'Master').length;
  const bachelor = faculty.filter(f => f.highest_degree === 'Bachelor').length;
  const doctoralPercent = ((doctoral / total) * 100).toFixed(1);
  const mastersPercent = ((masters / total) * 100).toFixed(1);
  const bachelorPercent = ((bachelor / total) * 100).toFixed(1);
  
  // Program statistics
  const programs = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
  const programStats = programs.map(program => {
    const count = faculty.filter(f => f.program === program).length;
    const withDoctorate = faculty.filter(f => f.program === program && f.highest_degree === 'Doctorate').length;
    const withMasters = faculty.filter(f => f.program === program && f.highest_degree === 'Master').length;
    const regularCount = faculty.filter(f => f.program === program && f.employment_type === 'Regular').length;
    
    return {
      program,
      count,
      withDoctorate,
      withMasters,
      regularCount,
      percent: ((count / total) * 100).toFixed(1)
    };
  });
  
  // Advanced degree holders per program
  const advancedDegreeByProgram = programStats.map(p => ({
    program: p.program,
    advancedDegreePercent: p.count > 0 
      ? (((p.withDoctorate + p.withMasters) / p.count) * 100).toFixed(1)
      : '0.0'
  }));
  
  // Generate insights
  const insights = generateInsights({
    total,
    regular,
    partTime,
    doctoral,
    masters,
    bachelor,
    programStats,
    advancedDegreeByProgram
  });
  
  return {
    executiveSummary: generateExecutiveSummary({
      total, regular, partTime, doctoral, masters, bachelor, regularPercent, partTimePercent
    }),
    employmentAnalysis: generateEmploymentAnalysis({
      total, regular, partTime, regularPercent, partTimePercent
    }),
    qualificationAnalysis: generateQualificationAnalysis({
      total, doctoral, masters, bachelor, doctoralPercent, mastersPercent, bachelorPercent
    }),
    programAnalysis: generateProgramAnalysis(programStats, total),
    keyInsights: insights,
    recommendations: generateRecommendations({
      total, doctoral, masters, programStats, advancedDegreeByProgram
    }),
    statistics: {
      total,
      regular,
      partTime,
      regularPercent,
      partTimePercent,
      doctoral,
      masters,
      bachelor,
      doctoralPercent,
      mastersPercent,
      bachelorPercent
    }
  };
}

function generateExecutiveSummary(data) {
  return `The Polytechnic University of the Philippines - Parañaque Campus currently employs a total of ${data.total} active faculty members across its four academic programs. The institution demonstrates a balanced employment structure with ${data.regular} regular faculty members (${data.regularPercent}%) and ${data.partTime} part-time instructors (${data.partTimePercent}%). In terms of academic qualifications, the faculty composition includes ${data.doctoral} doctorate holders, ${data.masters} master's degree holders, and ${data.bachelor} bachelor's degree holders. This distribution reflects the university's commitment to maintaining qualified academic staff while addressing the diverse instructional needs of the institution.`;
}

function generateEmploymentAnalysis(data) {
  const ratio = (data.regular / data.partTime).toFixed(2);
  let assessment = '';
  
  if (data.regularPercent >= 60) {
    assessment = `The institution maintains a strong regular faculty base at ${data.regularPercent}%, which provides stability in academic operations and ensures consistent quality of instruction. The ${data.partTime} part-time faculty members supplement the regular staff, offering specialized expertise and flexibility in curriculum delivery.`;
  } else if (data.regularPercent >= 40) {
    assessment = `The faculty composition shows a balanced distribution with ${data.regularPercent}% regular positions. This structure allows for institutional stability while maintaining flexibility through ${data.partTimePercent}% part-time appointments. However, consideration should be given to gradually increasing regular positions to enhance continuity in academic programs.`;
  } else {
    assessment = `The current employment structure indicates a higher reliance on part-time faculty at ${data.partTimePercent}%. While this provides flexibility, the institution may benefit from converting qualified part-time positions to regular status to strengthen program continuity and faculty engagement in institutional development activities.`;
  }
  
  return assessment;
}

function generateQualificationAnalysis(data) {
  let analysis = `The academic qualifications profile reveals that ${data.doctoral} faculty members (${data.doctoralPercent}%) hold doctoral degrees, ${data.masters} members (${data.mastersPercent}%) possess master's degrees, and ${data.bachelor} members (${data.bachelorPercent}%) maintain bachelor's degrees. `;
  
  const advancedDegree = parseFloat(data.doctoralPercent) + parseFloat(data.mastersPercent);
  
  if (advancedDegree >= 70) {
    analysis += `This demonstrates a strong qualification profile with ${advancedDegree.toFixed(1)}% of faculty holding advanced degrees, which aligns with national accreditation standards and supports the institution's academic excellence objectives.`;
  } else if (advancedDegree >= 50) {
    analysis += `The institution shows moderate progress in faculty qualification development with ${advancedDegree.toFixed(1)}% holding advanced degrees. Continued investment in faculty development programs would further strengthen the academic profile and support accreditation requirements.`;
  } else {
    analysis += `The current qualification profile indicates significant opportunity for enhancement, with ${advancedDegree.toFixed(1)}% holding advanced degrees. Strategic initiatives should prioritize faculty development programs, scholarship support, and incentives for advanced degree completion to meet accreditation standards.`;
  }
  
  return analysis;
}

function generateProgramAnalysis(programStats, total) {
  const largest = programStats.reduce((max, p) => p.count > max.count ? p : max);
  const smallest = programStats.reduce((min, p) => p.count < min.count ? p : min);
  
  let analysis = `Faculty distribution across academic programs shows ${largest.program} with the highest allocation of ${largest.count} members (${largest.percent}%), while ${smallest.program} has ${smallest.count} faculty members (${smallest.percent}%). `;
  
  const details = programStats.map(p => {
    const qualificationRate = p.count > 0 
      ? (((p.withDoctorate + p.withMasters) / p.count) * 100).toFixed(1)
      : '0.0';
    
    return `${p.program} maintains ${p.count} faculty members with ${qualificationRate}% holding advanced degrees (${p.withDoctorate} doctoral, ${p.withMasters} master's).`;
  }).join(' ');
  
  analysis += details;
  
  const variance = Math.max(...programStats.map(p => p.count)) - Math.min(...programStats.map(p => p.count));
  
  if (variance > total * 0.3) {
    analysis += ` The significant variance in faculty allocation suggests the need for strategic hiring aligned with enrollment trends and program requirements.`;
  } else {
    analysis += ` The relatively balanced distribution across programs indicates effective resource allocation in line with institutional priorities.`;
  }
  
  return analysis;
}

function generateInsights(data) {
  const insights = [];
  
  // Employment insights
  if (data.regularPercent >= 70) {
    insights.push({
      type: 'positive',
      text: 'Strong Regular Faculty Base: Excellent institutional stability with significant regular employment positions supporting academic continuity.'
    });
  } else if (data.partTimePercent >= 60) {
    insights.push({
      type: 'concern',
      text: 'High Part-Time Dependency: Consider strategic conversion of qualified part-time positions to regular status for enhanced program stability.'
    });
  }
  
  // Qualification insights
  const advancedDegree = data.doctoral + data.masters;
  const advancedPercent = ((advancedDegree / data.total) * 100).toFixed(1);
  
  if (advancedPercent >= 70) {
    insights.push({
      type: 'positive',
      text: `High Qualification Rate: ${advancedPercent}% of faculty hold advanced degrees, exceeding typical accreditation benchmarks.`
    });
  } else if (advancedPercent < 50) {
    insights.push({
      type: 'priority',
      text: `Qualification Enhancement Priority: Faculty development programs should target increased master's and doctoral degree completion.`
    });
  }
  
  // Doctoral faculty insight
  if (data.doctoral === 0) {
    insights.push({
      type: 'critical',
      text: 'No Doctoral Faculty: Urgent priority to recruit or develop doctoral-qualified faculty for research advancement and accreditation compliance.'
    });
  } else if (data.doctoral < 5) {
    insights.push({
      type: 'concern',
      text: `Limited Doctoral Representation: Only ${data.doctoral} doctoral faculty. Expansion needed for research capacity and graduate program development.`
    });
  }
  
  // Program-specific insights
  data.programStats.forEach(prog => {
    const advProgPercent = prog.count > 0 
      ? (((prog.withDoctorate + prog.withMasters) / prog.count) * 100).toFixed(1)
      : '0.0';
    
    if (parseFloat(advProgPercent) < 40 && prog.count > 0) {
      insights.push({
        type: 'program-concern',
        text: `${prog.program} Qualification Gap: Only ${advProgPercent}% hold advanced degrees. Targeted faculty development recommended.`
      });
    }
  });
  
  // Distribution insight
  const maxProg = Math.max(...data.programStats.map(p => p.count));
  const minProg = Math.min(...data.programStats.map(p => p.count));
  
  if (maxProg > minProg * 2.5) {
    insights.push({
      type: 'observation',
      text: 'Uneven Faculty Distribution: Significant variance across programs may require reallocation or strategic hiring based on enrollment trends.'
    });
  }
  
  return insights;
}

function generateRecommendations(data) {
  const recommendations = [];
  
  const advancedDegree = data.doctoral + data.masters;
  const advancedPercent = ((advancedDegree / data.total) * 100);
  
  // Qualification development
  if (advancedPercent < 60) {
    recommendations.push({
      priority: 'High',
      category: 'Faculty Development',
      recommendation: 'Establish comprehensive scholarship program supporting master\'s and doctoral studies with study leave provisions and financial assistance.',
      expectedImpact: 'Increase advanced degree holders to meet accreditation standards and enhance research capacity.'
    });
  }
  
  if (data.doctoral < 5) {
    recommendations.push({
      priority: 'High',
      category: 'Doctoral Faculty Recruitment',
      recommendation: 'Implement aggressive recruitment strategy for doctoral-qualified faculty with competitive compensation packages and research support.',
      expectedImpact: 'Strengthen research capabilities, support graduate program development, and enhance institutional credibility.'
    });
  }
  
  // Employment structure
  const partTimePercent = (data.programStats.reduce((sum, p) => sum + (p.count - p.regularCount), 0) / data.total) * 100;
  
  if (partTimePercent > 50) {
    recommendations.push({
      priority: 'Medium',
      category: 'Employment Stability',
      recommendation: 'Develop conversion program for outstanding part-time faculty to regular positions based on performance and institutional needs.',
      expectedImpact: 'Improve faculty retention, enhance program continuity, and increase institutional loyalty.'
    });
  }
  
  // Program-specific recommendations
  data.programStats.forEach(prog => {
    const advProgPercent = prog.count > 0 
      ? (((prog.withDoctorate + prog.withMasters) / prog.count) * 100)
      : 0;
    
    if (advProgPercent < 40) {
      recommendations.push({
        priority: 'Medium',
        category: `${prog.program} Program Enhancement`,
        recommendation: `Prioritize advanced degree completion for ${prog.program} faculty through targeted scholarship support and partnership with graduate institutions.`,
        expectedImpact: `Strengthen ${prog.program} program quality and meet discipline-specific accreditation requirements.`
      });
    }
  });
  
  // Research development
  if (data.doctoral < data.total * 0.2) {
    recommendations.push({
      priority: 'Medium',
      category: 'Research Capacity Building',
      recommendation: 'Establish research mentorship program pairing doctoral faculty with master\'s degree holders to develop research culture and support doctoral enrollment.',
      expectedImpact: 'Enhance institutional research output, support faculty publication, and create pathway for doctoral qualification.'
    });
  }
  
  // Accreditation preparation
  recommendations.push({
    priority: 'High',
    category: 'Accreditation Readiness',
    recommendation: 'Conduct comprehensive gap analysis against CHED and accrediting body standards, developing three-year qualification enhancement roadmap.',
    expectedImpact: 'Ensure systematic progress toward accreditation requirements and maintain competitive institutional standing.'
  });
  
  return recommendations;
}

function displayAIReport(report) {
  const container = document.getElementById('reportContainer');
  
  const insightIcons = {
    'positive': 'fa-check-circle',
    'concern': 'fa-exclamation-triangle',
    'priority': 'fa-flag',
    'critical': 'fa-exclamation-circle',
    'program-concern': 'fa-graduation-cap',
    'observation': 'fa-eye'
  };
  
  const priorityBadges = {
    'High': 'badge-high',
    'Medium': 'badge-medium',
    'Low': 'badge-low'
  };
  
  container.innerHTML = `
    <!-- Executive Summary -->
    <div class="report-section">
      <h3><i class="fas fa-file-alt"></i> Executive Summary</h3>
      <div class="report-content">
        <p>${report.executiveSummary}</p>
      </div>
    </div>
    
    <!-- Statistical Overview -->
    <div class="report-section">
      <h3><i class="fas fa-chart-bar"></i> Statistical Overview</h3>
      <div class="report-stats">
        <div class="stat-box">
          <h4>Total Faculty</h4>
          <p>${report.statistics.total}</p>
        </div>
        <div class="stat-box">
          <h4>Regular Faculty</h4>
          <p>${report.statistics.regular} (${report.statistics.regularPercent}%)</p>
        </div>
        <div class="stat-box">
          <h4>Part-Time Faculty</h4>
          <p>${report.statistics.partTime} (${report.statistics.partTimePercent}%)</p>
        </div>
        <div class="stat-box">
          <h4>Doctoral Holders</h4>
          <p>${report.statistics.doctoral} (${report.statistics.doctoralPercent}%)</p>
        </div>
        <div class="stat-box">
          <h4>Master's Holders</h4>
          <p>${report.statistics.masters} (${report.statistics.mastersPercent}%)</p>
        </div>
        <div class="stat-box">
          <h4>Bachelor Holders</h4>
          <p>${report.statistics.bachelor} (${report.statistics.bachelorPercent}%)</p>
        </div>
      </div>
    </div>
    
    <!-- Employment Analysis -->
    <div class="report-section">
      <h3><i class="fas fa-briefcase"></i> Employment Structure Analysis</h3>
      <div class="report-content">
        <p>${report.employmentAnalysis}</p>
      </div>
    </div>
    
    <!-- Qualification Analysis -->
    <div class="report-section">
      <h3><i class="fas fa-graduation-cap"></i> Academic Qualifications Analysis</h3>
      <div class="report-content">
        <p>${report.qualificationAnalysis}</p>
      </div>
    </div>
    
    <!-- Program Analysis -->
    <div class="report-section">
      <h3><i class="fas fa-building-columns"></i> Program Distribution Analysis</h3>
      <div class="report-content">
        <p>${report.programAnalysis}</p>
      </div>
    </div>
    
    <!-- Key Insights -->
    <div class="report-section">
      <h3><i class="fas fa-lightbulb"></i> Key Insights</h3>
      <ul class="insights-list">
        ${report.keyInsights.map(insight => `
          <li>
            <i class="fas ${insightIcons[insight.type] || 'fa-info-circle'}"></i>
            ${insight.text}
          </li>
        `).join('')}
      </ul>
    </div>
    
    <!-- Recommendations -->
    <div class="report-section">
      <h3><i class="fas fa-tasks"></i> Strategic Recommendations</h3>
      <div class="recommendations-list">
        ${report.recommendations.map(rec => `
          <div class="recommendation-card">
            <div class="rec-header">
              <span class="priority-badge ${priorityBadges[rec.priority]}">${rec.priority} Priority</span>
              <strong>${rec.category}</strong>
            </div>
            <p class="rec-recommendation">${rec.recommendation}</p>
            <p class="rec-impact"><strong>Expected Impact:</strong> ${rec.expectedImpact}</p>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Report Footer -->
    <div class="report-footer">
      <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
      <p><em>This report is automatically generated based on current faculty data and provides insights for academic planning and strategic decision-making.</em></p>
    </div>
  `;
  
  // Add additional styles for recommendations
  const style = document.createElement('style');
  style.textContent = `
    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 20px;
    }
    
    .recommendation-card {
      background: linear-gradient(135deg, #f7fafc, #edf2f7);
      padding: 20px;
      border-radius: 10px;
      border-left: 4px solid #a91c1c;
    }
    
    .rec-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 12px;
    }
    
    .priority-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge-high {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .badge-medium {
      background: #fef3c7;
      color: #78350f;
    }
    
    .badge-low {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .rec-recommendation {
      margin: 10px 0;
      font-weight: 500;
      color: #2d3748;
    }
    
    .rec-impact {
      margin: 10px 0;
      color: #4a5568;
      font-size: 0.95rem;
    }
    
    .report-footer {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #718096;
    }
    
    .report-footer p {
      margin: 8px 0;
    }
  `;
  
  document.head.appendChild(style);
  
  showToast('AI report generated successfully', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

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

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

function showToast(message, type = 'info') {
  // Use existing toast system if available
  if (typeof toast === 'function') {
    toast(message, type);
    return;
  }
  
  // Fallback toast implementation
  const container = document.getElementById('toastContainer') || createToastContainer();
  
  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toastEl.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toastEl);
  
  setTimeout(() => toastEl.classList.add('show'), 100);
  
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 300);
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
// EXPORT FUNCTIONS
// ============================================

console.log('✅ adminSerrano.js loaded successfully');