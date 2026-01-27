// scholarships.js - Public Side Connected to Database (COMPLETE VERSION - FIXED)

// State Management
let allScholarships = [];
let filteredScholarships = [];

// DOM Elements
const scholarshipGrid = document.getElementById('scholarshipGrid');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const searchInput = document.getElementById('scholarshipSearch');
const statusFilter = document.getElementById('statusFilter');
const courseFilter = document.getElementById('courseFilter');
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

// Load scholarships from database
async function loadScholarships() {
    showLoading();
    try {
        const response = await fetch('http://localhost:3000/api/scholarships/public');
        const data = await response.json();
        
        if (data.success) {
            allScholarships = data.scholarships.map(transformScholarship);
            filteredScholarships = [...allScholarships];
            renderScholarships();
        } else {
            throw new Error('Failed to load scholarships');
        }
    } catch (error) {
        console.error('Error loading scholarships:', error);
        showError();
    }
}

// Transform database scholarship to display format
function transformScholarship(dbScholarship) {
    // Parse eligibility
    let requirements = [];
    if (dbScholarship.eligibility) {
        requirements = dbScholarship.eligibility
            .split(/\n|•/)
            .map(r => r.trim())
            .filter(r => r.length > 0);
    }
    
    // Parse benefits
    let benefitsList = [];
    if (dbScholarship.benefits) {
        benefitsList = dbScholarship.benefits
            .split(/\n|•/)
            .map(b => b.trim())
            .filter(b => b.length > 0);
    }
    
    // Parse required documents
    let documents = [];
    if (dbScholarship.required_documents) {
        documents = dbScholarship.required_documents
            .split(/\n|•/)
            .map(d => d.trim())
            .filter(d => d.length > 0);
    }
    if (documents.length === 0) {
        documents = [
            'Certificate of Enrollment',
            'Transcript of Records',
            'Valid ID',
            'Other requirements as specified'
        ];
    }
    
    // Parse application process
    let process = [];
    if (dbScholarship.application_process) {
        process = dbScholarship.application_process
            .split(/\n|•/)
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }
    if (process.length === 0) {
        process = [
            'Submit required documents to the Student Affairs Office',
            'Wait for application review',
            'Attend interview if required',
            'Receive notification of application status'
        ];
    }
    
    // Parse external links
    let externalLinks = [];
    if (dbScholarship.external_links) {
        externalLinks = dbScholarship.external_links
            .split(/\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);
    }
    
    // Format dates
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };
    
    return {
        id: dbScholarship.id,
        title: dbScholarship.title,
        provider: dbScholarship.provider,
        provider_type: 'Government',
        type: 'Academic',
        status: dbScholarship.status.charAt(0).toUpperCase() + dbScholarship.status.slice(1),
        description: dbScholarship.description,
        eligibility: requirements[0] || dbScholarship.eligibility,
        requirements: requirements,
        benefits: benefitsList,
        documents: documents,
        process: process,
        externalLinks: externalLinks,
        deadline: formatDate(dbScholarship.deadline),
        open_date: formatDate(dbScholarship.open_date),
        contact: dbScholarship.contact_info || 'Student Affairs Office - PUP Parañaque',
        amount: dbScholarship.amount,
        slots: dbScholarship.slots,
        files: dbScholarship.files || [],
        eligibleCourses: dbScholarship.eligible_courses || 'All Programs'
    };
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

