// private/js/admin/admiLlave/reviewMonitoring.js - COMPLETE IMPLEMENTATION

const adminid = 6; // AdminLlave's ID
let activeCycleId = null;
let currentCycle = null;
let allSections = []; // Store all sections for filtering
let allAccreditors = []; // Store all accreditors

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadActiveCycle();
    await renderReviewMonitoringUI();
    setupEventListeners();
    
    // Refresh data every 30 seconds
    setInterval(async () => {
        if (activeCycleId) {
            await refreshDashboardData();
        }
    }, 30000);
});

// ============================================
// LOAD ACTIVE CYCLE
// ============================================

async function loadActiveCycle() {
    try {
        const response = await fetch('/api/accreditation/cycle/active');
        const data = await response.json();

        if (data.cycle) {
            currentCycle = data.cycle;
            activeCycleId = data.cycle.id;
        } else {
            showToast('No active cycle found. Please create a cycle first.', 'warning');
        }
    } catch (error) {
        console.error('Error loading active cycle:', error);
        showToast('Failed to load cycle information', 'error');
    }
}

// ============================================
// RENDER REVIEW MONITORING UI
// ============================================

async function renderReviewMonitoringUI() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <!-- Progress Overview Cards -->
        <div class="progress-overview">
            <div class="stat-card">
                <div class="stat-icon total">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="stat-content">
                    <h3 class="stat-title">Total Reviews</h3>
                    <div class="stat-numbers">
                        <span class="stat-value" id="totalToReview">0</span>
                        <span class="stat-label">Items</span>
                    </div>
                    <div class="stat-breakdown">
                        <div class="breakdown-item">
                            <span class="breakdown-label">Reviewed:</span>
                            <span class="breakdown-value" id="totalReviewed">0</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Pending:</span>
                            <span class="breakdown-value" id="totalPending">0</span>
                        </div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="overallProgress" style="width: 0%"></div>
                        </div>
                        <span class="progress-text" id="overallProgressText">0%</span>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon status">
                    <i class="fas fa-chart-pie"></i>
                </div>
                <div class="stat-content">
                    <h3 class="stat-title">By Status</h3>
                    <div class="status-grid">
                        <div class="status-item complete">
                            <i class="fas fa-check-circle"></i>
                            <span class="status-count" id="completeCount">0</span>
                            <span class="status-label">Complete</span>
                        </div>
                        <div class="status-item revision">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span class="status-count" id="revisionCount">0</span>
                            <span class="status-label">Needs Revision</span>
                        </div>
                        <div class="status-item incomplete">
                            <i class="fas fa-times-circle"></i>
                            <span class="status-count" id="incompleteCount">0</span>
                            <span class="status-label">Incomplete</span>
                        </div>
                        <div class="status-item not-reviewed">
                            <i class="fas fa-clock"></i>
                            <span class="status-count" id="notReviewedCount">0</span>
                            <span class="status-label">Not Reviewed</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon performance">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <h3 class="stat-title">Accreditor Performance</h3>
                    <div class="performance-stats">
                        <div class="perf-item">
                            <span class="perf-label">Average Reviews:</span>
                            <span class="perf-value" id="avgReviews">0</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">Top Reviewer:</span>
                            <span class="perf-value" id="topReviewer">-</span>
                        </div>
                        <div class="perf-item">
                            <span class="perf-label">Pending Reviewers:</span>
                            <span class="perf-value" id="pendingReviewers">0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Area Breakdown -->
        <div class="section-header">
            <h2 class="section-title">
                <i class="fas fa-layer-group"></i> Area Breakdown
            </h2>
        </div>

        <div class="areas-grid" id="areasBreakdownGrid">
            <div class="loading-card">Loading areas...</div>
        </div>

        <!-- Filter & Search -->
        <div class="section-header">
            <h2 class="section-title">
                <i class="fas fa-filter"></i> Detailed Review Status
            </h2>
        </div>

        <div class="search-filter-bar">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="searchReviews" placeholder="Search items..." onkeyup="filterReviews()">
            </div>
            <div class="filter-group">
                <select id="filterAreaReview" onchange="filterReviews()">
                    <option value="">All Areas</option>
                    <option value="1">Area 1</option>
                    <option value="2">Area 2</option>
                    <option value="3">Area 3</option>
                    <option value="4">Area 4</option>
                    <option value="5">Area 5</option>
                    <option value="6">Area 6</option>
                    <option value="7">Area 7</option>
                    <option value="8">Area 8</option>
                    <option value="9">Area 9</option>
                    <option value="10">Area 10</option>
                </select>
                <select id="filterReviewStatus" onchange="filterReviews()">
                    <option value="">All Status</option>
                    <option value="Complete">Complete</option>
                    <option value="Needs Revision">Needs Revision</option>
                    <option value="Incomplete">Incomplete</option>
                    <option value="Not Reviewed">Not Reviewed</option>
                </select>
                <select id="filterAccreditor" onchange="filterReviews()">
                    <option value="">All Accreditors</option>
                </select>
            </div>
        </div>

        <!-- Detailed Review Table -->
        <div class="review-card">
            <div class="table-container">
                <table class="data-table review-table" id="reviewsTable">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Area</th>
                            <th>Google Drive Link</th>
                            <th>Review Status</th>
                            <th>Reviewed By</th>
                            <th>Date Reviewed</th>
                            <th>Comments</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="reviewsTableBody">
                        <tr>
                            <td colspan="8" class="loading-cell">Loading reviews...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Accreditor Performance Table -->
        <div class="section-header">
            <h2 class="section-title">
                <i class="fas fa-trophy"></i> Accreditor Performance Summary
            </h2>
        </div>

        <div class="review-card">
            <div class="table-container">
                <table class="data-table accreditor-table">
                    <thead>
                        <tr>
                            <th>Accreditor Name</th>
                            <th>Assigned Areas</th>
                            <th>Total Assigned</th>
                            <th>Reviewed</th>
                            <th>Pending</th>
                            <th>Completion %</th>
                            <th>Last Activity</th>
                        </tr>
                    </thead>
                    <tbody id="accreditorPerformanceBody">
                        <tr>
                            <td colspan="8" class="loading-cell">Loading accreditor data...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Load all data
    if (activeCycleId) {
        await loadAllReviewData();
    } else {
        showNoCycleMessage();
    }
}

