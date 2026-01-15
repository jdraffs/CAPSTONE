// private/js/admin/admiLlave/accreditor/myReviews.js

let currentUser = null;
let activeCycleId = null;
let myReviews = [];
let filteredReviews = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadCurrentUser();
    await loadActiveCycle();
    
    // FIXED: Render page FIRST, then load data
    renderMyReviewsPage();
    
    await loadMyReviews();
    setupEventListeners();
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
            activeCycleId = data.cycle.id;
        }
    } catch (error) {
        console.error('Error loading active cycle:', error);
    }
}

async function loadMyReviews() {
    if (!activeCycleId || !currentUser) return;

    try {
        const response = await fetch(`/api/accreditation/reviews/all/${activeCycleId}`);
        const data = await response.json();

        if (data.reviews) {
            // Filter only reviews by current accreditor
            myReviews = data.reviews.filter(r => r.accreditor_id === currentUser.id);
            filteredReviews = myReviews;
            displayReviews(filteredReviews);
            updateSummaryStats();
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        showToast('Failed to load reviews', 'error');
    }
}

// ============================================
// RENDER PAGE
// ============================================

function renderMyReviewsPage() {
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
        <!-- Page Header -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="main-title">My Reviews</h1>
                <p class="subtitle">Review history and submitted evaluations</p>
            </div>
        </div>

        <!-- Summary Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon total">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="totalReviewed">0</div>
                    <div class="stat-label">Total Reviewed</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon complete">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="completeCount">0</div>
                    <div class="stat-label">Complete</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon pending">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="needsRevisionCount">0</div>
                    <div class="stat-label">Needs Revision</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon reviewed">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value" id="incompleteCount">0</div>
                    <div class="stat-label">Incomplete</div>
                </div>
            </div>
        </div>

        <!-- Search and Filter -->
        <div class="search-filter-bar">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="searchReviews" placeholder="Search by section name..." onkeyup="filterReviews()">
            </div>
            <div class="filter-group">
                <select id="filterStatus" onchange="filterReviews()">
                    <option value="">All Statuses</option>
                    <option value="Complete">Complete</option>
                    <option value="Needs Revision">Needs Revision</option>
                    <option value="Incomplete">Incomplete</option>
                </select>
                <select id="filterArea" onchange="filterReviews()">
                    <option value="">All Areas</option>
                </select>
                <select id="sortBy" onchange="sortReviews()">
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="section">Section Name</option>
                    <option value="area">Area Number</option>
                </select>
            </div>
        </div>

        <!-- Reviews Table -->
        <div class="sections-card">
            <div class="card-header">
                <h2 class="card-title">
                    <i class="fas fa-history"></i> Review History
                </h2>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Section Name</th>
                            <th>Area</th>
                            <th>Review Status</th>
                            <th>Google Drive Link</th>
                            <th>Reviewed Date</th>
                            <th>My Comments</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="reviewsTableBody">
                        <tr>
                            <td colspan="7" class="loading-cell">Loading reviews...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- View Comments Modal -->
        <div class="modal" id="commentsModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="commentsModalTitle">Review Comments</h3>
                    <button class="modal-close" onclick="closeCommentsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="review-info-box">
                        <div class="review-info-item">
                            <strong>Section:</strong>
                            <span id="commentsSectionName">-</span>
                        </div>
                        <div class="review-info-item">
                            <strong>Status:</strong>
                            <span id="commentsStatus">-</span>
                        </div>
                        <div class="review-info-item">
                            <strong>Reviewed:</strong>
                            <span id="commentsDate">-</span>
                        </div>
                    </div>
                    <div class="comments-display">
                        <label><strong>Comments:</strong></label>
                        <div id="commentsText" style="margin-top: 10px; padding: 15px; background: #f8fafc; border-radius: 8px; white-space: pre-wrap; color: #475569; line-height: 1.6;">
                            No comments provided
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeCommentsModal()">Close</button>
                </div>
            </div>
        </div>

        <!-- Update Review Modal -->
        <div class="modal" id="updateReviewModal" style="display: none;">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3 id="updateModalTitle">Update Review</h3>
                    <button class="modal-close" onclick="closeUpdateModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="review-info-box">
                        <div class="review-info-item">
                            <strong>Section:</strong>
                            <span id="updateSectionName">-</span>
                        </div>
                        <div class="review-info-item">
                            <strong>Area:</strong>
                            <span id="updateAreaName">-</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            <i class="fas fa-external-link-alt"></i> Google Drive Link
                        </label>
                        <div class="link-display-box">
                            <a href="#" id="updateDriveLink" target="_blank" class="drive-link-display">
                                <i class="fas fa-folder"></i> Open Google Drive Folder
                            </a>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="updateStatus">Review Status *</label>
                        <select id="updateStatus" required>
                            <option value="">Select Status</option>
                            <option value="Complete">✓ Complete</option>
                            <option value="Needs Revision">⚠ Needs Revision</option>
                            <option value="Incomplete">✗ Incomplete</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="updateComments">Comments / Feedback</label>
                        <textarea id="updateComments" rows="5" placeholder="Update your review comments..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeUpdateModal()">Cancel</button>
                    <button class="btn-primary" onclick="submitUpdateReview()">
                        <i class="fas fa-save"></i> Update Review
                    </button>
                </div>
            </div>
        </div>
    `;

    // Update page title
    document.getElementById('pageTitle').textContent = 'My Reviews';
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayReviews(reviews) {
    const tbody = document.getElementById('reviewsTableBody');

    if (reviews.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" class="no-data">No reviews found</td></tr>
        `;
        return;
    }

    tbody.innerHTML = reviews.map(review => {
        const statusBadge = getReviewStatusBadge(review.review_status);
        const reviewDate = review.reviewed_at 
            ? new Date(review.reviewed_at).toLocaleString()
            : '-';

        const linkDisplay = review.google_drive_link
            ? `<a href="${review.google_drive_link}" target="_blank" class="link-preview">
                <i class="fas fa-external-link-alt"></i> Open Folder
               </a>`
            : '<span class="no-link">No link</span>';

        const commentsPreview = review.comments 
            ? `<button class="btn-icon" onclick="viewFullComments(${review.section_id})" title="View Full Comments">
                <i class="fas fa-comment-dots"></i>
               </button>`
            : '<span class="text-muted">No comments</span>';

        return `
            <tr>
                <td><strong>${review.section_name}</strong></td>
                <td>Area ${review.area_number}</td>
                <td>${statusBadge}</td>
                <td>${linkDisplay}</td>
                <td>${reviewDate}</td>
                <td>${commentsPreview}</td>
                <td class="action-buttons">
                    <button class="btn-primary btn-sm" onclick="openUpdateModal(${review.section_id})">
                        <i class="fas fa-edit"></i> Update
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Populate area filter after displaying reviews
    populateAreaFilter();
}

function updateSummaryStats() {
    const total = myReviews.length;
    const complete = myReviews.filter(r => r.review_status === 'Complete').length;
    const needsRevision = myReviews.filter(r => r.review_status === 'Needs Revision').length;
    const incomplete = myReviews.filter(r => r.review_status === 'Incomplete').length;

    document.getElementById('totalReviewed').textContent = total;
    document.getElementById('completeCount').textContent = complete;
    document.getElementById('needsRevisionCount').textContent = needsRevision;
    document.getElementById('incompleteCount').textContent = incomplete;
}

function populateAreaFilter() {
    const areaFilter = document.getElementById('filterArea');
    const uniqueAreas = [...new Set(myReviews.map(r => r.area_number))].sort((a, b) => a - b);

    // Clear existing options except "All Areas"
    areaFilter.innerHTML = '<option value="">All Areas</option>';

    uniqueAreas.forEach(areaNum => {
        const option = document.createElement('option');
        option.value = areaNum;
        option.textContent = `Area ${areaNum}`;
        areaFilter.appendChild(option);
    });
}

// ============================================
// FILTER & SORT
// ============================================

function filterReviews() {
    const searchTerm = document.getElementById('searchReviews').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const areaFilter = document.getElementById('filterArea').value;

    filteredReviews = myReviews.filter(review => {
        const matchesSearch = review.section_name.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || review.review_status === statusFilter;
        const matchesArea = !areaFilter || review.area_number.toString() === areaFilter;

        return matchesSearch && matchesStatus && matchesArea;
    });

    sortReviews();
}

function sortReviews() {
    const sortBy = document.getElementById('sortBy').value;

    const sorted = [...filteredReviews].sort((a, b) => {
        switch (sortBy) {
            case 'recent':
                return new Date(b.reviewed_at) - new Date(a.reviewed_at);
            case 'oldest':
                return new Date(a.reviewed_at) - new Date(b.reviewed_at);
            case 'section':
                return a.section_name.localeCompare(b.section_name);
            case 'area':
                return a.area_number - b.area_number;
            default:
                return 0;
        }
    });

    displayReviews(sorted);
}

// ============================================
// MODAL FUNCTIONS
// ============================================

let currentViewingReview = null;

function viewFullComments(sectionId) {
    const review = myReviews.find(r => r.section_id === sectionId);
    if (!review) return;

    document.getElementById('commentsModalTitle').textContent = 'Review Comments';
    document.getElementById('commentsSectionName').textContent = review.section_name;
    document.getElementById('commentsStatus').innerHTML = getReviewStatusBadge(review.review_status);
    document.getElementById('commentsDate').textContent = review.reviewed_at 
        ? new Date(review.reviewed_at).toLocaleString()
        : 'Unknown';
    document.getElementById('commentsText').textContent = review.comments || 'No comments provided';

    document.getElementById('commentsModal').style.display = 'flex';
}

function closeCommentsModal() {
    document.getElementById('commentsModal').style.display = 'none';
}

function openUpdateModal(sectionId) {
    const review = myReviews.find(r => r.section_id === sectionId);
    if (!review) return;

    currentViewingReview = review;

    document.getElementById('updateModalTitle').textContent = `Update Review: ${review.section_name}`;
    document.getElementById('updateSectionName').textContent = review.section_name;
    document.getElementById('updateAreaName').textContent = `Area ${review.area_number}: ${review.area_name}`;
    document.getElementById('updateDriveLink').href = review.google_drive_link || '#';
    document.getElementById('updateStatus').value = review.review_status || '';
    document.getElementById('updateComments').value = review.comments || '';

    document.getElementById('updateReviewModal').style.display = 'flex';
}

function closeUpdateModal() {
    document.getElementById('updateReviewModal').style.display = 'none';
    currentViewingReview = null;
}

async function submitUpdateReview() {
    if (!currentViewingReview) return;

    const status = document.getElementById('updateStatus').value;
    const comments = document.getElementById('updateComments').value.trim();

    if (!status) {
        showToast('Please select a review status', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/review/${currentViewingReview.section_id}`, {
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
            showToast('Review updated successfully', 'success');
            closeUpdateModal();
            await loadMyReviews();
        } else {
            showToast(data.error || 'Failed to update review', 'error');
        }
    } catch (error) {
        console.error('Error updating review:', error);
        showToast('Failed to update review', 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getReviewStatusBadge(status) {
    if (status === 'Complete') {
        return '<span class="badge badge-green"><i class="fas fa-check-circle"></i> Complete</span>';
    } else if (status === 'Needs Revision') {
        return '<span class="badge badge-yellow"><i class="fas fa-exclamation-triangle"></i> Needs Revision</span>';
    } else if (status === 'Incomplete') {
        return '<span class="badge badge-red"><i class="fas fa-times-circle"></i> Incomplete</span>';
    }
    return '<span class="badge badge-gray">Not Reviewed</span>';
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
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
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
    window.addEventListener('click', (e) => {
        const commentsModal = document.getElementById('commentsModal');
        const updateModal = document.getElementById('updateReviewModal');
        
        if (e.target === commentsModal) {
            closeCommentsModal();
        }
        if (e.target === updateModal) {
            closeUpdateModal();
        }
    });
}