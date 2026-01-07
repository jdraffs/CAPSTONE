// scholarships.js - Scholarship Opportunities Page Handler

// State Management
let allScholarships = [];
let filteredScholarships = [];

// DOM Elements
const scholarshipGrid = document.getElementById('scholarshipGrid');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const searchInput = document.getElementById('scholarshipSearch');
const statusFilter = document.getElementById('statusFilter');
const providerFilter = document.getElementById('providerFilter');
const typeFilter = document.getElementById('typeFilter');
const clearFiltersBtn = document.getElementById('clearFilters');
const modal = document.getElementById('scholarshipModal');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModal');
const modalOverlay = modal.querySelector('.modal-overlay');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadScholarships();
    setupEventListeners();
});

// Load scholarships data
async function loadScholarships() {
    showLoading();
    try {
        // Try to fetch from API (future implementation)
        // const response = await fetch('/api/scholarships');
        // const data = await response.json();
        
        // For now, load from JSON file
        const response = await fetch('/public/data/scholarships.json');
        const data = await response.json();
        
        allScholarships = data.scholarships || [];
        filteredScholarships = [...allScholarships];
        
        renderScholarships();
    } catch (error) {
        console.error('Error loading scholarships:', error);
        showError();
    }
}

// Render scholarships to the grid
function renderScholarships() {
    hideLoading();
    
    if (filteredScholarships.length === 0) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    scholarshipGrid.innerHTML = '';
    
    filteredScholarships.forEach(scholarship => {
        const card = createScholarshipCard(scholarship);
        scholarshipGrid.appendChild(card);
    });
}

// Create scholarship card element
function createScholarshipCard(scholarship) {
    const card = document.createElement('div');
    card.className = 'scholarship-card';
    card.onclick = () => openScholarshipModal(scholarship);
    
    const statusClass = scholarship.status.toLowerCase();
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${scholarship.title}</h3>
            <p class="card-provider">
                <i class="fas fa-building"></i>
                ${scholarship.provider}
            </p>
        </div>
        
        <div class="card-body">
            <div class="card-badges">
                <span class="badge badge-status ${statusClass}">${scholarship.status}</span>
                <span class="badge badge-type">${scholarship.type}</span>
                <span class="badge badge-campus">
                    <i class="fas fa-map-marker-alt"></i> PUP Parañaque
                </span>
            </div>
            
            <div class="card-info">
                <div class="info-item">
                    <i class="fas fa-graduation-cap info-icon"></i>
                    <span>${scholarship.eligibility}</span>
                </div>
            </div>
            
            <p class="card-description">${scholarship.description}</p>
            
            <div class="card-footer">
                <div class="deadline-info">
                    <i class="fas fa-clock deadline-icon"></i>
                    <span>Deadline: ${scholarship.deadline}</span>
                </div>
                <button class="view-details-btn">View Details</button>
            </div>
        </div>
    `;
    
    return card;
}

// Open scholarship detail modal
function openScholarshipModal(scholarship) {
    const statusClass = scholarship.status.toLowerCase();
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${scholarship.title}</h2>
            <p class="modal-provider">
                <i class="fas fa-building"></i>
                ${scholarship.provider}
            </p>
            <div class="modal-badges">
                <span class="badge badge-status ${statusClass}">${scholarship.status}</span>
                <span class="badge badge-type">${scholarship.type}</span>
                <span class="badge badge-campus">
                    <i class="fas fa-map-marker-alt"></i> For PUP Parañaque Students
                </span>
            </div>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">
                <i class="fas fa-info-circle"></i> About This Scholarship
            </h3>
            <p class="modal-description">${scholarship.description}</p>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">
                <i class="fas fa-check-circle"></i> Eligibility Requirements
            </h3>
            <ul class="modal-list">
                ${scholarship.requirements.map(req => `<li>${req}</li>`).join('')}
            </ul>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">
                <i class="fas fa-file-alt"></i> Required Documents
            </h3>
            <ul class="modal-list">
                ${scholarship.documents.map(doc => `<li>${doc}</li>`).join('')}
            </ul>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">
                <i class="fas fa-list-ol"></i> Application Process
            </h3>
            <ul class="modal-list">
                ${scholarship.process.map((step, index) => 
                    `<li><strong>Step ${index + 1}:</strong> ${step}</li>`
                ).join('')}
            </ul>
        </div>
        
        <div class="modal-info-grid">
            <div class="modal-info-item">
                <p class="modal-info-label">Application Deadline</p>
                <p class="modal-info-value">
                    <i class="fas fa-calendar-alt"></i> ${scholarship.deadline}
                </p>
            </div>
            <div class="modal-info-item">
                <p class="modal-info-label">Contact Information</p>
                <p class="modal-info-value">
                    <i class="fas fa-envelope"></i> ${scholarship.contact || 'See campus office'}
                </p>
            </div>
        </div>
        
        <div class="modal-notice">
            <p>
                <strong><i class="fas fa-shield-alt"></i> Verified Information:</strong> 
                This scholarship information has been verified by PUP Parañaque Campus administration.
                For questions or concerns, please contact the Student Affairs Office.
            </p>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Filter scholarships
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;
    const provider = providerFilter.value;
    const type = typeFilter.value;
    
    filteredScholarships = allScholarships.filter(scholarship => {
        const matchesSearch = 
            scholarship.title.toLowerCase().includes(searchTerm) ||
            scholarship.provider.toLowerCase().includes(searchTerm) ||
            scholarship.description.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !status || scholarship.status === status;
        const matchesProvider = !provider || scholarship.provider_type === provider;
        const matchesType = !type || scholarship.type === type;
        
        return matchesSearch && matchesStatus && matchesProvider && matchesType;
    });
    
    renderScholarships();
}

// Clear all filters
function clearFilters() {
    searchInput.value = '';
    statusFilter.value = '';
    providerFilter.value = '';
    typeFilter.value = '';
    
    filteredScholarships = [...allScholarships];
    renderScholarships();
}

// Setup event listeners
function setupEventListeners() {
    // Search input with debounce
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });
    
    // Filter dropdowns
    statusFilter.addEventListener('change', applyFilters);
    providerFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    
    // Clear filters button
    clearFiltersBtn.addEventListener('click', clearFilters);
    
    // Modal close events
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// UI State Management
function showLoading() {
    loadingState.style.display = 'block';
    scholarshipGrid.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideLoading() {
    loadingState.style.display = 'none';
    scholarshipGrid.style.display = 'grid';
}

function showEmptyState() {
    emptyState.style.display = 'block';
    scholarshipGrid.style.display = 'none';
}

function hideEmptyState() {
    emptyState.style.display = 'none';
    scholarshipGrid.style.display = 'grid';
}

function showError() {
    hideLoading();
    scholarshipGrid.style.display = 'none';
    emptyState.style.display = 'block';
    
    const emptyIcon = emptyState.querySelector('.empty-icon');
    const emptyTitle = emptyState.querySelector('.empty-title');
    const emptyText = emptyState.querySelector('.empty-text');
    
    emptyIcon.className = 'fas fa-exclamation-circle empty-icon';
    emptyTitle.textContent = 'Unable to Load Scholarships';
    emptyText.textContent = 'We encountered an error loading the scholarship data. Please refresh the page or try again later.';
}