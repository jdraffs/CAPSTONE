// facultyManagement.js - FIXED VERSION
// FIXES:
// 1. Proper Edit Functionality (not just view)
// 2. Delete button in deactivated accounts
// 3. Picture update in edit modal

// ============================================
// GLOBAL STATE & CONFIGURATION
// ============================================

const STATE = {
  facultyData: [],
  filteredFaculty: [],
  currentTab: 'directory',
  editingFacultyId: null,
  certificationCount: 0,
  agencyCount: 0,
  nextCertId: 1,
  nextAgencyId: 1,
  viewMode: 'grid',
  editCertCount: 1,
  editAgencyCount: 1
};

const API_BASE = 'http://localhost:3000/api';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎓 Faculty Management Page Loading...');
  
  const adminid = localStorage.getItem('adminid');
  if (!adminid) {
    window.location.href = '/private/html/AdminLogin/login.html';
    return;
  }
  
  if (typeof initializeProfileDropdown === 'function') {
    initializeProfileDropdown();
  }
  
  initializeTabs();
  setupFormListeners();
  setupFilterListeners();
  setupViewModeToggle();
  
  await loadFacultyData();
  checkURLParameters();
  
  console.log('✅ Faculty Management initialized successfully');
});

// ============================================
// VIEW MODE TOGGLE
// ============================================

function setupViewModeToggle() {
  const viewModeButtons = document.querySelectorAll('.view-mode-btn');
  
  viewModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      setViewMode(mode);
    });
  });
}

function setViewMode(mode) {
  STATE.viewMode = mode;
  
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    }
  });
  
  const grid = document.getElementById('facultyGrid');
  if (grid) {
    grid.className = mode === 'list' ? 'faculty-list' : 'faculty-grid';
  }
  
  renderFacultyDirectory();
}

// ============================================
// TAB NAVIGATION
// ============================================

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
  
  const switchToAddBtn = document.getElementById('switchToAddTab');
  if (switchToAddBtn) {
    switchToAddBtn.addEventListener('click', () => {
      switchTab('add');
    });
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const targetTab = document.getElementById(`${tabName}-tab`);
  if (targetTab) {
    targetTab.classList.add('active');
    STATE.currentTab = tabName;
    
    if (tabName === 'directory') {
      renderFacultyDirectory();
    } else if (tabName === 'deactivated') {
      renderDeactivatedFaculty();
    }
  }
}

// ============================================
// FACULTY DATA MANAGEMENT
// ============================================

async function loadFacultyData() {
  try {
    console.log('📡 Loading faculty from API...');
    const response = await fetch(`${API_BASE}/faculty`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    STATE.facultyData = await response.json();
    STATE.filteredFaculty = STATE.facultyData.filter(f => f.is_active);
    
    console.log(`✅ Loaded ${STATE.facultyData.length} faculty records from API`);
    
    if (STATE.currentTab === 'directory') {
      renderFacultyDirectory();
    }
    
  } catch (error) {
    console.error('❌ Error loading faculty data from API:', error);
    showToast('Failed to load faculty data. Check your server connection.', 'error');
    STATE.facultyData = [];
    STATE.filteredFaculty = [];
  }
}

function getActiveFaculty() {
  return STATE.facultyData.filter(f => f.is_active);
}

function getDeactivatedFaculty() {
  return STATE.facultyData.filter(f => !f.is_active);
}

function getFacultyById(id) {
  return STATE.facultyData.find(f => f.id === id);
}

function buildFullName(firstName, middleInitial, lastName) {
  if (middleInitial && middleInitial.trim()) {
    return `${firstName} ${middleInitial}. ${lastName}`;
  }
  return `${firstName} ${lastName}`;
}

// ============================================
// FACULTY DIRECTORY
// ============================================

function setupFilterListeners() {
  const searchInput = document.getElementById('facultySearch');
  const filterProgram = document.getElementById('filterProgram');
  const filterEmployment = document.getElementById('filterEmployment');
  const filterDegree = document.getElementById('filterDegree');
  const clearFilters = document.getElementById('clearFilters');
  
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (filterProgram) filterProgram.addEventListener('change', applyFilters);
  if (filterEmployment) filterEmployment.addEventListener('change', applyFilters);
  if (filterDegree) filterDegree.addEventListener('change', applyFilters);
  
  if (clearFilters) {
    clearFilters.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterProgram) filterProgram.value = '';
      if (filterEmployment) filterEmployment.value = '';
      if (filterDegree) filterDegree.value = '';
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
    const fullName = faculty.full_name || buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    const matchesSearch = !searchTerm || fullName.toLowerCase().includes(searchTerm);
    const matchesProgram = !programFilter || faculty.program === programFilter;
    const matchesEmployment = !employmentFilter || faculty.employment_type === employmentFilter;
    const matchesDegree = !degreeFilter || faculty.highest_degree === degreeFilter;
    
    return matchesSearch && matchesProgram && matchesEmployment && matchesDegree;
  });
  
  renderFacultyDirectory();
}