// Create scholarship card element - FIXED
function createScholarshipCard(scholarship) {
    const card = document.createElement('div');
    card.className = 'scholarship-card';
    card.onclick = () => openScholarshipModal(scholarship);
    
    const statusClass = scholarship.status.toLowerCase();
    
    // Create course badges HTML - FIXED to show "All Programs"
    let courseBadgesHTML = '';
    if (scholarship.eligibleCourses) {
        if (scholarship.eligibleCourses === 'All Programs') {
            // Show "All Programs" as a single badge with special styling
            courseBadgesHTML = `<span class="badge badge-courses badge-all-programs">
                <i class="fas fa-graduation-cap"></i> All Programs
            </span>`;
        } else {
            // Show specific programs
            courseBadgesHTML = `<span class="badge badge-courses">
                <i class="fas fa-user-graduate"></i> ${scholarship.eligibleCourses}
            </span>`;
        }
    }
    
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
                ${courseBadgesHTML}
            </div>
            
            <div class="card-info">
                <div class="info-item">
                    <i class="fas fa-graduation-cap info-icon"></i>
                    <span>${scholarship.eligibility}</span>
                </div>
                ${scholarship.amount ? `
                <div class="info-item">
                    <i class="fas fa-money-bill-wave info-icon"></i>
                    <span>${scholarship.amount}</span>
                </div>
                ` : ''}
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

// Get file icon based on file type
function getFileIcon(mimeType) {
    if (!mimeType) return 'fa-file';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
    if (mimeType.includes('image')) return 'fa-image';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    return 'fa-file';
}

// Check if file is an image
function isImageFile(mimeType) {
    return mimeType && mimeType.includes('image/');
}

// Open scholarship detail modal
function openScholarshipModal(scholarship) {
    const statusClass = scholarship.status.toLowerCase();
    
    // Build course badges for modal - FIXED to show "All Programs"
    let courseBadgesHTML = '';
    if (scholarship.eligibleCourses) {
        if (scholarship.eligibleCourses === 'All Programs') {
            courseBadgesHTML = `<span class="badge badge-courses badge-all-programs">
                <i class="fas fa-graduation-cap"></i> All Programs
            </span>`;
        } else {
            courseBadgesHTML = `<span class="badge badge-courses">
                <i class="fas fa-user-graduate"></i> ${scholarship.eligibleCourses}
            </span>`;
        }
    }
    
    // Build attached files section
    let filesSection = '';
    if (scholarship.files && scholarship.files.length > 0) {
        const imageFiles = scholarship.files.filter(f => isImageFile(f.file_type));
        const documentFiles = scholarship.files.filter(f => !isImageFile(f.file_type));
        
        filesSection = `
            <div class="modal-section">
                <h3 class="modal-section-title">
                    <i class="fas fa-paperclip"></i> Attached Files
                </h3>
                <div class="modal-files">
                    ${imageFiles.map(file => `
                        <div class="file-image-preview">
                            <img src="http://localhost:3000${file.file_path}" alt="${file.file_name}">
                            <a href="http://localhost:3000${file.file_path}" 
                               target="_blank" 
                               download="${file.file_name}"
                               class="image-download-btn">
                                <i class="fas fa-download"></i> Download ${file.file_name}
                            </a>
                        </div>
                    `).join('')}
                    ${documentFiles.map(file => `
                        <a href="http://localhost:3000${file.file_path}" 
                           target="_blank" 
                           download="${file.file_name}"
                           class="file-download-link">
                            <i class="fas ${getFileIcon(file.file_type)}"></i>
                            ${file.file_name}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build external links section
    let linksSection = '';
    if (scholarship.externalLinks && scholarship.externalLinks.length > 0) {
        linksSection = `
            <div class="modal-section">
                <h3 class="modal-section-title">
                    <i class="fas fa-link"></i> External Links
                </h3>
                <div class="modal-links">
                    ${scholarship.externalLinks.map(link => `
                        <a href="${link}" target="_blank" rel="noopener noreferrer" class="external-link">
                            <i class="fas fa-external-link-alt"></i>
                            ${link}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Build eligible programs section - FIXED to show "All Programs" properly
    let eligibleProgramsSection = '';
    if (scholarship.eligibleCourses) {
        if (scholarship.eligibleCourses === 'All Programs') {
            eligibleProgramsSection = `
                <div class="modal-section">
                    <h3 class="modal-section-title">
                        <i class="fas fa-user-graduate"></i> Eligible Programs
                    </h3>
                    <div class="course-badges-container">
                        <span class="course-badge-public course-badge-all-programs">
                            <i class="fas fa-graduation-cap"></i> All Programs
                        </span>
                    </div>
                </div>
            `;
        } else {
            eligibleProgramsSection = `
                <div class="modal-section">
                    <h3 class="modal-section-title">
                        <i class="fas fa-user-graduate"></i> Eligible Programs
                    </h3>
                    <div class="course-badges-container">
                        ${scholarship.eligibleCourses.split(',').map(course => 
                            `<span class="course-badge-public">${course.trim()}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
    }
    
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
                ${courseBadgesHTML}
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
        
        ${eligibleProgramsSection}
        
        ${scholarship.benefits && scholarship.benefits.length > 0 ? `
        <div class="modal-section">
            <h3 class="modal-section-title">
                <i class="fas fa-gift"></i> Benefits & Coverage
            </h3>
            <ul class="modal-list">
                ${scholarship.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${filesSection}
        ${linksSection}
        
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
            ${scholarship.amount ? `
            <div class="modal-info-item">
                <p class="modal-info-label">Scholarship Amount</p>
                <p class="modal-info-value">
                    <i class="fas fa-money-bill-wave"></i> ${scholarship.amount}
                </p>
            </div>
            ` : ''}
            ${scholarship.slots ? `
            <div class="modal-info-item">
                <p class="modal-info-label">Available Slots</p>
                <p class="modal-info-value">
                    <i class="fas fa-users"></i> ${scholarship.slots} slots
                </p>
            </div>
            ` : ''}
            <div class="modal-info-item">
                <p class="modal-info-label">Opening Date</p>
                <p class="modal-info-value">
                    <i class="fas fa-calendar-check"></i> ${scholarship.open_date}
                </p>
            </div>
            <div class="modal-info-item">
                <p class="modal-info-label">Application Deadline</p>
                <p class="modal-info-value">
                    <i class="fas fa-calendar-alt"></i> ${scholarship.deadline}
                </p>
            </div>
            <div class="modal-info-item">
                <p class="modal-info-label">Contact Information</p>
                <p class="modal-info-value">
                    <i class="fas fa-envelope"></i> ${scholarship.contact}
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
    const course = courseFilter.value;
    const provider = providerFilter.value;
    const type = typeFilter.value;
    
    filteredScholarships = allScholarships.filter(scholarship => {
        const matchesSearch = 
            scholarship.title.toLowerCase().includes(searchTerm) ||
            scholarship.provider.toLowerCase().includes(searchTerm) ||
            scholarship.description.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !status || scholarship.status === status;
        
        // Course filtering logic
        const matchesCourse = !course || 
            scholarship.eligibleCourses === 'All Programs' || 
            scholarship.eligibleCourses.includes(course);
        
        const matchesProvider = !provider || scholarship.provider_type === provider;
        const matchesType = !type || scholarship.type === type;
        
        return matchesSearch && matchesStatus && matchesCourse && matchesProvider && matchesType;
    });
    
    renderScholarships();
}

// Clear all filters
function clearFilters() {
    searchInput.value = '';
    statusFilter.value = '';
    courseFilter.value = '';
    providerFilter.value = '';
    typeFilter.value = '';
    
    filteredScholarships = [...allScholarships];
    renderScholarships();
}

// Setup event listeners
function setupEventListeners() {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });
    
    statusFilter.addEventListener('change', applyFilters);
    courseFilter.addEventListener('change', applyFilters);
    providerFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    
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