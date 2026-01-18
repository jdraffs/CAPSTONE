// careers-public.js - Public Career Directory

// ============================================
// STATE & DOM ELEMENTS
// ============================================

let allOrganizations = [];
let currentCategory = 'all';
let currentSearch = '';

// DOM Elements
const organizationsGrid = document.getElementById('organizationsGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('organizationSearch');
const categoryBtns = document.querySelectorAll('.category-btn');

// ============================================
// CATEGORY FILTER
// ============================================

categoryBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    filterAndDisplayOrganizations();
  });
});

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value.toLowerCase().trim();
  filterAndDisplayOrganizations();
});

// ============================================
// LOAD ORGANIZATIONS
// ============================================

async function loadOrganizations() {
  showLoading();
  
  try {
    const res = await fetch('http://localhost:3000/api/career/public/organizations');
    const data = await res.json();

    if (data.success && data.organizations.length > 0) {
      allOrganizations = data.organizations;
      filterAndDisplayOrganizations();
    } else {
      showEmptyState();
    }
  } catch (err) {
    console.error('Error loading organizations:', err);
    showError();
  }
}

// ============================================
// FILTER AND DISPLAY
// ============================================

function filterAndDisplayOrganizations() {
  let filtered = allOrganizations;

  // Filter by category
  if (currentCategory !== 'all') {
    filtered = filtered.filter(org => org.category === currentCategory);
  }

  // Filter by search
  if (currentSearch) {
    filtered = filtered.filter(org => 
      org.name.toLowerCase().includes(currentSearch) ||
      org.description.toLowerCase().includes(currentSearch)
    );
  }

  if (filtered.length === 0) {
    showEmptyState();
  } else {
    displayOrganizations(filtered);
  }
}

// ============================================
// DISPLAY ORGANIZATIONS
// ============================================

function displayOrganizations(organizations) {
  hideLoading();
  emptyState.style.display = 'none';
  organizationsGrid.style.display = 'grid';
  organizationsGrid.innerHTML = '';

  organizations.forEach(org => {
    const card = createOrganizationCard(org);
    organizationsGrid.appendChild(card);
  });
}

// ============================================
// CREATE ORGANIZATION CARD
// ============================================

function createOrganizationCard(org) {
  const card = document.createElement('div');
  card.className = 'org-card';

  const categoryIcons = {
    'Government': 'fa-landmark',
    'University Unit': 'fa-university',
    'Private Company': 'fa-building'
  };

  const categoryColors = {
    'Government': '#1e88e5',
    'University Unit': '#43a047',
    'Private Company': '#e53935'
  };

  const categoryIcon = categoryIcons[org.category] || 'fa-building';
  const categoryColor = categoryColors[org.category] || '#666';

  card.innerHTML = `
    <div class="org-category-badge" style="background-color: ${categoryColor}15; color: ${categoryColor};">
      <i class="fas ${categoryIcon}"></i>
      ${org.category}
    </div>

    ${org.logo_url ? `
    <div class="org-logo-container">
      <img src="${org.logo_url}" 
           alt="${org.name}" 
           class="org-logo" 
           onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'org-logo-placeholder-inline\\'><i class=\\'fas ${categoryIcon}\\'></i></div>';"
           onload="this.style.opacity='1';"
           style="opacity: 0; transition: opacity 0.3s ease;">
    </div>
    ` : `
    <div class="org-logo-placeholder">
      <i class="fas ${categoryIcon}"></i>
    </div>
    `}

    <div class="org-content">
      <h3 class="org-name">${org.name}</h3>
      <p class="org-description">${org.description}</p>
    </div>

    <div class="org-actions">
      <a href="${org.website_url}" target="_blank" rel="noopener noreferrer" class="org-btn org-btn-primary">
        <i class="fas fa-globe"></i>
        Visit Website
        <i class="fas fa-external-link-alt"></i>
      </a>
      ${org.careers_page_url ? `
      <a href="${org.careers_page_url}" target="_blank" rel="noopener noreferrer" class="org-btn org-btn-secondary">
        <i class="fas fa-briefcase"></i>
        View Careers Page
        <i class="fas fa-external-link-alt"></i>
      </a>
      ` : ''}
    </div>
  `;

  return card;
}

// ============================================
// UI STATE HELPERS
// ============================================

function showLoading() {
  loadingState.style.display = 'flex';
  emptyState.style.display = 'none';
  organizationsGrid.style.display = 'none';
}

function hideLoading() {
  loadingState.style.display = 'none';
}

function showEmptyState() {
  hideLoading();
  emptyState.style.display = 'flex';
  organizationsGrid.style.display = 'none';
}

function showError() {
  hideLoading();
  organizationsGrid.style.display = 'none';
  emptyState.style.display = 'flex';
  emptyState.innerHTML = `
    <i class="fas fa-exclamation-triangle empty-icon" style="color: #e53935;"></i>
    <h3 class="empty-title">Error Loading Organizations</h3>
    <p class="empty-text">
      Unable to load partner organizations. Please refresh the page or try again later.
    </p>
  `;
}

// ============================================
// INITIALIZE
// ============================================

window.addEventListener('DOMContentLoaded', loadOrganizations);