function renderFacultyDirectory() {
  const grid = document.getElementById('facultyGrid');
  if (!grid) return;
  
  grid.className = STATE.viewMode === 'list' ? 'faculty-list' : 'faculty-grid';
  
  if (STATE.filteredFaculty.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users-slash"></i>
        <h4>No faculty members found</h4>
        <p>Try adjusting your filters or add new faculty</p>
        <button class="btn-primary" onclick="switchTab('add')">
          <i class="fas fa-user-plus"></i> Add Faculty
        </button>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = STATE.filteredFaculty.map(faculty => createFacultyCard(faculty)).join('');
  attachFacultyCardListeners();
}

function createFacultyCard(faculty) {
  const imageSrc = faculty.image_path || '/public/assets/images/default-avatar.png';
  const age = faculty.birthdate ? calculateAge(faculty.birthdate) : 'N/A';
  const fullName = faculty.full_name || buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
  
  if (STATE.viewMode === 'list') {
    return `
      <div class="faculty-card-list" data-id="${faculty.id}">
        <div class="faculty-list-image">
          <img src="${imageSrc}" alt="${fullName}" onerror="this.src='/public/assets/images/default-avatar.png'">
        </div>
        <div class="faculty-list-info">
          <h3 class="faculty-name">${fullName}</h3>
          <div class="faculty-badges">
            <span class="faculty-badge badge-program">${faculty.program}</span>
            <span class="faculty-badge badge-employment">${faculty.employment_type}</span>
            <span class="faculty-badge badge-degree">${faculty.highest_degree}</span>
          </div>
          <div class="faculty-details">
            ${faculty.contact_number ? `<p><i class="fas fa-phone"></i> ${faculty.contact_number}</p>` : ''}
            ${faculty.birthdate ? `<p><i class="fas fa-birthday-cake"></i> Age: ${age}</p>` : ''}
          </div>
        </div>
        <div class="faculty-list-actions">
          <button class="btn-view" data-id="${faculty.id}">
            <i class="fas fa-eye"></i> View Profile
          </button>
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
  
  return `
    <div class="faculty-card" data-id="${faculty.id}">
      <div class="faculty-image-container">
        <img src="${imageSrc}" alt="${fullName}" onerror="this.src='/public/assets/images/default-avatar.png'">
      </div>
      <h3 class="faculty-name">${fullName}</h3>
      <div class="faculty-info">
        <span class="faculty-badge badge-program">${faculty.program}</span>
        <span class="faculty-badge badge-employment">${faculty.employment_type}</span>
        <span class="faculty-badge badge-degree">${faculty.highest_degree}</span>
      </div>
      <div class="faculty-meta">
        ${faculty.contact_number ? `<p><i class="fas fa-phone"></i> ${faculty.contact_number}</p>` : ''}
        ${faculty.birthdate ? `<p><i class="fas fa-birthday-cake"></i> Age: ${age}</p>` : ''}
      </div>
      <div class="faculty-actions">
        <button class="btn-view" data-id="${faculty.id}">
          <i class="fas fa-eye"></i> View
        </button>
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
  document.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      viewFacultyProfile(id);
    });
  });
  
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      openEditModal(id);
    });
  });
  
  document.querySelectorAll('.btn-deactivate').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      confirmDeactivate(id);
    });
  });
}

// ============================================
// ADD FACULTY FORM
// ============================================

function setupFormListeners() {
  const addForm = document.getElementById('addFacultyForm');
  if (addForm) {
    addForm.addEventListener('submit', handleAddFaculty);
  }
  
  const cancelBtn = document.getElementById('cancelAddFaculty');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      switchTab('directory');
    });
  }
  
  setupImagePreview('facultyImage', 'imagePreview');
  
  const hasMasters = document.getElementById('hasMasters');
  const hasDoctorate = document.getElementById('hasDoctorate');
  
  if (hasMasters) {
    hasMasters.addEventListener('change', (e) => {
      const section = document.getElementById('mastersSection');
      if (section) {
        section.style.display = e.target.checked ? 'block' : 'none';
        toggleRequiredFields(section, e.target.checked);
      }
    });
  }
  
  if (hasDoctorate) {
    hasDoctorate.addEventListener('change', (e) => {
      const section = document.getElementById('doctorateSection');
      if (section) {
        section.style.display = e.target.checked ? 'block' : 'none';
        toggleRequiredFields(section, e.target.checked);
      }
    });
  }
  
  const addCertBtn = document.getElementById('addCertificationBtn');
  if (addCertBtn) {
    addCertBtn.addEventListener('click', addCertificationField);
  }
  
  const addAgencyBtn = document.getElementById('addAgencyBtn');
  if (addAgencyBtn) {
    addAgencyBtn.addEventListener('click', addAgencyField);
  }
  
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', closeModal);
  });
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

