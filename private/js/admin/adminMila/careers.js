// careers.js - Career Directory Management (Information Dissemination Only)

// ============================================
// STATE & DOM ELEMENTS
// ============================================

let currentCategoryFilter = 'all';
let editingOrgId = null;

// Organization elements
const categoryFilterTabs = document.querySelectorAll('.filter-tab');
const orgsFeed = document.getElementById('orgsFeed');
const openOrgModalBtn = document.getElementById('openOrgModal');
const orgModal = document.getElementById('orgModal');
const cancelOrgBtn = document.getElementById('cancelOrg');
const submitOrgBtn = document.getElementById('submitOrg');
const orgModalTitle = document.getElementById('orgModalTitle');

// Organization form fields
const orgName = document.getElementById('orgName');
const orgCategory = document.getElementById('orgCategory');
const orgDescription = document.getElementById('orgDescription');
const orgWebsite = document.getElementById('orgWebsite');
const orgCareersPage = document.getElementById('orgCareersPage');
const orgLogo = document.getElementById('orgLogo');
const orgStatus = document.getElementById('orgStatus');

// ============================================
// CATEGORY FILTER TABS
// ============================================

categoryFilterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    categoryFilterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategoryFilter = tab.dataset.category;
    loadOrganizations();
  });
});

// ============================================
// ORGANIZATION MODAL HANDLERS
// ============================================

openOrgModalBtn.addEventListener('click', () => {
  orgModal.style.display = 'flex';
  orgModalTitle.textContent = 'Add Partner Organization';
  submitOrgBtn.textContent = 'Add Organization';
  editingOrgId = null;
  clearOrgForm();
  orgName.focus();
});

cancelOrgBtn.addEventListener('click', () => {
  orgModal.style.display = 'none';
  clearOrgForm();
});

window.addEventListener('click', e => {
  if (e.target === orgModal) {
    orgModal.style.display = 'none';
    clearOrgForm();
  }
});

function clearOrgForm() {
  orgName.value = '';
  orgCategory.value = '';
  orgDescription.value = '';
  orgWebsite.value = '';
  orgCareersPage.value = '';
  orgLogo.value = '';
  orgStatus.value = 'active';
  editingOrgId = null;
}

// ============================================
// SUBMIT ORGANIZATION
// ============================================

submitOrgBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  if (!orgName.value.trim() || !orgCategory.value || !orgDescription.value.trim() || !orgWebsite.value.trim()) {
    alertSystem.warning('Please fill in all required fields.');
    return;
  }

  const orgData = {
    name: orgName.value.trim(),
    category: orgCategory.value,
    description: orgDescription.value.trim(),
    website_url: orgWebsite.value.trim(),
    careers_page_url: orgCareersPage.value.trim() || null,
    logo_url: orgLogo.value.trim() || null,
    status: orgStatus.value,
    adminid: 'adminmila'
  };

  let url = '';
  let method = '';

  if (editingOrgId) {
    url = `http://localhost:3000/api/career/organizations/update/${editingOrgId}`;
    method = 'PUT';
  } else {
    url = 'http://localhost:3000/api/career/organizations/create';
    method = 'POST';
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orgData)
    });

    const data = await res.json();

    if (data.success) {
      orgModal.style.display = 'none';
      clearOrgForm();
      loadOrganizations();
    } else {
      alertSystem.warning(data.message || 'Failed to save organization.');
    }
  } catch (err) {
    console.error('Error submitting organization:', err);
    alertSystem.error('Error submitting organization. Please try again.');
  }
});

// ============================================
// LOAD ORGANIZATIONS
// ============================================