// ============================================
// LOAD ALL REVIEW DATA
// ============================================

async function loadAllReviewData() {
    try {
        await Promise.all([
            loadProgressOverview(),
            loadAreaBreakdown(),
            loadDetailedReviews(),
            loadAccreditorPerformance()
        ]);
    } catch (error) {
        console.error('Error loading review data:', error);
        showToast('Failed to load review data', 'error');
    }
}

async function refreshDashboardData() {
    try {
        await Promise.all([
            loadProgressOverview(),
            loadAreaBreakdown()
        ]);
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

// ============================================
// LOAD PROGRESS OVERVIEW
// ============================================

async function loadProgressOverview() {
    try {
        const response = await fetch(`/api/accreditation/review-stats/${activeCycleId}`);
        const data = await response.json();

        if (data.stats) {
            const stats = data.stats;
            
            // Total Reviews Card
            document.getElementById('totalToReview').textContent = stats.total_sections || 0;
            document.getElementById('totalReviewed').textContent = stats.reviewed_count || 0;
            document.getElementById('totalPending').textContent = 
                (stats.total_sections - stats.reviewed_count) || 0;
            
            const completionPct = stats.total_sections > 0 
                ? Math.round((stats.reviewed_count / stats.total_sections) * 100) 
                : 0;
            
            document.getElementById('overallProgress').style.width = `${completionPct}%`;
            document.getElementById('overallProgressText').textContent = `${completionPct}%`;

            // By Status Card
            document.getElementById('completeCount').textContent = stats.complete_count || 0;
            document.getElementById('revisionCount').textContent = stats.needs_revision_count || 0;
            document.getElementById('incompleteCount').textContent = stats.incomplete_count || 0;
            document.getElementById('notReviewedCount').textContent = stats.not_reviewed_count || 0;

            // Performance Card
            const avgReviews = stats.total_accreditors > 0 
                ? (stats.reviewed_count / stats.total_accreditors).toFixed(1)
                : 0;
            
            document.getElementById('avgReviews').textContent = avgReviews;
            document.getElementById('topReviewer').textContent = stats.top_reviewer_name || '-';
            document.getElementById('pendingReviewers').textContent = stats.pending_reviewers || 0;
        }
    } catch (error) {
        console.error('Error loading progress overview:', error);
    }
}

// ============================================
// LOAD AREA BREAKDOWN
// ============================================

async function loadAreaBreakdown() {
    try {
        const response = await fetch(`/api/accreditation/areas-review/${activeCycleId}`);
        const data = await response.json();

        const grid = document.getElementById('areasBreakdownGrid');

        if (data.areas && data.areas.length > 0) {
            grid.innerHTML = data.areas.map(area => {
                const totalSections = parseInt(area.total_sections) || 0;
                const reviewedSections = parseInt(area.reviewed_sections) || 0;
                const completeSections = parseInt(area.complete_sections) || 0;
                const revisionSections = parseInt(area.needs_revision_count) || 0;
                const incompleteSections = parseInt(area.incomplete_count) || 0;
                const notReviewedSections = parseInt(area.not_reviewed_count) || 0;

                const reviewedPct = totalSections > 0 
                    ? Math.round((reviewedSections / totalSections) * 100) 
                    : 0;

                return `
                    <div class="area-breakdown-card">
                        <div class="area-breakdown-header">
                            <h4 class="area-breakdown-title">Area ${area.area_number}</h4>
                            <span class="area-breakdown-subtitle">${area.area_name}</span>
                        </div>
                        
                        <div class="area-breakdown-progress">
                            <div class="progress-header">
                                <span>Review Progress</span>
                                <span class="progress-value">${reviewedSections}/${totalSections}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${reviewedPct}%"></div>
                            </div>
                            <span class="progress-text">${reviewedPct}%</span>
                        </div>

                        <div class="area-breakdown-stats">
                            <div class="breakdown-stat complete">
                                <i class="fas fa-check-circle"></i>
                                <span class="stat-num">${completeSections}</span>
                                <span class="stat-lbl">Complete</span>
                            </div>
                            <div class="breakdown-stat revision">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span class="stat-num">${revisionSections}</span>
                                <span class="stat-lbl">Revision</span>
                            </div>
                            <div class="breakdown-stat incomplete">
                                <i class="fas fa-times-circle"></i>
                                <span class="stat-num">${incompleteSections}</span>
                                <span class="stat-lbl">Incomplete</span>
                            </div>
                            <div class="breakdown-stat pending">
                                <i class="fas fa-clock"></i>
                                <span class="stat-num">${notReviewedSections}</span>
                                <span class="stat-lbl">Pending</span>
                            </div>
                        </div>

                        <div class="area-breakdown-footer">
                            <div class="accreditors-list">
                                <i class="fas fa-user-check"></i>
                                <span id="area-accreditors-${area.area_id}">Loading...</span>
                            </div>
                            <button class="btn-view-details-small" onclick="viewAreaReviewDetails(${area.area_id}, '${area.area_name}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Load accreditors for each area
            data.areas.forEach(area => {
                loadAreaAccreditorsForBreakdown(area.area_id);
            });
        } else {
            grid.innerHTML = '<div class="no-data-card">No areas found</div>';
        }
    } catch (error) {
        console.error('Error loading area breakdown:', error);
    }
}

async function loadAreaAccreditorsForBreakdown(areaId) {
    try {
        const response = await fetch(`/api/accreditation/area/${activeCycleId}/${areaId}/accreditors`);
        const data = await response.json();

        const element = document.getElementById(`area-accreditors-${areaId}`);
        if (data.accreditors && data.accreditors.length > 0) {
            const names = data.accreditors.map(a => a.accreditor_name).join(', ');
            element.textContent = names;
        } else {
            element.textContent = 'None assigned';
        }
    } catch (error) {
        console.error('Error loading area accreditors:', error);
        document.getElementById(`area-accreditors-${areaId}`).textContent = 'Error';
    }
}

// ============================================
// LOAD DETAILED REVIEWS
// ============================================

async function loadDetailedReviews() {
    try {
        const response = await fetch(`/api/accreditation/reviews/all/${activeCycleId}`);
        const data = await response.json();

        if (data.reviews && data.reviews.length > 0) {
            allSections = data.reviews;
            
            // Populate accreditor filter
            const accreditors = [...new Set(data.reviews
                .filter(r => r.reviewed_by_name)
                .map(r => r.reviewed_by_name))];
            
            allAccreditors = accreditors;
            
            const accreditorFilter = document.getElementById('filterAccreditor');
            accreditorFilter.innerHTML = '<option value="">All Accreditors</option>' +
                accreditors.map(acc => `<option value="${acc}">${acc}</option>`).join('');
            
            displayReviews(allSections);
        } else {
            allSections = [];
            document.getElementById('reviewsTableBody').innerHTML = `
                <tr><td colspan="8" class="no-data">No sections found for review</td></tr>
            `;
        }
    } catch (error) {
        console.error('Error loading detailed reviews:', error);
        document.getElementById('reviewsTableBody').innerHTML = `
            <tr><td colspan="8" class="error-cell">Error loading reviews</td></tr>
        `;
    }
}

function displayReviews(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    
    if (reviews.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8" class="no-data">No reviews match your filters</td></tr>
        `;
        return;
    }

    tbody.innerHTML = reviews.map(review => {
        const statusBadge = getReviewStatusBadge(review.review_status);
        
        const linkButton = review.google_drive_link 
            ? `<a href="${review.google_drive_link}" target="_blank" class="link-button">
                <i class="fas fa-external-link-alt"></i> Open
               </a>`
            : '<span class="text-muted">No link</span>';
        
        const reviewedBy = review.reviewed_by_name || '-';
        const reviewedDate = review.reviewed_at 
            ? new Date(review.reviewed_at).toLocaleDateString() 
            : '-';
        
        const commentsButton = review.comments 
            ? `<button class="btn-icon" onclick="viewFullComments('${review.section_name}', '${escapeHtml(review.comments)}')" title="View Comments">
                <i class="fas fa-comment"></i>
               </button>`
            : '<span class="text-muted">-</span>';
        
        const reminderButton = review.review_status === 'Not Reviewed' && review.accreditor_id
            ? `<button class="btn-icon btn-warning" onclick="sendReminderToAccreditor(${review.accreditor_id}, '${review.section_name}')" title="Send Reminder">
                <i class="fas fa-bell"></i>
               </button>`
            : '';

        return `
            <tr>
                <td><strong>${review.section_name}</strong></td>
                <td>Area ${review.area_number}</td>
                <td>${linkButton}</td>
                <td>${statusBadge}</td>
                <td>${reviewedBy}</td>
                <td>${reviewedDate}</td>
                <td>${commentsButton}</td>
                <td class="action-buttons">
                    ${linkButton !== '<span class="text-muted">No link</span>' ? 
                        `<a href="${review.google_drive_link}" target="_blank" class="btn-icon" title="Open Link">
                            <i class="fas fa-external-link-alt"></i>
                         </a>` : ''}
                    ${reminderButton}
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// FILTER REVIEWS
// ============================================

function filterReviews() {
    const searchTerm = document.getElementById('searchReviews').value.toLowerCase();
    const areaFilter = document.getElementById('filterAreaReview').value;
    const statusFilter = document.getElementById('filterReviewStatus').value;
    const accreditorFilter = document.getElementById('filterAccreditor').value;

    let filtered = allSections;

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.section_name.toLowerCase().includes(searchTerm)
        );
    }

    // Area filter
    if (areaFilter) {
        filtered = filtered.filter(s => 
            s.area_number.toString() === areaFilter
        );
    }

    // Status filter
    if (statusFilter) {
        filtered = filtered.filter(s => 
            (s.review_status || 'Not Reviewed') === statusFilter
        );
    }

    // Accreditor filter
    if (accreditorFilter) {
        filtered = filtered.filter(s => 
            s.reviewed_by_name === accreditorFilter
        );
    }

    displayReviews(filtered);
}

// ============================================
// LOAD ACCREDITOR PERFORMANCE
// ============================================

async function loadAccreditorPerformance() {
    try {
        const response = await fetch(`/api/accreditation/accreditor-performance/${activeCycleId}`);
        const data = await response.json();

        const tbody = document.getElementById('accreditorPerformanceBody');

        if (data.performance && data.performance.length > 0) {
            tbody.innerHTML = data.performance.map(acc => {
                const totalAssigned = parseInt(acc.total_assigned) || 0;
                const reviewedCount = parseInt(acc.reviewed_count) || 0;
                const pendingCount = totalAssigned - reviewedCount;
                const completionPct = totalAssigned > 0 
                    ? Math.round((reviewedCount / totalAssigned) * 100) 
                    : 0;
                
                const lastActivity = acc.last_activity 
                    ? new Date(acc.last_activity).toLocaleDateString() 
                    : 'Never';

                const statusClass = completionPct === 100 ? 'complete' : 
                                   completionPct >= 50 ? 'good' : 'warning';

                return `
                    <tr>
                        <td><strong>${acc.accreditor_name}</strong></td>
                        <td>${acc.assigned_areas || '-'}</td>
                        <td>${totalAssigned}</td>
                        <td>${reviewedCount}</td>
                        <td>${pendingCount}</td>
                        <td>
                            <div class="completion-badge ${statusClass}">
                                ${completionPct}%
                            </div>
                        </td>
                        <td>${lastActivity}</td>
                        <td class="action-buttons">
                            ${pendingCount > 0 ? 
                                `<button class="btn-icon btn-warning" onclick="sendReminderToAccreditor(${acc.accreditor_id})" title="Send Reminder">
                                    <i class="fas fa-bell"></i>
                                 </button>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `
                <tr><td colspan="8" class="no-data">No accreditor data available</td></tr>
            `;
        }
    } catch (error) {
        console.error('Error loading accreditor performance:', error);
        tbody.innerHTML = `
            <tr><td colspan="8" class="error-cell">Error loading data</td></tr>
        `;
    }
}

// ============================================
// ACTION FUNCTIONS
// ============================================

function viewAreaReviewDetails(areaId, areaName) {
    // Filter reviews by area
    document.getElementById('filterAreaReview').value = areaId;
    filterReviews();
    
    // Scroll to review table
    document.getElementById('reviewsTable').scrollIntoView({ behavior: 'smooth' });
    
    showToast(`Filtered to ${areaName}`, 'info');
}

function viewFullComments(sectionName, comments) {
    const modal = createModal(`Comments for ${sectionName}`, `
        <div class="comments-display">
            <p>${comments}</p>
        </div>
    `, null, true); // true = no confirm button, only close

    document.body.appendChild(modal);
}

async function sendReminderToAccreditor(accreditorId, sectionName = null) {
    const message = sectionName 
        ? `Send reminder to review "${sectionName}"?`
        : 'Send reminder to complete pending reviews?';
    
    if (!confirm(message)) return;

    try {
        const response = await fetch('/api/accreditation/send-reminder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accreditor_id: accreditorId,
                section_name: sectionName,
                sent_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Reminder sent successfully', 'success');
        } else {
            showToast(data.error || 'Failed to send reminder', 'error');
        }
    } catch (error) {
        console.error('Error sending reminder:', error);
        showToast('Failed to send reminder', 'error');
    }
}

function viewAccreditorReviews(accreditorId, accreditorName) {
    // Filter reviews by accreditor
    document.getElementById('filterAccreditor').value = accreditorName;
    filterReviews();
    
    // Scroll to review table
    document.getElementById('reviewsTable').scrollIntoView({ behavior: 'smooth' });
    
    showToast(`Filtered to ${accreditorName}'s reviews`, 'info');
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

function createModal(title, bodyHTML, onConfirm = null, closeOnly = false) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const footerHTML = closeOnly 
        ? '<button class="btn-primary" onclick="closeAllModals()">Close</button>'
        : `
            <button class="btn-secondary" onclick="closeAllModals()">Cancel</button>
            <button class="btn-primary" id="modalConfirmBtn">Confirm</button>
          `;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeAllModals()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${bodyHTML}
            </div>
            <div class="modal-footer">
                ${footerHTML}
            </div>
        </div>
    `;

    if (!closeOnly && onConfirm) {
        setTimeout(() => {
            const confirmBtn = document.getElementById('modalConfirmBtn');
            if (confirmBtn) {
                confirmBtn.onclick = onConfirm;
            }
        }, 100);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAllModals();
        }
    });

    return modal;
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.remove();
    });
}

function showNoCycleMessage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="no-cycle-message">
            <i class="fas fa-exclamation-circle"></i>
            <h2>No Active Cycle</h2>
            <p>Please create an accreditation cycle first to begin monitoring reviews.</p>
            <a href="/private/html/adminPages/adminLlave/adminLlave.html" class="btn-primary">
                <i class="fas fa-arrow-left"></i> Go to Dashboard
            </a>
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
    // Event listeners are handled inline with onchange/onclick attributes
    console.log('Review monitoring event listeners initialized');
}

function initializeProfileDropdown() {
    // Profile dropdown functionality
    console.log('Profile dropdown initialized');
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