function toggleRequiredFields(section, required) {
  const inputs = section.querySelectorAll('input, select');
  inputs.forEach(input => {
    if (required) {
      input.setAttribute('required', 'required');
    } else {
      input.removeAttribute('required');
    }
  });
}

function addCertificationField() {
  const container = document.getElementById('certificationsContainer');
  const certId = STATE.nextCertId++;
  
  const certHTML = `
    <div class="certification-item" id="cert-${certId}">
      <div class="certification-header">
        <h4><i class="fas fa-certificate"></i> Certification #${certId}</h4>
        <button type="button" class="btn-remove-cert" onclick="removeCertification(${certId})">
          <i class="fas fa-times"></i> Remove
        </button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Certification Name *</label>
          <input type="text" name="cert_name_${certId}" placeholder="e.g., Professional Teacher License" required>
        </div>
        <div class="form-group">
          <label>Issuing Organization *</label>
          <input type="text" name="cert_org_${certId}" placeholder="e.g., PRC, CHED, TESDA" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>License/Certificate Number</label>
          <input type="text" name="cert_number_${certId}" placeholder="Optional">
        </div>
        <div class="form-group">
          <label>Issue Date</label>
          <input type="date" name="cert_issue_${certId}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Expiry Date</label>
          <input type="date" name="cert_expiry_${certId}">
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', certHTML);
}

window.removeCertification = function(id) {
  const cert = document.getElementById(`cert-${id}`);
  if (cert) {
    cert.remove();
    renumberCertifications();
  }
};

function renumberCertifications() {
  const certItems = document.querySelectorAll('.certification-item');
  certItems.forEach((item, index) => {
    const newNumber = index + 1;
    const header = item.querySelector('.certification-header h4');
    if (header) {
      header.innerHTML = `<i class="fas fa-certificate"></i> Certification #${newNumber}`;
    }
  });
  STATE.nextCertId = certItems.length + 1;
}

function addAgencyField() {
  const container = document.getElementById('agenciesContainer');
  const agencyId = STATE.nextAgencyId++;
  
  const agencyHTML = `
    <div class="agency-item" id="agency-${agencyId}">
      <div class="agency-header">
        <h4><i class="fas fa-building"></i> Government Agency/Company #${agencyId}</h4>
        <button type="button" class="btn-remove-agency" onclick="removeAgency(${agencyId})">
          <i class="fas fa-times"></i> Remove
        </button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Agency/Company Type *</label>
          <select name="agency_type_${agencyId}" required>
            <option value="">Select Type</option>
            <option value="Government Agency">Government Agency</option>
            <option value="Private Company">Private Company</option>
            <option value="Educational Institution">Educational Institution</option>
            <option value="Non-Profit Organization">Non-Profit Organization</option>
          </select>
        </div>
        <div class="form-group">
          <label>Agency/Company Name *</label>
          <input type="text" name="agency_name_${agencyId}" placeholder="e.g., Department of Education" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Position/Role</label>
          <input type="text" name="agency_position_${agencyId}" placeholder="e.g., Consultant, Part-time Instructor">
        </div>
        <div class="form-group">
          <label>Employment Status</label>
          <select name="agency_status_${agencyId}">
            <option value="">Select Status</option>
            <option value="Active">Currently Working</option>
            <option value="Inactive">No Longer Working</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" name="agency_start_${agencyId}">
        </div>
        <div class="form-group">
          <label>End Date (if applicable)</label>
          <input type="date" name="agency_end_${agencyId}">
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', agencyHTML);
}

window.removeAgency = function(id) {
  const agency = document.getElementById(`agency-${id}`);
  if (agency) {
    agency.remove();
    renumberAgencies();
  }
};

function renumberAgencies() {
  const agencyItems = document.querySelectorAll('.agency-item');
  agencyItems.forEach((item, index) => {
    const newNumber = index + 1;
    const header = item.querySelector('.agency-header h4');
    if (header) {
      header.innerHTML = `<i class="fas fa-building"></i> Government Agency/Company #${newNumber}`;
    }
  });
  STATE.nextAgencyId = agencyItems.length + 1;
}