async function loadOrganizations() {
  orgsFeed.innerHTML = '<div class="loading">Loading organizations...</div>';
  
  try {
    const res = await fetch('http://localhost:3000/api/career/organizations/all');
    const data = await res.json();

    if (data.success && data.organizations.length > 0) {
      let filteredOrgs = data.organizations;
      
      if (currentCategoryFilter !== 'all') {
        filteredOrgs = data.organizations.filter(o => o.category === currentCategoryFilter);
      }

      if (filteredOrgs.length === 0) {
        orgsFeed.innerHTML = `
          <div class="placeholder">
            <i class="fa-solid fa-filter"></i>
            <h2>No ${currentCategoryFilter} organizations</h2>
            <p>Try selecting a different category.</p>
          </div>
        `;
        return;
      }

      orgsFeed.innerHTML = '';
      filteredOrgs.forEach(org => {
        const orgCard = createOrgCard(org);
        orgsFeed.appendChild(orgCard);
      });
    } else {
      orgsFeed.innerHTML = `
        <div class="placeholder">
          <i class="fa-solid fa-building"></i>
          <h2>No partner organizations yet</h2>
          <p>Add partner organizations to build your career directory.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading organizations:', err);
    orgsFeed.innerHTML = `
      <div class="placeholder">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h2>Error loading organizations</h2>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

// ============================================
// CREATE ORGANIZATION CARD
// ============================================

function createOrgCard(org) {
  const card = document.createElement('div');
  card.className = 'org-card';
  
  const categoryIcons = {
    'Government': 'fa-landmark',
    'University Unit': 'fa-university',
    'Private Company': 'fa-building'
  };
  
  const categoryIcon = categoryIcons[org.category] || 'fa-building';
  
  card.innerHTML = `
    <div class="org-actions">
      <button class="menu-btn">
        <i class="fa-solid fa-ellipsis-v"></i>
      </button>
      <div class="menu-dropdown" style="display: none;">
        <button class="org-edit"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="org-delete"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    </div>
    
    <div class="org-status-row">
      <span class="org-status ${org.status}">${org.status}</span>
      <span class="org-category-badge">
        <i class="fa-solid ${categoryIcon}"></i> ${org.category}
      </span>
    </div>
    
    <div class="org-header">
      ${org.logo_url ? `
        <img src="${org.logo_url}" 
             alt="${org.name}" 
             class="org-logo" 
             onerror="this.onerror=null; this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<div class=\\'org-logo-fallback\\'><i class=\\'fa-solid ${categoryIcon}\\'></i></div>');"
             onload="this.style.opacity='1';"
             style="opacity: 0; transition: opacity 0.3s ease;">
      ` : `
        <div class="org-logo-fallback">
          <i class="fa-solid ${categoryIcon}"></i>
        </div>
      `}
      <h3>${org.name}</h3>
    </div>

    <div class="org-description">
      <p>${org.description}</p>
    </div>

    <div class="org-links">
      <a href="${org.website_url}" target="_blank" rel="noopener" class="org-link org-link-primary">
        <i class="fa-solid fa-globe"></i>
        <span>Visit Website</span>
        <i class="fa-solid fa-external-link-alt"></i>
      </a>
      ${org.careers_page_url ? `
      <a href="${org.careers_page_url}" target="_blank" rel="noopener" class="org-link org-link-secondary">
        <i class="fa-solid fa-briefcase"></i>
        <span>View Careers Page</span>
        <i class="fa-solid fa-external-link-alt"></i>
      </a>
      ` : ''}
    </div>
  `;

  // Menu handlers
  const menuBtn = card.querySelector('.menu-btn');
  const dropdown = card.querySelector('.menu-dropdown');
  
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.menu-dropdown').forEach(d => {
      if (d !== dropdown) d.style.display = 'none';
    });
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });

  // Edit button
  card.querySelector('.org-edit').addEventListener('click', () => {
    dropdown.style.display = 'none';
    editOrganization(org);
  });

  // Delete button
  card.querySelector('.org-delete').addEventListener('click', async () => {
    dropdown.style.display = 'none';
    if (confirm(`Delete ${org.name} from the directory?`)) {
      try {
        const res = await fetch(`http://localhost:3000/api/career/organizations/delete/${org.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          loadOrganizations();
        } else {
          alertSystem.warning(data.message);
        }
      } catch (err) {
        console.error('Error deleting organization:', err);
      }
    }
  });

  return card;
}

// ============================================
// EDIT ORGANIZATION
// ============================================

function editOrganization(org) {
  editingOrgId = org.id;
  orgName.value = org.name;
  orgCategory.value = org.category;
  orgDescription.value = org.description || '';
  orgWebsite.value = org.website_url || '';
  orgCareersPage.value = org.careers_page_url || '';
  orgLogo.value = org.logo_url || '';
  orgStatus.value = org.status;
  
  orgModalTitle.textContent = 'Edit Partner Organization';
  submitOrgBtn.textContent = 'Update Organization';
  orgModal.style.display = 'flex';
}

// ============================================
// INITIALIZE
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  loadOrganizations();
  initializeProfileDropdown();
});