// private/js/admin/admiLlave/accreditor/accreditor.js

let currentUser = null;
let activeCycleId = null;
let currentCycle = null;
let assignedAreas = [];
let allSections = [];
let filteredSections = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadCurrentUser();
    await loadActiveCycle();
    await loadAssignedAreas();
    renderDashboard();
    setupEventListeners();
    
    // Auto-refresh every 30 seconds
    setInterval(async () => {
        if (activeCycleId && assignedAreas.length > 0) {
            await loadSections();
        }
    }, 30000);
});

// ============================================
// LOAD USER DATA
// ============================================

async function loadCurrentUser() {
    try {
        const userStr = localStorage.getItem('accreditation_user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            document.querySelector('.user-name').textContent = currentUser.full_name || currentUser.username;
        } else {
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

async function loadAssignedAreas() {
    if (!activeCycleId || !currentUser) return;

    try {
        const response = await fetch(`/api/accreditation/areas/${activeCycleId}`);
        const data = await response.json();

        if (data.areas) {
            // Get accreditor assignments for this user
            const assignmentPromises = data.areas.map(async (area) => {
                const accResponse = await fetch(`/api/accreditation/area/${activeCycleId}/${area.area_id}/accreditors`);
                const accData = await accResponse.json();
                
                const isAssigned = accData.accreditors?.some(acc => acc.accreditor_id === currentUser.id);
                
                if (isAssigned) {
                    return {
                        area_id: area.area_id,
                        area_number: area.area_number,
                        area_name: area.area_name,
                        total_sections: area.total_sections
                    };
                }
                return null;
            });

            const results = await Promise.all(assignmentPromises);
            assignedAreas = results.filter(area => area !== null);

            if (assignedAreas.length === 0) {
                showNoAssignmentMessage();
            }
        }
    } catch (error) {
        console.error('Error loading assigned areas:', error);
        showToast('Failed to load assigned areas', 'error');
    }
}

async function loadSections() {
    if (!activeCycleId || assignedAreas.length === 0) return;

    try {
        // Load sections for all assigned areas
        const sectionPromises = assignedAreas.map(async (area) => {
            const response = await fetch(`/api/accreditation/sections/${activeCycleId}/${area.area_id}`);
            const data = await response.json();
            
            if (data.sections) {
                return data.sections.map(section => ({
                    ...section,
                    area_number: area.area_number,
                    area_name: area.area_name
                }));
            }
            return [];
        });

        const results = await Promise.all(sectionPromises);
        allSections = results.flat();
        filteredSections = allSections;
        
        displaySections(filteredSections);
        updateStats();
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

    if (assignedAreas.length === 0) {
        showNoAssignmentMessage();
        return;
    }

    mainContent.innerHTML = `
        <!-- Page Header -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="main-title">Accreditor Dashboard</h1>
                <p class="subtitle">Academic Year ${currentCycle.academic_year}</p>
            </div>
            <div class="assigned-areas-badge">
                <i class="fas fa-layer-group"></i>
                Assigned to ${assignedAreas.length} area${assignedAreas.length > 1 ? 's' : ''}
            </div>
        </div>

        <!-- Assigned Areas Cards -->
        <div class="assigned-areas-section">
            <h2 class="section-title">
                <i class="fas fa-clipboard-list"></i> Your Assigned Areas
            </h2>
            <div class="areas-grid">
                ${assignedAreas.map(area => `
                    <div class="area-card-compact">
                        <div class="area-header-compact">
                            <div class="area-number">Area ${area.area_number}</div>
                            <div class="area-sections">${area.total_sections} sections</div>
                        </div>
                        <div class="area-name-compact">${area.area_name}</div>
                    </div>
                `).join('')}
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
                <div class="stat-icon reviewed">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="reviewedSections">0</div>
                    <div class="stat-label">Reviewed</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon pending">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="pendingSections">0</div>
                    <div class="stat-label">Pending Review</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon complete">
                    <i class="fas fa-star"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="completeSections">0</div>
                    <div class="stat-label">Complete</div>
                </div>
            </div>
        </div>

        <!-- Instructions Card -->
        <div class="info-card">
            <div class="info-header">
                <i class="fas fa-info-circle"></i>
                <h3>Review Instructions</h3>
            </div>
            <div class="info-content">
                <p>As an Accreditor, you are responsible for reviewing and evaluating section documentation.</p>
                <ul class="instruction-list">
                    <li><i class="fas fa-check"></i> Click "Open Folder" to access the Google Drive documents</li>
                    <li><i class="fas fa-check"></i> Review all documents thoroughly</li>
                    <li><i class="fas fa-check"></i> Select appropriate review status for each section</li>
                    <li><i class="fas fa-check"></i> Provide clear comments if revisions are needed</li>
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
                <select id="filterArea" onchange="filterSections()">
                    <option value="">All Areas</option>
                    ${assignedAreas.map(area => `
                        <option value="${area.area_number}">Area ${area.area_number}</option>
                    `).join('')}
                </select>
                <select id="filterStatus" onchange="filterSections()">
                    <option value="">All Status</option>
                    <option value="not_reviewed">Not Reviewed</option>
                    <option value="complete">Complete</option>
                    <option value="needs_revision">Needs Revision</option>
                    <option value="incomplete">Incomplete</option>
                </select>
                <select id="filterLinkStatus" onchange="filterSections()">
                    <option value="">All Submissions</option>
                    <option value="submitted">Has Link</option>
                    <option value="not_submitted">No Link</option>
                </select>
            </div>
        </div>

        <!-- Sections Table -->
        <div class="sections-card">
            <div class="card-header">
                <h2 class="card-title">
                    <i class="fas fa-clipboard-check"></i> Section Reviews
                </h2>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Section Name</th>
                            <th>Area</th>
                            <th>Google Drive Link</th>
                            <th>Submitted Date</th>
                            <th>Review Status</th>
                            <th>My Comments</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="sectionsTableBody">
                        <tr>
                            <td colspan="7" class="loading-cell">Loading sections...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Review Modal -->
        <div class="modal" id="reviewModal" style="display: none;">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3 id="reviewModalTitle">Review Section</h3>
                    <button class="modal-close" onclick="closeReviewModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="review-info-box">
                        <div class="review-info-item">
                            <strong>Section:</strong>
                            <span id="reviewSectionName">-</span>
                        </div>
                        <div class="review-info-item">
                            <strong>Area:</strong>
                            <span id="reviewAreaName">-</span>
                        </div>
                        <div class="review-info-item">
                            <strong>Submitted:</strong>
                            <span id="reviewSubmittedDate">-</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            <i class="fas fa-external-link-alt"></i> Google Drive Link
                        </label>
                        <div class="link-display-box">
                            <a href="#" id="reviewDriveLink" target="_blank" class="drive-link-display">
                                <i class="fas fa-folder"></i> Open Google Drive Folder
                            </a>
                        </div>
                        <small class="form-hint">Click to open and review documents in Google Drive</small>
                    </div>

                    <div class="form-group">
                        <label for="reviewStatus">Review Status *</label>
                        <select id="reviewStatus" required>
                            <option value="">Select Status</option>
                            <option value="Complete">✓ Complete - All documents present and acceptable</option>
                            <option value="Needs Revision">⚠ Needs Revision - Documents need corrections</option>
                            <option value="Incomplete">✗ Incomplete - Missing required documents</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="reviewComments">Comments / Feedback</label>
                        <textarea id="reviewComments" rows="5" placeholder="Add your review comments here...

Examples:
- List any missing documents
- Specify what revisions are needed
- Provide constructive feedback
- Note any concerns or recommendations"></textarea>
                        <small class="form-hint">Provide detailed feedback, especially for revisions or incomplete status</small>
                    </div>

                    <div class="review-history" id="reviewHistory" style="display: none;">
                        <h4><i class="fas fa-history"></i> Previous Review</h4>
                        <div class="history-content">
                            <div class="history-item">
                                <strong>Status:</strong> <span id="prevStatus">-</span>
                            </div>
                            <div class="history-item">
                                <strong>Date:</strong> <span id="prevDate">-</span>
                            </div>
                            <div class="history-item">
                                <strong>Comments:</strong> 
                                <p id="prevComments">-</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeReviewModal()">Cancel</button>
                    <button class="btn-primary" id="submitReviewBtn" onclick="submitReview()">
                        <i class="fas fa-check"></i> Submit Review
                    </button>
                </div>
            </div>
        </div>
    `;

    // Update page title
    document.getElementById('pageTitle').textContent = 'Accreditor Dashboard';

    // Load sections
    loadSections();
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displaySections(sections) {
    const tbody = document.getElementById('sectionsTableBody');
    
    if (sections.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" class="no-data">No sections found</td></tr>
        `;
        return;
    }

    tbody.innerHTML = sections.map(section => {
        const hasLink = section.google_drive_link;
        const reviewStatus = section.review_status || 'Not Reviewed';
        const isMyReview = section.accreditor_id === currentUser.id;

        const linkDisplay = hasLink 
            ? `<a href="${section.google_drive_link}" target="_blank" class="link-preview">
                <i class="fas fa-external-link-alt"></i> Open Folder
               </a>`
            : '<span class="no-link">No link submitted</span>';

        const statusBadge = getReviewStatusBadge(reviewStatus);

        const submittedDate = section.submitted_at 
            ? new Date(section.submitted_at).toLocaleDateString()
            : '-';

        const commentsDisplay = section.comments && isMyReview
            ? `<button class="btn-icon" onclick="viewComments('${escapeHtml(section.comments)}')" title="View Comments">
                <i class="fas fa-comment"></i>
               </button>`
            : '-';

        const actionButtons = hasLink
            ? `<button class="btn-primary btn-sm" onclick="openReviewModal(${section.section_id})">
                <i class="fas fa-clipboard-check"></i> ${reviewStatus === 'Not Reviewed' ? 'Review' : 'Update Review'}
               </button>`
            : '<span class="text-muted">Awaiting submission</span>';

        return `
            <tr>
                <td><strong>${section.section_name}</strong></td>
                <td>Area ${section.area_number}</td>
                <td>${linkDisplay}</td>
                <td>${submittedDate}</td>
                <td>${statusBadge}</td>
                <td>${commentsDisplay}</td>
                <td class="action-buttons">${actionButtons}</td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    const total = allSections.length;
    const reviewed = allSections.filter(s => 
        s.review_status && s.review_status !== 'Not Reviewed' && s.accreditor_id === currentUser.id
    ).length;
    const pending = total - reviewed;
    const complete = allSections.filter(s => 
        s.review_status === 'Complete' && s.accreditor_id === currentUser.id
    ).length;

    document.getElementById('totalSections').textContent = total;
    document.getElementById('reviewedSections').textContent = reviewed;
    document.getElementById('pendingSections').textContent = pending;
    document.getElementById('completeSections').textContent = complete;
}

function filterSections() {
    const searchTerm = document.getElementById('searchSections').value.toLowerCase();
    const areaFilter = document.getElementById('filterArea').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const linkStatusFilter = document.getElementById('filterLinkStatus').value;

    let filtered = allSections;

    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.section_name.toLowerCase().includes(searchTerm)
        );
    }

    if (areaFilter) {
        filtered = filtered.filter(s => 
            s.area_number.toString() === areaFilter
        );
    }

    if (statusFilter) {
        if (statusFilter === 'not_reviewed') {
            filtered = filtered.filter(s => !s.review_status || s.review_status === 'Not Reviewed');
        } else if (statusFilter === 'complete') {
            filtered = filtered.filter(s => s.review_status === 'Complete');
        } else if (statusFilter === 'needs_revision') {
            filtered = filtered.filter(s => s.review_status === 'Needs Revision');
        } else if (statusFilter === 'incomplete') {
            filtered = filtered.filter(s => s.review_status === 'Incomplete');
        }
    }

    if (linkStatusFilter === 'submitted') {
        filtered = filtered.filter(s => s.google_drive_link);
    } else if (linkStatusFilter === 'not_submitted') {
        filtered = filtered.filter(s => !s.google_drive_link);
    }

    displaySections(filtered);
}

// ============================================
// REVIEW MANAGEMENT
// ============================================

let currentReviewSectionId = null;

async function openReviewModal(sectionId) {
    const section = allSections.find(s => s.section_id === sectionId);
    if (!section) return;

    if (!section.google_drive_link) {
        showToast('No Google Drive link available to review', 'warning');
        return;
    }

    currentReviewSectionId = sectionId;

    // Populate modal
    document.getElementById('reviewModalTitle').textContent = `Review: ${section.section_name}`;
    document.getElementById('reviewSectionName').textContent = section.section_name;
    document.getElementById('reviewAreaName').textContent = `Area ${section.area_number}: ${section.area_name}`;
    document.getElementById('reviewSubmittedDate').textContent = section.submitted_at 
        ? new Date(section.submitted_at).toLocaleString()
        : 'Not available';
    
    document.getElementById('reviewDriveLink').href = section.google_drive_link;
    document.getElementById('reviewStatus').value = section.review_status || '';
    document.getElementById('reviewComments').value = section.comments || '';

    // Show previous review if exists
    if (section.review_status && section.review_status !== 'Not Reviewed') {
        document.getElementById('reviewHistory').style.display = 'block';
        document.getElementById('prevStatus').textContent = section.review_status;
        document.getElementById('prevDate').textContent = section.reviewed_at 
            ? new Date(section.reviewed_at).toLocaleString()
            : 'Unknown';
        document.getElementById('prevComments').textContent = section.comments || 'No comments';
    } else {
        document.getElementById('reviewHistory').style.display = 'none';
    }

    document.getElementById('reviewModal').style.display = 'flex';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentReviewSectionId = null;
}

async function submitReview() {
    const status = document.getElementById('reviewStatus').value;
    const comments = document.getElementById('reviewComments').value.trim();

    if (!status) {
        showToast('Please select a review status', 'error');
        return;
    }

    if ((status === 'Needs Revision' || status === 'Incomplete') && !comments) {
        if (!confirm('You selected "' + status + '" but did not add comments. Continue anyway?')) {
            return;
        }
    }

    try {
        const response = await fetch(`/api/accreditation/review/${currentReviewSectionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                review_status: status,
                comments: comments,
                accreditor_id: currentUser.id
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Review submitted successfully', 'success');
            closeReviewModal();
            await loadSections();
        } else {
            showToast(data.error || 'Failed to submit review', 'error');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('Failed to submit review', 'error');
    }
}

function viewComments(comments) {
    alertSystem.warning('My Comments:\n\n' + comments);
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'");
}

function showNoCycleMessage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="no-data-message">
            <i class="fas fa-exclamation-circle"></i>
            <h2>No Active Accreditation Cycle</h2>
            <p>There is currently no active accreditation cycle. Please wait for the accreditation period to begin.</p>
        </div>
    `;
}

function showNoAssignmentMessage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="no-data-message">
            <i class="fas fa-user-slash"></i>
            <h2>No Area Assignment</h2>
            <p>You have not been assigned to any areas yet. Please contact AdminLlave for area assignment.</p>
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
        const modal = document.getElementById('reviewModal');
        if (e.target === modal) {
            closeReviewModal();
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