async function handleAddFaculty(e) {
  e.preventDefault();
  
  try {
    console.log('📝 Starting faculty creation...');
    
    const formData = new FormData();
    
    formData.append('last_name', document.getElementById('facultyLastName').value.trim());
    formData.append('first_name', document.getElementById('facultyFirstName').value.trim());
    formData.append('middle_initial', document.getElementById('facultyMiddleInitial').value.trim() || '');
    formData.append('birthdate', document.getElementById('facultyBirthdate').value);
    formData.append('contact_number', document.getElementById('facultyContact').value.trim());
    formData.append('program', document.getElementById('facultyProgram').value);
    formData.append('employment_type', document.getElementById('employmentType').value);
    formData.append('highest_degree', document.getElementById('highestDegree').value);
    
    const pdsUpdate = document.getElementById('lastPdsUpdate').value;
    if (pdsUpdate) {
      formData.append('last_pds_update', pdsUpdate);
    }
    
    formData.append('created_by', localStorage.getItem('adminid') || 'adminSerrano');
    
    const imageFile = document.getElementById('facultyImage').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    // Education data
    const undergradTitle = document.getElementById('undergradTitle').value.trim();
    const undergradSchool = document.getElementById('undergradSchool').value.trim();
    const undergradYear = document.getElementById('undergradYear').value;
    const undergradField = document.getElementById('undergradField').value.trim();
    
    if (undergradTitle && undergradSchool && undergradYear) {
      formData.append('undergradTitle', undergradTitle);
      formData.append('undergradSchool', undergradSchool);
      formData.append('undergradYear', undergradYear);
      if (undergradField) formData.append('undergradField', undergradField);
    }
    
    if (document.getElementById('hasMasters')?.checked) {
      const mastersTitle = document.getElementById('mastersTitle').value.trim();
      const mastersSchool = document.getElementById('mastersSchool').value.trim();
      const mastersYear = document.getElementById('mastersYear').value;
      const mastersField = document.getElementById('mastersField').value.trim();
      
      if (mastersTitle && mastersSchool && mastersYear) {
        formData.append('mastersTitle', mastersTitle);
        formData.append('mastersSchool', mastersSchool);
        formData.append('mastersYear', mastersYear);
        if (mastersField) formData.append('mastersField', mastersField);
      }
    }
    
    if (document.getElementById('hasDoctorate')?.checked) {
      const doctorateTitle = document.getElementById('doctorateTitle').value.trim();
      const doctorateSchool = document.getElementById('doctorateSchool').value.trim();
      const doctorateYear = document.getElementById('doctorateYear').value;
      const doctorateField = document.getElementById('doctorateField').value.trim();
      
      if (doctorateTitle && doctorateSchool && doctorateYear) {
        formData.append('doctorateTitle', doctorateTitle);
        formData.append('doctorateSchool', doctorateSchool);
        formData.append('doctorateYear', doctorateYear);
        if (doctorateField) formData.append('doctorateField', doctorateField);
      }
    }
    
    // Certifications
    const certItems = document.querySelectorAll('.certification-item');
    certItems.forEach((item, index) => {
      const certNum = index + 1;
      const id = item.id.split('-')[1];
      
      const name = document.querySelector(`[name="cert_name_${id}"]`)?.value;
      const org = document.querySelector(`[name="cert_org_${id}"]`)?.value;
      const number = document.querySelector(`[name="cert_number_${id}"]`)?.value;
      const issue = document.querySelector(`[name="cert_issue_${id}"]`)?.value;
      const expiry = document.querySelector(`[name="cert_expiry_${id}"]`)?.value;
      
      if (name && org) {
        formData.append(`cert_name_${certNum}`, name);
        formData.append(`cert_org_${certNum}`, org);
        if (number) formData.append(`cert_number_${certNum}`, number);
        if (issue) formData.append(`cert_issue_${certNum}`, issue);
        if (expiry) formData.append(`cert_expiry_${certNum}`, expiry);
      }
    });
    
    // Agencies
    const agencyItems = document.querySelectorAll('.agency-item');
    agencyItems.forEach((item, index) => {
      const agencyNum = index + 1;
      const id = item.id.split('-')[1];
      
      const type = document.querySelector(`[name="agency_type_${id}"]`)?.value;
      const name = document.querySelector(`[name="agency_name_${id}"]`)?.value;
      const position = document.querySelector(`[name="agency_position_${id}"]`)?.value;
      const status = document.querySelector(`[name="agency_status_${id}"]`)?.value;
      const start = document.querySelector(`[name="agency_start_${id}"]`)?.value;
      const end = document.querySelector(`[name="agency_end_${id}"]`)?.value;
      
      if (type && name) {
        formData.append(`agency_type_${agencyNum}`, type);
        formData.append(`agency_name_${agencyNum}`, name);
        if (position) formData.append(`agency_position_${agencyNum}`, position);
        if (status) formData.append(`agency_status_${agencyNum}`, status);
        if (start) formData.append(`agency_start_${agencyNum}`, start);
        if (end) formData.append(`agency_end_${agencyNum}`, end);
      }
    });
    
    console.log('📡 Sending complete faculty data to API...');
    
    const response = await fetch(`${API_BASE}/faculty`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Faculty created:', result);
    
    const fullName = buildFullName(
      document.getElementById('facultyFirstName').value.trim(),
      document.getElementById('facultyMiddleInitial').value.trim(),
      document.getElementById('facultyLastName').value.trim()
    );
    
    showToast(`Faculty "${fullName}" added successfully with all information!`, 'success');
    
    document.getElementById('addFacultyForm').reset();
    document.getElementById('imagePreview').innerHTML = `
      <i class="fas fa-user-circle"></i>
      <p>Upload Photo</p>
    `;
    document.getElementById('mastersSection').style.display = 'none';
    document.getElementById('doctorateSection').style.display = 'none';
    document.getElementById('certificationsContainer').innerHTML = '';
    document.getElementById('agenciesContainer').innerHTML = '';
    
    STATE.nextCertId = 1;
    STATE.nextAgencyId = 1;
    
    await loadFacultyData();
    switchTab('directory');
    
  } catch (error) {
    console.error('❌ Error adding faculty:', error);
    showToast(`Failed to add faculty: ${error.message}`, 'error');
  }
}

// ============================================
// VIEW FACULTY PROFILE
// ============================================

async function viewFacultyProfile(id) {
  try {
    console.log(`📡 Fetching complete faculty profile for ID: ${id}`);
    
    const response = await fetch(`${API_BASE}/faculty/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch faculty profile');
    }
    
    const faculty = await response.json();
    
    const age = faculty.birthdate ? calculateAge(faculty.birthdate) : 'N/A';
    const pdsStatus = checkPDSStatus(faculty.last_pds_update);
    const fullName = faculty.full_name || buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    
    let educationHTML = '';
    if (faculty.education && faculty.education.length > 0) {
      educationHTML = faculty.education.map(edu => `
        <div class="education-item">
          <div class="education-header">
            <h4><i class="fas fa-graduation-cap"></i> ${edu.degree_level} Degree</h4>
          </div>
          <p class="degree-title"><strong>${edu.degree_title}</strong></p>
          <p class="school"><i class="fas fa-university"></i> ${edu.school_name}</p>
          <p class="year"><i class="fas fa-calendar"></i> Year Graduated: ${edu.year_graduated}</p>
          ${edu.field_of_study ? `<p class="field"><i class="fas fa-book"></i> Field: ${edu.field_of_study}</p>` : ''}
        </div>
      `).join('');
    } else {
      educationHTML = '<p class="no-data">No education records available</p>';
    }
    
    let certificationsHTML = '';
    if (faculty.certifications && faculty.certifications.length > 0) {
      certificationsHTML = faculty.certifications.map(cert => `
        <div class="certification-card">
          <h4><i class="fas fa-certificate"></i> ${cert.certification_name}</h4>
          <p class="cert-org"><i class="fas fa-building"></i> Issued by: ${cert.issuing_organization}</p>
          ${cert.license_number ? `<p class="cert-number"><i class="fas fa-id-card"></i> License/Certificate #: ${cert.license_number}</p>` : ''}
          ${cert.issue_date || cert.expiry_date ? `
            <p class="cert-dates">
              ${cert.issue_date ? `<i class="fas fa-calendar-check"></i> Issued: ${new Date(cert.issue_date).toLocaleDateString()}` : ''}
              ${cert.expiry_date ? ` <i class="fas fa-calendar-times"></i> Expires: ${new Date(cert.expiry_date).toLocaleDateString()}` : ''}
            </p>
          ` : ''}
        </div>
      `).join('');
    } else {
      certificationsHTML = '<p class="no-data">No certifications available</p>';
    }
    
    let agenciesHTML = '';
    if (faculty.government_agencies && faculty.government_agencies.length > 0) {
      agenciesHTML = faculty.government_agencies.map(agency => `
        <div class="agency-card">
          <div class="agency-card-header">
            <h4><i class="fas fa-building"></i> ${agency.agency_name}</h4>
            <span class="status-badge ${agency.employment_status === 'Active' ? 'status-active' : 'status-inactive'}">
              ${agency.employment_status || 'Active'}
            </span>
          </div>
          <p class="agency-type"><i class="fas fa-tag"></i> ${agency.agency_type}</p>
          ${agency.position ? `<p class="agency-position"><i class="fas fa-briefcase"></i> Position: ${agency.position}</p>` : ''}
          ${agency.start_date || agency.end_date ? `
            <p class="agency-dates">
              <i class="fas fa-calendar"></i>
              ${agency.start_date ? new Date(agency.start_date).toLocaleDateString() : 'N/A'}
              ${agency.end_date ? ` - ${new Date(agency.end_date).toLocaleDateString()}` : ' - Present'}
            </p>
          ` : ''}
        </div>
      `).join('');
    } else {
      agenciesHTML = '<p class="no-data">No government agencies/companies listed</p>';
    }
    
    const content = `
      <div class="faculty-profile">
        <div class="profile-header">
          <img src="${faculty.image_path || '/public/assets/images/default-avatar.png'}" alt="${fullName}">
          <div>
            <h2>${fullName}</h2>
            <p class="profile-subtitle">${faculty.program} - ${faculty.employment_type}</p>
          </div>
        </div>
        
        <div class="faculty-profile-section">
          <h3><i class="fas fa-user"></i> Basic Information</h3>
          <div class="profile-info-grid">
            ${faculty.contact_number ? `<div class="profile-info-item"><label>Contact</label><div class="value">${faculty.contact_number}</div></div>` : ''}
            ${faculty.birthdate ? `<div class="profile-info-item"><label>Age</label><div class="value">${age} years</div></div>` : ''}
            <div class="profile-info-item"><label>Employment</label><div class="value">${faculty.employment_type}</div></div>
            <div class="profile-info-item"><label>Highest Degree</label><div class="value">${faculty.highest_degree}</div></div>
            ${faculty.last_pds_update ? `<div class="profile-info-item"><label>PDS Updated</label><div class="value">${faculty.last_pds_update}</div></div>` : ''}
            ${faculty.last_pds_update ? `<div class="profile-info-item"><label>PDS Status</label><div class="value ${pdsStatus.class}">${pdsStatus.text}</div></div>` : ''}
          </div>
        </div>
        
        <div class="faculty-profile-section">
          <h3><i class="fas fa-graduation-cap"></i> Educational Background</h3>
          <div class="education-list">${educationHTML}</div>
        </div>
        
        <div class="faculty-profile-section">
          <h3><i class="fas fa-certificate"></i> Professional Certifications</h3>
          <div class="certification-list">${certificationsHTML}</div>
        </div>
        
        <div class="faculty-profile-section">
          <h3><i class="fas fa-building"></i> Government Agencies & Other Companies</h3>
          <div class="agency-list">${agenciesHTML}</div>
        </div>
      </div>
    `;
    
    const modalContent = document.getElementById('viewFacultyContent');
    if (modalContent) {
      modalContent.innerHTML = content;
    }
    
    const modal = document.getElementById('viewFacultyModal');
    if (modal) {
      modal.classList.add('active');
    }
    
  } catch (error) {
    console.error('❌ Error viewing faculty profile:', error);
    showToast('Failed to load faculty profile', 'error');
  }
}

// ============================================
// FIX #1: PROPER EDIT FUNCTIONALITY
// ============================================

async function openEditModal(id) {
  try {
    console.log(`📝 Opening edit modal for faculty ID: ${id}`);
    STATE.editingFacultyId = id;
    
    const response = await fetch(`${API_BASE}/faculty/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch faculty data');
    }
    
    const faculty = await response.json();
    const fullName = faculty.full_name || buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    
    // Build edit form HTML
    const editFormHTML = `
      <!-- Basic Information Section -->
      <div class="form-section">
        <h3 class="section-title"><i class="fas fa-user"></i> Basic Information</h3>
        
        <div class="form-row">
          <div class="form-group full-width">
            <label>Faculty Image</label>
            <div class="image-upload-container">
              <input type="file" id="editFacultyImage" accept="image/*">
              <div class="image-preview" id="editImagePreview">
                <img src="${faculty.image_path || '/public/assets/images/default-avatar.png'}" alt="${fullName}">
              </div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Last Name *</label>
            <input type="text" id="editLastName" value="${faculty.last_name}" required>
          </div>
          <div class="form-group">
            <label>First Name *</label>
            <input type="text" id="editFirstName" value="${faculty.first_name}" required>
          </div>
          <div class="form-group">
            <label>Middle Initial</label>
            <input type="text" id="editMiddleInitial" value="${faculty.middle_initial || ''}" maxlength="5">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Birthdate *</label>
            <input type="date" id="editBirthdate" value="${faculty.birthdate || ''}" required>
          </div>
          <div class="form-group">
            <label>Contact Number *</label>
            <input type="tel" id="editContact" value="${faculty.contact_number || ''}" required>
          </div>
        </div>
      </div>

      <!-- Employment Information Section -->
      <div class="form-section">
        <h3 class="section-title"><i class="fas fa-briefcase"></i> Employment Information</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label>Program *</label>
            <select id="editProgram" required>
              <option value="BSIT" ${faculty.program === 'BSIT' ? 'selected' : ''}>BSIT - Information Technology</option>
              <option value="BSCpE" ${faculty.program === 'BSCpE' ? 'selected' : ''}>BSCpE - Computer Engineering</option>
              <option value="BSHM" ${faculty.program === 'BSHM' ? 'selected' : ''}>BSHM - Hospitality Management</option>
              <option value="BSOA" ${faculty.program === 'BSOA' ? 'selected' : ''}>BSOA - Office Administration</option>
              <option value="Gen Ed" ${faculty.program === 'Gen Ed' ? 'selected' : ''}>Gen Ed - General Education</option>
              <option value="Others" ${faculty.program === 'Others' ? 'selected' : ''}>Others</option>
            </select>
          </div>
          <div class="form-group">
            <label>Employment Type *</label>
            <select id="editEmploymentType" required>
              <option value="Regular" ${faculty.employment_type === 'Regular' ? 'selected' : ''}>Regular</option>
              <option value="Part-Time" ${faculty.employment_type === 'Part-Time' ? 'selected' : ''}>Part-Time</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Highest Degree *</label>
            <select id="editHighestDegree" required>
              <option value="Bachelor" ${faculty.highest_degree === 'Bachelor' ? 'selected' : ''}>Bachelor</option>
              <option value="Master" ${faculty.highest_degree === 'Master' ? 'selected' : ''}>Master</option>
              <option value="Doctorate" ${faculty.highest_degree === 'Doctorate' ? 'selected' : ''}>Doctorate (PhD)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Last PDS Update Year</label>
            <input type="number" id="editLastPdsUpdate" value="${faculty.last_pds_update || ''}" min="1990" max="2030">
          </div>
        </div>
      </div>
    `;
    
    const modalContent = document.getElementById('editFormContent');
    if (modalContent) {
      modalContent.innerHTML = editFormHTML;
    }
    
    // Setup image preview for edit
    setupImagePreview('editFacultyImage', 'editImagePreview');
    
    // Setup form submission
    const editForm = document.getElementById('editFacultyForm');
    if (editForm) {
      editForm.onsubmit = handleEditFaculty;
    }
    
    const modal = document.getElementById('editFacultyModal');
    if (modal) {
      modal.classList.add('active');
    }
    
  } catch (error) {
    console.error('❌ Error opening edit modal:', error);
    showToast('Failed to load faculty data for editing', 'error');
  }
}

async function handleEditFaculty(e) {
  e.preventDefault();
  
  try {
    console.log(`💾 Updating faculty ID: ${STATE.editingFacultyId}`);
    
    const formData = new FormData();
    
    formData.append('last_name', document.getElementById('editLastName').value.trim());
    formData.append('first_name', document.getElementById('editFirstName').value.trim());
    formData.append('middle_initial', document.getElementById('editMiddleInitial').value.trim() || '');
    formData.append('birthdate', document.getElementById('editBirthdate').value);
    formData.append('contact_number', document.getElementById('editContact').value.trim());
    formData.append('program', document.getElementById('editProgram').value);
    formData.append('employment_type', document.getElementById('editEmploymentType').value);
    formData.append('highest_degree', document.getElementById('editHighestDegree').value);
    
    const pdsUpdate = document.getElementById('editLastPdsUpdate').value;
    if (pdsUpdate) {
      formData.append('last_pds_update', pdsUpdate);
    }
    
    // FIX: Handle image upload in edit
    const imageFile = document.getElementById('editFacultyImage').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    const response = await fetch(`${API_BASE}/faculty/${STATE.editingFacultyId}`, {
      method: 'PUT',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update faculty');
    }
    
    const result = await response.json();
    
    showToast('Faculty updated successfully!', 'success');
    closeModal();
    await loadFacultyData();
    
  } catch (error) {
    console.error('❌ Error updating faculty:', error);
    showToast(`Failed to update faculty: ${error.message}`, 'error');
  }
}

// ============================================
// DEACTIVATE & RESTORE
// ============================================

async function confirmDeactivate(id) {
  const faculty = getFacultyById(id);
  if (!faculty) return;
  
  const fullName = faculty.full_name || buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
  
  if (confirm(`Are you sure you want to deactivate "${fullName}"?\n\nThey will be excluded from all reports and analytics.`)) {
    try {
      const response = await fetch(`${API_BASE}/faculty/${id}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to deactivate faculty');
      }
      
      showToast(`Faculty "${fullName}" has been deactivated`, 'success');
      await loadFacultyData();
      
    } catch (error) {
      console.error('❌ Error deactivating faculty:', error);
      showToast('Failed to deactivate faculty', 'error');
    }
  }
}

// ============================================
// FIX #2: DEACTIVATED FACULTY WITH DELETE BUTTON
// ============================================

async function renderDeactivatedFaculty() {
  const grid = document.getElementById('deactivatedFacultyGrid');
  if (!grid) return;
  
  try {
    const response = await fetch(`${API_BASE}/faculty/deactivated`);
    if (!response.ok) {
      throw new Error('Failed to fetch deactivated faculty');
    }
    
    const deactivated = await response.json();
    
    if (deactivated.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <h4>No deactivated faculty</h4>
          <p>All faculty members are currently active</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = deactivated.map(faculty => {
      const imageSrc = faculty.image_path || '/public/assets/images/default-avatar.png';
      const fullName = faculty.full_name || buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
      return `
        <div class="faculty-card" data-id="${faculty.id}">
          <div class="faculty-image-container">
            <img src="${imageSrc}" alt="${fullName}">
          </div>
          <h3 class="faculty-name">${fullName}</h3>
          <div class="faculty-info">
            <span class="faculty-badge badge-program">${faculty.program}</span>
            <span class="faculty-badge badge-employment">${faculty.employment_type}</span>
          </div>
          <p class="deactivated-date">Deactivated: ${new Date(faculty.deactivated_at).toLocaleDateString()}</p>
          <div class="faculty-actions">
            <button class="btn-restore" onclick="restoreFaculty(${faculty.id})">
              <i class="fas fa-undo"></i> Restore
            </button>
            <button class="btn-delete-permanent" onclick="confirmDeleteFaculty(${faculty.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('❌ Error loading deactivated faculty:', error);
    showToast('Failed to load deactivated faculty', 'error');
  }
}

window.restoreFaculty = async function(id) {
  try {
    const response = await fetch(`${API_BASE}/faculty/${id}`);
    if (!response.ok) throw new Error('Faculty not found');
    const facultyData = await response.json();
    const fullName = facultyData.full_name || buildFullName(facultyData.first_name, facultyData.middle_initial, facultyData.last_name);
    
    if (confirm(`Restore "${fullName}" to active status?`)) {
      const restoreResponse = await fetch(`${API_BASE}/faculty/${id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!restoreResponse.ok) {
        throw new Error('Failed to restore faculty');
      }
      
      showToast(`Faculty "${fullName}" has been restored`, 'success');
      await loadFacultyData();
      renderDeactivatedFaculty();
    }
  } catch (error) {
    console.error('❌ Error restoring faculty:', error);
    showToast('Failed to restore faculty', 'error');
  }
};

// FIX #2: Delete permanently function
window.confirmDeleteFaculty = async function(id) {
  try {
    const response = await fetch(`${API_BASE}/faculty/${id}`);
    if (!response.ok) throw new Error('Faculty not found');
    const facultyData = await response.json();
    const fullName = facultyData.full_name || buildFullName(facultyData.first_name, facultyData.middle_initial, facultyData.last_name);
    
    if (confirm(`⚠️ WARNING: This will PERMANENTLY DELETE "${fullName}" from the database.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`)) {
      const deleteResponse = await fetch(`${API_BASE}/faculty/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete faculty');
      }
      
      showToast(`Faculty "${fullName}" has been permanently deleted`, 'success');
      await loadFacultyData();
      renderDeactivatedFaculty();
    }
  } catch (error) {
    console.error('❌ Error deleting faculty:', error);
    showToast('Failed to delete faculty', 'error');
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function checkURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const program = urlParams.get('program');
  
  if (program) {
    const filterProgram = document.getElementById('filterProgram');
    if (filterProgram) {
      filterProgram.value = program;
      applyFilters();
    }
  }
}

function calculateAge(birthdate) {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

function checkPDSStatus(lastUpdate) {
  if (!lastUpdate) {
    return { text: 'Never Updated', class: 'text-danger' };
  }
  
  const currentYear = new Date().getFullYear();
  const updateYear = parseInt(lastUpdate);
  
  if (updateYear < currentYear - 2) {
    return { text: 'Severely Outdated (2+ years)', class: 'text-danger' };
  } else if (updateYear < currentYear - 1) {
    return { text: 'Outdated (1+ year)', class: 'text-warning' };
  } else {
    return { text: 'Up to Date', class: 'text-success' };
  }
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
  STATE.editingFacultyId = null;
}

function showToast(message, type = 'info') {
  if (typeof toast === 'function') {
    toast(message, type);
    return;
  }
  console.log(`[${type.toUpperCase()}] ${message}`);
}

console.log('✅ facultyManagement.js (FIXED VERSION) loaded successfully');