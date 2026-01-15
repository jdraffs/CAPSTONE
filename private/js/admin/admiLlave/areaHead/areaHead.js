// private/js/admin/admiLlave/areaHead/areaHead.js

let currentUser = null;
let activeCycleId = null;
let currentCycle = null;
let assignedArea = null;
let sections = [];
let submissionControl = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadCurrentUser();
    await loadActiveCycle();
    await loadAssignedArea();
    renderDashboard();
    setupEventListeners();
    
    // Auto-refresh every 30 seconds
    setInterval(async () => {
        if (activeCycleId && assignedArea) {
            await loadSections();
            await loadSubmissionControl();
        }
    }, 30000);
});

// ============================================
// LOAD USER DATA
// ============================================

async function loadCurrentUser() {
    try {
        // Get user from session/localStorage
        const userStr = localStorage.getItem('accreditation_user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            document.querySelector('.user-name').textContent = currentUser.full_name || currentUser.username;
        } else {
            // Redirect to login if no user found
            window.location.href = '/private/html/AdminLogin/login.html';
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Failed to load user information', 'error');
    }
}

async function loadActiveCycle() {
    try {
        const response = await fetch('/api/accreditation/cycle/active');
        const data = await response.json();

        if (data.cycle) {
            currentCycle = data.cycle;
            activeCycleId = data.cycle.id;
        } else {
            showNoCycleMessage();
        }
    } catch (error) {
        console.error('Error loading active cycle:', error);
        showToast('Failed to load cycle information', 'error');
    }
}

async function loadAssignedArea() {
    if (!activeCycleId || !currentUser) return;

    try {
        const response = await fetch(`/api/accreditation/areas/${activeCycleId}`);
        const data = await response.json();

        if (data.areas) {
            // Find the area assigned to this user
            assignedArea = data.areas.find(area => area.area_head_id === currentUser.id);
            
            if (!assignedArea) {
                showNoAssignmentMessage();
                return;
            }
        }
    } catch (error) {
        console.error('Error loading assigned area:', error);
        showToast('Failed to load assigned area', 'error');
    }
}

async function loadSubmissionControl() {
    if (!activeCycleId) return;

    try {
        const response = await fetch(`/api/accreditation/submission-control/${activeCycleId}`);
        const data = await response.json();

        if (data.control) {
            submissionControl = data.control;
            updateSubmissionStatus();
        }
    } catch (error) {
        console.error('Error loading submission control:', error);
    }
}

async function loadSections() {
    if (!activeCycleId || !assignedArea) return;

    try {
        const response = await fetch(`/api/accreditation/sections/${activeCycleId}/${assignedArea.area_id}`);
        const data = await response.json();

        if (data.sections) {
            sections = data.sections;
            displaySections(sections);
            updateStats();
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        showToast('Failed to load sections', 'error');
    }
}

// ============================================
// RENDER DASHBOARD
// ============================================

function renderDashboard() {
    const mainContent = document.getElementById('mainContent');
    
    if (!activeCycleId) {
        showNoCycleMessage();
        return;
    }

    if (!assignedArea) {
        showNoAssignmentMessage();
        return;
    }

    mainContent.innerHTML = `
        <!-- Page Header -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="main-title">Area ${assignedArea.area_number}: ${assignedArea.area_name}</h1>
                <p class="subtitle">Academic Year ${currentCycle.academic_year}</p>
            </div>
            <div class="submission-status-badge" id="submissionStatusBadge">
                <i class="fas fa-sync fa-spin"></i> Loading...
            </div>
        </div>

        <!-- Quick Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon total">
                    <i class="fas fa-list"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="totalSections">0</div>
                    <div class="stat-label">Total Sections</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon submitted">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="submittedSections">0</div>
                    <div class="stat-label">Submitted Links</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon pending">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="pendingSections">0</div>
                    <div class="stat-label">Pending Links</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon reviewed">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="reviewedSections">0</div>
                    <div class="stat-label">Reviewed</div>
                </div>
            </div>
        </div>

        <!-- Instructions Card -->
        <div class="info-card" id="instructionsCard">
            <div class="info-header">
                <i class="fas fa-info-circle"></i>
                <h3>Submission Instructions</h3>
            </div>
            <div class="info-content">
                <p>Welcome! You are responsible for submitting Google Drive folder links for all sections in your area.</p>
                <ul class="instruction-list">
                    <li><i class="fas fa-check"></i> Click "Add Link" to submit a Google Drive folder URL for each section</li>
                    <li><i class="fas fa-check"></i> Ensure the folder is shared with appropriate permissions</li>
                    <li><i class="fas fa-check"></i> You can edit links while submissions are open</li>
                    <li><i class="fas fa-check"></i> Links will be locked when AdminLlave closes submissions</li>
                </ul>
            </div>
        </div>

        <!-- Search and Filter -->
        <div class="search-filter-bar">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="searchSections" placeholder="Search sections..." onkeyup="filterSections()">
            </div>
            <div class="filter-group">
                <select id="filterStatus" onchange="filterSections()">
                    <option value="">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="not_submitted">Not Submitted</option>
                    <option value="reviewed">Reviewed</option>
                </select>
            </div>
        </div>

        <!-- Sections Table -->
        <div class="sections-card">
            <div class="card-header">
                <h2 class="card-title">
                    <i class="fas fa-folder"></i> Section Links
                </h2>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Section Name</th>
                            <th>Google Drive Link</th>
                            <th>Status</th>
                            <th>Date Submitted</th>
                            <th>Review Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="sectionsTableBody">
                        <tr>
                            <td colspan="6" class="loading-cell">Loading sections...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add/Edit Link Modal -->
        <div class="modal" id="linkModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Add Google Drive Link</h3>
                    <button class="modal-close" onclick="closeLinkModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="sectionNameDisplay">Section Name</label>
                        <input type="text" id="sectionNameDisplay" disabled>
                    </div>
                    <div class="form-group">
                        <label for="googleDriveLink">Google Drive Folder URL *</label>
                        <input type="url" id="googleDriveLink" placeholder="https://drive.google.com/drive/folders/..." required>
                        <small class="form-hint">Paste the full Google Drive folder link here</small>
                    </div>
                    <div class="form-group">
                        <label for="linkNotes">Notes (Optional)</label>
                        <textarea id="linkNotes" rows="3" placeholder="Add any notes about this submission..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeLinkModal()">Cancel</button>
                    <button class="btn-primary" id="submitLinkBtn" onclick="submitLink()">
                        <i class="fas fa-save"></i> Save Link
                    </button>
                </div>
            </div>
        </div>
    `;

    // Update page title
    document.getElementById('pageTitle').textContent = `Area ${assignedArea.area_number}: ${assignedArea.area_name}`;

    // Load data
    loadSubmissionControl();
    loadSections();
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function updateSubmissionStatus() {
    const badge = document.getElementById('submissionStatusBadge');
    
    if (!submissionControl) {
        badge.innerHTML = '<i class="fas fa-question-circle"></i> Unknown';
        badge.className = 'submission-status-badge unknown';
        return;
    }

    if (submissionControl.is_open) {
        badge.innerHTML = '<i class="fas fa-lock-open"></i> Submissions Open';
        badge.className = 'submission-status-badge open';
    } else {
        badge.innerHTML = '<i class="fas fa-lock"></i> Submissions Closed';
        badge.className = 'submission-status-badge closed';
    }
}

function displaySections(sectionsToDisplay) {
    const tbody = document.getElementById('sectionsTableBody');
    
    if (sectionsToDisplay.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="no-data">No sections found</td></tr>
        `;
        return;
    }

    tbody.innerHTML = sectionsToDisplay.map(section => {
        const hasLink = section.google_drive_link;
        const isReviewed = section.review_status && section.review_status !== 'Not Reviewed';
        const isLocked = section.is_locked || !submissionControl?.is_open;

        const linkDisplay = hasLink 
            ? `<a href="${section.google_drive_link}" target="_blank" class="link-preview">
                <i class="fas fa-external-link-alt"></i> Open Folder
               </a>`
            : '<span class="no-link">No link submitted</span>';

        const statusBadge = hasLink
            ? '<span class="badge badge-green"><i class="fas fa-check"></i> Submitted</span>'
            : '<span class="badge badge-gray"><i class="fas fa-times"></i> Not Submitted</span>';

        const dateDisplay = section.submitted_at 
            ? new Date(section.submitted_at).toLocaleString()
            : '-';

        const reviewBadge = getReviewStatusBadge(section.review_status);

        const actionButtons = isLocked
            ? '<span class="text-muted"><i class="fas fa-lock"></i> Locked</span>'
            : hasLink
                ? `<button class="btn-icon" onclick="editLink(${section.section_id})" title="Edit Link">
                    <i class="fas fa-edit"></i>
                   </button>
                   <button class="btn-icon btn-danger" onclick="removeLink(${section.section_id})" title="Remove Link">
                    <i class="fas fa-trash"></i>
                   </button>`
                : `<button class="btn-primary btn-sm" onclick="addLink(${section.section_id}, '${section.section_name}')">
                    <i class="fas fa-plus"></i> Add Link
                   </button>`;

        return `
            <tr>
                <td><strong>${section.section_name}</strong></td>
                <td>${linkDisplay}</td>
                <td>${statusBadge}</td>
                <td>${dateDisplay}</td>
                <td>${reviewBadge}</td>
                <td class="action-buttons">${actionButtons}</td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    const total = sections.length;
    const submitted = sections.filter(s => s.google_drive_link).length;
    const pending = total - submitted;
    const reviewed = sections.filter(s => s.review_status && s.review_status !== 'Not Reviewed').length;

    document.getElementById('totalSections').textContent = total;
    document.getElementById('submittedSections').textContent = submitted;
    document.getElementById('pendingSections').textContent = pending;
    document.getElementById('reviewedSections').textContent = reviewed;
}

function filterSections() {
    const searchTerm = document.getElementById('searchSections').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    let filtered = sections;

    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.section_name.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter === 'submitted') {
        filtered = filtered.filter(s => s.google_drive_link);
    } else if (statusFilter === 'not_submitted') {
        filtered = filtered.filter(s => !s.google_drive_link);
    } else if (statusFilter === 'reviewed') {
        filtered = filtered.filter(s => s.review_status && s.review_status !== 'Not Reviewed');
    }

    displaySections(filtered);
}

// ============================================
// LINK MANAGEMENT
// ============================================

let currentSectionId = null;

function addLink(sectionId, sectionName) {
    if (!submissionControl?.is_open) {
        showToast('Submissions are currently closed', 'warning');
        return;
    }

    currentSectionId = sectionId;
    document.getElementById('modalTitle').textContent = 'Add Google Drive Link';
    document.getElementById('sectionNameDisplay').value = sectionName;
    document.getElementById('googleDriveLink').value = '';
    document.getElementById('linkNotes').value = '';
    document.getElementById('linkModal').style.display = 'flex';
}

function editLink(sectionId) {
    if (!submissionControl?.is_open) {
        showToast('Submissions are currently closed', 'warning');
        return;
    }

    const section = sections.find(s => s.section_id === sectionId);
    if (!section) return;

    currentSectionId = sectionId;
    document.getElementById('modalTitle').textContent = 'Edit Google Drive Link';
    document.getElementById('sectionNameDisplay').value = section.section_name;
    document.getElementById('googleDriveLink').value = section.google_drive_link || '';
    document.getElementById('linkNotes').value = '';
    document.getElementById('linkModal').style.display = 'flex';
}

function closeLinkModal() {
    document.getElementById('linkModal').style.display = 'none';
    currentSectionId = null;
}

async function submitLink() {
    const link = document.getElementById('googleDriveLink').value.trim();

    if (!link) {
        showToast('Please enter a Google Drive link', 'error');
        return;
    }

    // Validate Google Drive URL
    if (!link.includes('drive.google.com')) {
        showToast('Please enter a valid Google Drive link', 'error');
        return;
    }

    try {
        const section = sections.find(s => s.section_id === currentSectionId);
        const isUpdate = section && section.google_drive_link;

        const response = await fetch(`/api/accreditation/submission/${currentSectionId}`, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                google_drive_link: link,
                submitted_by: currentUser.id
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast(isUpdate ? 'Link updated successfully' : 'Link submitted successfully', 'success');
            closeLinkModal();
            await loadSections();
        } else {
            showToast(data.error || 'Failed to save link', 'error');
        }
    } catch (error) {
        console.error('Error submitting link:', error);
        showToast('Failed to save link', 'error');
    }
}

async function removeLink(sectionId) {
    if (!submissionControl?.is_open) {
        showToast('Submissions are currently closed', 'warning');
        return;
    }

    if (!confirm('Are you sure you want to remove this link?')) {
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/submission/${sectionId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Link removed successfully', 'success');
            await loadSections();
        } else {
            showToast(data.error || 'Failed to remove link', 'error');
        }
    } catch (error) {
        console.error('Error removing link:', error);
        showToast('Failed to remove link', 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getReviewStatusBadge(status) {
    if (!status || status === 'Not Reviewed') {
        return '<span class="badge badge-gray"><i class="fas fa-clock"></i> Not Reviewed</span>';
    } else if (status === 'Complete') {
        return '<span class="badge badge-green"><i class="fas fa-check-circle"></i> Complete</span>';
    } else if (status === 'Needs Revision') {
        return '<span class="badge badge-yellow"><i class="fas fa-exclamation-triangle"></i> Needs Revision</span>';
    } else if (status === 'Incomplete') {
        return '<span class="badge badge-red"><i class="fas fa-times-circle"></i> Incomplete</span>';
    }
    return '<span class="badge badge-gray">-</span>';
}

function showNoCycleMessage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="no-data-message">
            <i class="fas fa-exclamation-circle"></i>
            <h2>No Active Accreditation Cycle</h2>
            <p>There is currently no active accreditation cycle. Please wait for AdminLlave to create a new cycle.</p>
        </div>
    `;
}

function showNoAssignmentMessage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="no-data-message">
            <i class="fas fa-user-slash"></i>
            <h2>No Area Assignment</h2>
            <p>You have not been assigned to any area yet. Please contact AdminLlave for area assignment.</p>
        </div>
    `;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setupEventListeners() {
    // Modal close on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('linkModal');
        if (e.target === modal) {
            closeLinkModal();
        }
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);