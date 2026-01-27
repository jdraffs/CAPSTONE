// private/js/admin/admiLlave/adminLlave.js - PART 1

const adminid = 6; // AdminLlave's ID from admin_accounts table
let currentCycle = null;
let activeCycleId = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadActiveCycle();
    setupEventListeners();
});

// ============================================
// LOAD DATA FUNCTIONS
// ============================================

async function loadActiveCycle() {
    try {
        const response = await fetch('/api/accreditation/cycle/active');
        const data = await response.json();

        if (data.cycle) {
            currentCycle = data.cycle;
            activeCycleId = data.cycle.id;
            displayCycleInfo(data.cycle);
            await loadDashboardData();
        } else {
            displayNoCycle();
        }
    } catch (error) {
        console.error('Error loading active cycle:', error);
        showToast('Failed to load cycle information', 'error');
    }
}

async function loadDashboardData() {
    if (!activeCycleId) return;

    try {
        // Load all dashboard data in parallel
        await Promise.all([
            loadQuickStats(),
            loadSubmissionControl(),
            loadAreas(),
            loadRecentActivity()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

async function loadQuickStats() {
    try {
        const response = await fetch(`/api/accreditation/dashboard/stats/${activeCycleId}`);
        const data = await response.json();

        if (data.stats) {
            const stats = data.stats;
            const total = parseInt(stats.total_sections) || 0;
            const submitted = parseInt(stats.submitted_count) || 0;
            const reviewed = parseInt(stats.reviewed_count) || 0;
            const complete = parseInt(stats.complete_count) || 0;

            document.getElementById('totalSections').textContent = total;
            document.getElementById('submittedSections').textContent = submitted;
            document.getElementById('reviewedSections').textContent = reviewed;
            document.getElementById('completeSections').textContent = complete;

            // Calculate percentages
            const submittedPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
            const reviewedPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
            const completePct = total > 0 ? Math.round((complete / total) * 100) : 0;

            document.getElementById('submittedPercentage').textContent = `${submittedPct}%`;
            document.getElementById('reviewedPercentage').textContent = `${reviewedPct}%`;
            document.getElementById('completePercentage').textContent = `${completePct}%`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadSubmissionControl() {
    try {
        const response = await fetch(`/api/accreditation/submission-control/${activeCycleId}`);
        const data = await response.json();

        if (data.control) {
            displaySubmissionControl(data.control);
        }
    } catch (error) {
        console.error('Error loading submission control:', error);
    }
}

async function loadAreas() {
    try {
        const response = await fetch(`/api/accreditation/areas/${activeCycleId}`);
        const data = await response.json();

        if (data.areas) {
            displayAreas(data.areas);
        }
    } catch (error) {
        console.error('Error loading areas:', error);
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`/api/accreditation/activity/${activeCycleId}?limit=15`);
        const data = await response.json();

        if (data.activities) {
            displayActivity(data.activities);
        }
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayCycleInfo(cycle) {
    document.getElementById('cycleTitle').textContent = `Academic Year ${cycle.academic_year}`;
    document.getElementById('cycleStatus').textContent = `Status: ${cycle.status}`;
    
    document.getElementById('createCycleBtn').style.display = 'none';
    document.getElementById('archiveCycleBtn').style.display = 'inline-flex';
}

function displayNoCycle() {
    document.getElementById('cycleTitle').textContent = 'No Active Cycle';
    document.getElementById('cycleStatus').textContent = 'Create a new cycle to begin';
    
    document.getElementById('createCycleBtn').style.display = 'inline-flex';
    document.getElementById('archiveCycleBtn').style.display = 'none';

    // Hide control buttons when no cycle
    document.getElementById('openSubmissionsBtn').style.display = 'none';
    document.getElementById('closeSubmissionsBtn').style.display = 'none';
}

function displaySubmissionControl(control) {
    const statusBadge = document.querySelector('.status-badge');
    const statusText = document.getElementById('statusText');
    const openBtn = document.getElementById('openSubmissionsBtn');
    const closeBtn = document.getElementById('closeSubmissionsBtn');

    if (control.is_open) {
        statusBadge.className = 'status-badge open';
        statusBadge.innerHTML = '<i class="fas fa-lock-open"></i> OPEN';
        statusText.textContent = 'Submissions are currently open';
        openBtn.style.display = 'none';
        closeBtn.style.display = 'inline-flex';
    } else {
        statusBadge.className = 'status-badge closed';
        statusBadge.innerHTML = '<i class="fas fa-lock"></i> CLOSED';
        statusText.textContent = 'Submissions are currently closed';
        openBtn.style.display = 'inline-flex';
        closeBtn.style.display = 'none';
    }
}

function displayAreas(areas) {
    const areasGrid = document.getElementById('areasGrid');
    areasGrid.innerHTML = '';

    areas.forEach(area => {
        const totalSections = parseInt(area.total_sections) || 0;
        const submittedSections = parseInt(area.submitted_sections) || 0;
        const reviewedSections = parseInt(area.reviewed_sections) || 0;
        const completeSections = parseInt(area.complete_sections) || 0;

        const submittedPct = totalSections > 0 ? Math.round((submittedSections / totalSections) * 100) : 0;
        const reviewedPct = totalSections > 0 ? Math.round((reviewedSections / totalSections) * 100) : 0;

        let statusClass = 'status-pending';
        let statusText = 'In Progress';
        if (completeSections === totalSections && totalSections > 0) {
            statusClass = 'status-complete';
            statusText = 'Complete';
        } else if (submittedSections === 0) {
            statusClass = 'status-empty';
            statusText = 'Not Started';
        }

        const areaCard = `
            <div class="area-card" data-area-id="${area.area_id}">
                <div class="area-header">
                    <h4 class="area-title">Area ${area.area_number}: ${area.area_name}</h4>
                    <span class="area-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="area-info">
                    <div class="info-row">
                        <span class="info-label">Area Head:</span>
                        <span class="info-value">${area.area_head_name || 'Not Assigned'}</span>
                        <button class="btn-icon" onclick="assignAreaHead(${area.area_id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Accreditors:</span>
                        <span class="info-value" id="accreditors-${area.area_id}">Loading...</span>
                        <button class="btn-icon" onclick="manageAccreditors(${area.area_id})">
                            <i class="fas fa-users-cog"></i>
                        </button>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Accreditation Items:</span>
                        <span class="info-value">${totalSections}</span>
                    </div>
                </div>

                <div class="area-progress">
                    <div class="progress-item">
                        <div class="progress-header">
                            <span>Submissions</span>
                            <span>${submittedSections}/${totalSections} (${submittedPct}%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${submittedPct}%"></div>
                        </div>
                    </div>
                    
                    <div class="progress-item">
                        <div class="progress-header">
                            <span>Reviews</span>
                            <span>${reviewedSections}/${totalSections} (${reviewedPct}%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${reviewedPct}%"></div>
                        </div>
                    </div>
                </div>

                <button class="btn-view-details" onclick="viewAreaDetails(${area.area_id}, '${area.area_name}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;

        areasGrid.innerHTML += areaCard;

        // Load accreditors for this area
        loadAreaAccreditors(area.area_id);
    });
}

async function loadAreaAccreditors(areaId) {
    try {
        const response = await fetch(`/api/accreditation/area/${activeCycleId}/${areaId}/accreditors`);
        const data = await response.json();

        const accreditorsElement = document.getElementById(`accreditors-${areaId}`);
        if (data.accreditors && data.accreditors.length > 0) {
            const names = data.accreditors.map(a => a.accreditor_name).join(', ');
            accreditorsElement.textContent = names;
        } else {
            accreditorsElement.textContent = 'None assigned';
        }
    } catch (error) {
        console.error('Error loading accreditors:', error);
        document.getElementById(`accreditors-${areaId}`).textContent = 'Error loading';
    }
}

function displayActivity(activities) {
    const activityFeed = document.getElementById('activityFeed');
    
    if (activities.length === 0) {
        activityFeed.innerHTML = '<p class="no-activity">No recent activity</p>';
        return;
    }

    activityFeed.innerHTML = '';

    activities.forEach(activity => {
        const timeAgo = getTimeAgo(new Date(activity.created_at));
        const roleClass = activity.user_role.toLowerCase().replace(' ', '-');

        const activityItem = `
            <div class="activity-item">
                <div class="activity-icon ${roleClass}">
                    <i class="fas ${getActionIcon(activity.action_type)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-text">
                        <strong>${activity.user_name}</strong> 
                        ${activity.action_type.toLowerCase()} 
                        <strong>${activity.target_name}</strong>
                    </p>
                    <p class="activity-time">${timeAgo}</p>
                </div>
            </div>
        `;

        activityFeed.innerHTML += activityItem;
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Create Cycle Modal
    document.getElementById('createCycleBtn').addEventListener('click', openCreateCycleModal);
    document.getElementById('closeCycleModal').addEventListener('click', closeCreateCycleModal);
    document.getElementById('cancelCycleBtn').addEventListener('click', closeCreateCycleModal);
    document.getElementById('confirmCreateCycleBtn').addEventListener('click', createCycle);

    // Archive Cycle
    document.getElementById('archiveCycleBtn').addEventListener('click', archiveCycle);

    // Submission Control
    document.getElementById('openSubmissionsBtn').addEventListener('click', openSubmissions);
    document.getElementById('closeSubmissionsBtn').addEventListener('click', closeSubmissions);

    // Area Details Modal
    document.getElementById('closeAreaModal').addEventListener('click', closeAreaDetailsModal);

    // Assign Modal
    document.getElementById('closeAssignModal').addEventListener('click', closeAssignModal);
    document.getElementById('cancelAssignBtn').addEventListener('click', closeAssignModal);
    document.getElementById('confirmAssignBtn').addEventListener('click', confirmAssignment);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}
// private/js/admin/admiLlave/adminLlave.js - PART 2

// ============================================
// MODAL FUNCTIONS
// ============================================

function openCreateCycleModal() {
    document.getElementById('createCycleModal').style.display = 'flex';
    document.getElementById('academicYear').value = '';
}

function closeCreateCycleModal() {
    document.getElementById('createCycleModal').style.display = 'none';
}

function closeAreaDetailsModal() {
    document.getElementById('areaDetailsModal').style.display = 'none';
}

function closeAssignModal() {
    document.getElementById('assignModal').style.display = 'none';
}

// ============================================
// ACTION FUNCTIONS
// ============================================

async function createCycle() {
    const academicYear = document.getElementById('academicYear').value.trim();

    if (!academicYear) {
        showToast('Please enter academic year', 'error');
        return;
    }

    // Validate academic year format (YYYY-YYYY)
    const yearPattern = /^\d{4}-\d{4}$/;
    if (!yearPattern.test(academicYear)) {
        showToast('Invalid format. Use YYYY-YYYY (e.g., 2025-2026)', 'error');
        return;
    }

    try {
        const response = await fetch('/api/accreditation/cycle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                academic_year: academicYear,
                created_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Cycle created successfully', 'success');
            closeCreateCycleModal();
            await loadActiveCycle();
        } else {
            showToast(data.error || 'Failed to create cycle', 'error');
        }
    } catch (error) {
        console.error('Error creating cycle:', error);
        showToast('Failed to create cycle', 'error');
    }
}

async function archiveCycle() {
    if (!confirm('Are you sure you want to archive this cycle? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/cycle/${activeCycleId}/archive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Cycle archived successfully', 'success');
            currentCycle = null;
            activeCycleId = null;
            displayNoCycle();
            // Clear dashboard
            document.getElementById('areasGrid').innerHTML = '';
            document.getElementById('activityFeed').innerHTML = '';
        } else {
            showToast(data.error || 'Failed to archive cycle', 'error');
        }
    } catch (error) {
        console.error('Error archiving cycle:', error);
        showToast('Failed to archive cycle', 'error');
    }
}

async function openSubmissions() {
    if (!confirm('Open submissions? Area Heads will be able to add/edit Google Drive links.')) {
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/submission-control/${activeCycleId}/open`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opened_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Submissions opened successfully', 'success');
            await loadSubmissionControl();
            await loadRecentActivity();
        } else {
            showToast(data.error || 'Failed to open submissions', 'error');
        }
    } catch (error) {
        console.error('Error opening submissions:', error);
        showToast('Failed to open submissions', 'error');
    }
}

async function closeSubmissions() {
    if (!confirm('Close submissions? All Google Drive links will be locked and accreditors can begin reviewing.')) {
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/submission-control/${activeCycleId}/close`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ closed_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Submissions closed and all links locked', 'success');
            await loadSubmissionControl();
            await loadRecentActivity();
        } else {
            showToast(data.error || 'Failed to close submissions', 'error');
        }
    } catch (error) {
        console.error('Error closing submissions:', error);
        showToast('Failed to close submissions', 'error');
    }
}

async function viewAreaDetails(areaId, areaName) {
    try {
        const response = await fetch(`/api/accreditation/sections/${activeCycleId}/${areaId}`);
        const data = await response.json();

        document.getElementById('areaModalTitle').textContent = areaName;
        
        const modalContent = document.getElementById('areaModalContent');
        
        if (!data.sections || data.sections.length === 0) {
            modalContent.innerHTML = '<p class="no-data">No sections found for this area</p>';
        } else {
            let tableHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Accreditation Item</th>
                            <th>Google Drive Link</th>
                            <th>Submitted By</th>
                            <th>Date</th>
                            <th>Review Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.sections.forEach(section => {
                const statusBadge = getReviewStatusBadge(section.review_status);
                const linkText = section.google_drive_link 
                    ? `<a href="${section.google_drive_link}" target="_blank" class="link-button"><i class="fas fa-external-link-alt"></i> Open</a>` 
                    : '<span class="text-muted">Not submitted</span>';
                const submittedBy = section.submitted_by_name || '-';
                const submittedDate = section.submitted_at 
                    ? new Date(section.submitted_at).toLocaleDateString() 
                    : '-';

                tableHTML += `
                    <tr>
                        <td>${section.section_name}</td>
                        <td>${linkText}</td>
                        <td>${submittedBy}</td>
                        <td>${submittedDate}</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${section.comments ? `<button class="btn-icon" onclick="viewComments('${section.comments.replace(/'/g, "\\'")}')"><i class="fas fa-comment"></i></button>` : ''}
                        </td>
                    </tr>
                `;
            });

            tableHTML += '</tbody></table>';
            modalContent.innerHTML = tableHTML;
        }

        document.getElementById('areaDetailsModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading area details:', error);
        showToast('Failed to load area details', 'error');
    }
}

function assignAreaHead(areaId) {
    // TODO: Implement area head assignment
    showToast('Area Head assignment will be implemented in Tab 2', 'info');
}

function manageAccreditors(areaId) {
    // TODO: Implement accreditor management
    showToast('Accreditor management will be implemented in Tab 2', 'info');
}

let currentAssignment = null;

function confirmAssignment() {
    // Assignment logic will be implemented in Tab 2
    closeAssignModal();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getReviewStatusBadge(status) {
    if (!status || status === 'Not Reviewed') {
        return '<span class="badge badge-gray">Not Reviewed</span>';
    } else if (status === 'Complete') {
        return '<span class="badge badge-green">Complete</span>';
    } else if (status === 'Needs Revision') {
        return '<span class="badge badge-yellow">Needs Revision</span>';
    } else if (status === 'Incomplete') {
        return '<span class="badge badge-red">Incomplete</span>';
    }
    return '<span class="badge badge-gray">-</span>';
}

function getActionIcon(actionType) {
    const icons = {
        'Created': 'fa-plus',
        'Updated': 'fa-edit',
        'Deleted': 'fa-trash',
        'Assigned': 'fa-user-plus',
        'Removed': 'fa-user-minus',
        'Opened': 'fa-lock-open',
        'Closed': 'fa-lock',
        'Submitted': 'fa-upload',
        'Reviewed': 'fa-check',
        'Archived': 'fa-archive'
    };
    return icons[actionType] || 'fa-circle';
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}

function viewComments(comments) {
    alertSystem.warning(comments); // Simple implementation, can be enhanced with a modal
}

function showToast(message, type = 'info') {
    // Simple toast implementation (can be enhanced with a toast library)
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
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
// ============================================
// VIEW ARCHIVED CYCLES MODAL
// ============================================

async function openArchivedCyclesModal() {
    try {
        const response = await fetch('/api/accreditation/cycles');
        const data = await response.json();

        const archivedCycles = data.cycles.filter(c => c.status === 'Archived');

        if (archivedCycles.length === 0) {
            showToast('No archived cycles found', 'info');
            return;
        }

        const cyclesHTML = archivedCycles.map(cycle => {
            const createdDate = new Date(cycle.created_at).toLocaleDateString();
            const archivedDate = cycle.archived_at 
                ? new Date(cycle.archived_at).toLocaleDateString() 
                : '-';

            return `
                <div class="archived-cycle-item">
                    <div class="cycle-info">
                        <h4 class="cycle-name">${cycle.academic_year}</h4>
                        <div class="cycle-dates">
                            <span><strong>Created:</strong> ${createdDate}</span>
                            <span><strong>Archived:</strong> ${archivedDate}</span>
                        </div>
                    </div>
                    <div class="cycle-actions">
                        <button class="btn-primary btn-sm" onclick="viewArchivedCycleDetails(${cycle.id})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="btn-secondary btn-sm" onclick="restoreCycle(${cycle.id})">
                            <i class="fas fa-undo"></i> Restore
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const modal = createModal('Archived Cycles', `
            <div class="archived-cycles-container">
                ${cyclesHTML}
            </div>
        `, null, true); // closeOnly = true

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading archived cycles:', error);
        showToast('Failed to load archived cycles', 'error');
    }
}

// ============================================
// VIEW ARCHIVED CYCLE DETAILS
// ============================================

async function viewArchivedCycleDetails(cycleId) {
    try {
        // Load all data for this archived cycle
        const [statsRes, areasRes, sectionsRes] = await Promise.all([
            fetch(`/api/accreditation/dashboard/stats/${cycleId}`),
            fetch(`/api/accreditation/areas/${cycleId}`),
            fetch(`/api/accreditation/sections/all/${cycleId}`)
        ]);

        const stats = await statsRes.json();
        const areas = await areasRes.json();
        const sections = await sectionsRes.json();

        const totalSections = parseInt(stats.stats?.total_sections) || 0;
        const submitted = parseInt(stats.stats?.submitted_count) || 0;
        const reviewed = parseInt(stats.stats?.reviewed_count) || 0;
        const complete = parseInt(stats.stats?.complete_count) || 0;

        const detailsHTML = `
            <div class="archived-cycle-details">
                <!-- Statistics Summary -->
                <div class="detail-section">
                    <h4>Summary Statistics</h4>
                    <div class="stats-grid-small">
                        <div class="stat-item-small">
                            <span class="stat-label">Total Items:</span>
                            <span class="stat-value">${totalSections}</span>
                        </div>
                        <div class="stat-item-small">
                            <span class="stat-label">Submitted:</span>
                            <span class="stat-value">${submitted} (${totalSections > 0 ? Math.round((submitted/totalSections)*100) : 0}%)</span>
                        </div>
                        <div class="stat-item-small">
                            <span class="stat-label">Reviewed:</span>
                            <span class="stat-value">${reviewed} (${totalSections > 0 ? Math.round((reviewed/totalSections)*100) : 0}%)</span>
                        </div>
                        <div class="stat-item-small">
                            <span class="stat-label">Complete:</span>
                            <span class="stat-value">${complete} (${totalSections > 0 ? Math.round((complete/totalSections)*100) : 0}%)</span>
                        </div>
                    </div>
                </div>

                <!-- Area Breakdown -->
                <div class="detail-section">
                    <h4>Area Breakdown</h4>
                    <div class="area-list-compact">
                        ${areas.areas.map(area => `
                            <div class="area-row-compact">
                                <span class="area-name">Area ${area.area_number}: ${area.area_name}</span>
                                <span class="area-progress">${area.complete_sections}/${area.total_sections} Complete</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Export Options -->
                <div class="detail-section">
                    <h4>Export Data</h4>
                    <div class="export-buttons">
                        <button class="btn-secondary" onclick="exportArchivedCycleData(${cycleId}, 'sections')">
                            <i class="fas fa-download"></i> Export Accreditation Items
                        </button>
                        <button class="btn-secondary" onclick="exportArchivedCycleData(${cycleId}, 'reviews')">
                            <i class="fas fa-download"></i> Export Reviews
                        </button>
                        <button class="btn-secondary" onclick="exportArchivedCycleData(${cycleId}, 'complete')">
                            <i class="fas fa-download"></i> Complete Report
                        </button>
                    </div>
                </div>
            </div>
        `;

        closeAllModals();
        const modal = createModal('Archived Cycle Details', detailsHTML, null, true);
        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error loading cycle details:', error);
        showToast('Failed to load cycle details', 'error');
    }
}

// ============================================
// RESTORE ARCHIVED CYCLE
// ============================================

async function restoreCycle(cycleId) {
    if (!confirm('Restore this cycle? It will become the active cycle again.')) {
        return;
    }

    try {
        // First check if there's already an active cycle
        const activeCheck = await fetch('/api/accreditation/cycle/active');
        const activeData = await activeCheck.json();

        if (activeData.cycle) {
            showToast('Cannot restore: Another cycle is currently active. Archive it first.', 'error');
            return;
        }

        // Restore the cycle
        const response = await fetch(`/api/accreditation/cycle/${cycleId}/restore`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restored_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Cycle restored successfully', 'success');
            closeAllModals();
            await loadActiveCycle();
        } else {
            showToast(data.error || 'Failed to restore cycle', 'error');
        }
    } catch (error) {
        console.error('Error restoring cycle:', error);
        showToast('Failed to restore cycle', 'error');
    }
}

// ============================================
// EXPORT ARCHIVED CYCLE DATA
// ============================================

async function exportArchivedCycleData(cycleId, type) {
    try {
        showToast('Generating export...', 'info');

        const response = await fetch(`/api/accreditation/sections/all/${cycleId}`);
        const data = await response.json();

        if (!data.sections || data.sections.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }

        // Get cycle info
        const cycleRes = await fetch('/api/accreditation/cycles');
        const cyclesData = await cycleRes.json();
        const cycle = cyclesData.cycles.find(c => c.id === cycleId);

        const wb = XLSX.utils.book_new();

        if (type === 'sections' || type === 'complete') {
            const wsData = [
                [`Sections Export - ${cycle.academic_year}`],
                [`Generated: ${new Date().toLocaleDateString()}`],
                [],
                ['Section Name', 'Area', 'Google Drive Link', 'Submitted By', 'Date Submitted', 'Review Status']
            ];

            data.sections.forEach(section => {
                wsData.push([
                    section.section_name,
                    `Area ${section.area_number}`,
                    section.google_drive_link || 'Not Submitted',
                    section.area_head_name || '-',
                    section.submitted_at ? new Date(section.submitted_at).toLocaleDateString() : '-',
                    section.review_status || 'Not Reviewed'
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, 'Sections');
        }

        if (type === 'reviews' || type === 'complete') {
            const reviewData = data.sections.filter(s => s.review_status && s.review_status !== 'Not Reviewed');
            
            const wsData = [
                [`Reviews Export - ${cycle.academic_year}`],
                [`Generated: ${new Date().toLocaleDateString()}`],
                [],
                ['Section', 'Area', 'Status', 'Reviewed By', 'Date', 'Comments']
            ];

            reviewData.forEach(section => {
                wsData.push([
                    section.section_name,
                    `Area ${section.area_number}`,
                    section.review_status,
                    section.reviewed_by_name || '-',
                    section.submitted_at ? new Date(section.submitted_at).toLocaleDateString() : '-',
                    '-' // Comments would come from section_reviews table
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, 'Reviews');
        }

        XLSX.writeFile(wb, `Archived_Cycle_${cycle.academic_year}_${type}.xlsx`);
        showToast('Export complete', 'success');

    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Failed to export data', 'error');
    }
}
// ============================================
// MODAL UTILITY FUNCTIONS
// ============================================

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

// ============================================
// VIEW ARCHIVED CYCLES MODAL
// ============================================

async function openArchivedCyclesModal() {
    try {
        const response = await fetch('/api/accreditation/cycles');
        const data = await response.json();

        const archivedCycles = data.cycles.filter(c => c.status === 'Archived');

        if (archivedCycles.length === 0) {
            showToast('No archived cycles found', 'info');
            return;
        }

        const cyclesHTML = archivedCycles.map(cycle => {
            const createdDate = new Date(cycle.created_at).toLocaleDateString();
            const archivedDate = cycle.archived_at 
                ? new Date(cycle.archived_at).toLocaleDateString() 
                : '-';

            return `
                <div class="archived-cycle-item">
                    <div class="cycle-info">
                        <h4 class="cycle-name">${cycle.academic_year}</h4>
                        <div class="cycle-dates">
                            <span><strong>Created:</strong> ${createdDate}</span>
                            <span><strong>Archived:</strong> ${archivedDate}</span>
                        </div>
                    </div>
                    <div class="cycle-actions">
                        <button class="btn-primary btn-sm" onclick="viewArchivedCycleDetails(${cycle.id})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="btn-secondary btn-sm" onclick="restoreCycle(${cycle.id})">
                            <i class="fas fa-undo"></i> Restore
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const modal = createModal('Archived Cycles', `
            <div class="archived-cycles-container">
                ${cyclesHTML}
            </div>
        `, null, true);

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading archived cycles:', error);
        showToast('Failed to load archived cycles', 'error');
    }
}

// ============================================
// VIEW ARCHIVED CYCLE DETAILS
// ============================================

async function viewArchivedCycleDetails(cycleId) {
    try {
        const [statsRes, areasRes, sectionsRes] = await Promise.all([
            fetch(`/api/accreditation/dashboard/stats/${cycleId}`),
            fetch(`/api/accreditation/areas/${cycleId}`),
            fetch(`/api/accreditation/sections/all/${cycleId}`)
        ]);

        const stats = await statsRes.json();
        const areas = await areasRes.json();
        const sections = await sectionsRes.json();

        const totalSections = parseInt(stats.stats?.total_sections) || 0;
        const submitted = parseInt(stats.stats?.submitted_count) || 0;
        const reviewed = parseInt(stats.stats?.reviewed_count) || 0;
        const complete = parseInt(stats.stats?.complete_count) || 0;

        const detailsHTML = `
            <div class="archived-cycle-details">
                <div class="detail-section">
                    <h4>Summary Statistics</h4>
                    <div class="stats-grid-small">
                        <div class="stat-item-small">
                            <span class="stat-label">Total Items:</span>
                            <span class="stat-value">${totalSections}</span>
                        </div>
                        <div class="stat-item-small">
                            <span class="stat-label">Submitted:</span>
                            <span class="stat-value">${submitted} (${totalSections > 0 ? Math.round((submitted/totalSections)*100) : 0}%)</span>
                        </div>
                        <div class="stat-item-small">
                            <span class="stat-label">Reviewed:</span>
                            <span class="stat-value">${reviewed} (${totalSections > 0 ? Math.round((reviewed/totalSections)*100) : 0}%)</span>
                        </div>
                        <div class="stat-item-small">
                            <span class="stat-label">Complete:</span>
                            <span class="stat-value">${complete} (${totalSections > 0 ? Math.round((complete/totalSections)*100) : 0}%)</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Area Breakdown</h4>
                    <div class="area-list-compact">
                        ${areas.areas.map(area => `
                            <div class="area-row-compact">
                                <span class="area-name">Area ${area.area_number}: ${area.area_name}</span>
                                <span class="area-progress">${area.complete_sections}/${area.total_sections} Complete</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Export Data</h4>
                    <div class="export-buttons">
                        <button class="btn-secondary" onclick="exportArchivedCycleData(${cycleId}, 'sections')">
                            <i class="fas fa-download"></i> Export Accreditation Items
                        </button>
                        <button class="btn-secondary" onclick="exportArchivedCycleData(${cycleId}, 'reviews')">
                            <i class="fas fa-download"></i> Export Reviews
                        </button>
                        <button class="btn-secondary" onclick="exportArchivedCycleData(${cycleId}, 'complete')">
                            <i class="fas fa-download"></i> Complete Report
                        </button>
                    </div>
                </div>
            </div>
        `;

        closeAllModals();
        const modal = createModal('Archived Cycle Details', detailsHTML, null, true);
        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error loading cycle details:', error);
        showToast('Failed to load cycle details', 'error');
    }
}

// ============================================
// RESTORE ARCHIVED CYCLE
// ============================================

async function restoreCycle(cycleId) {
    if (!confirm('Restore this cycle? It will become the active cycle again.')) {
        return;
    }

    try {
        const activeCheck = await fetch('/api/accreditation/cycle/active');
        const activeData = await activeCheck.json();

        if (activeData.cycle) {
            showToast('Cannot restore: Another cycle is currently active. Archive it first.', 'error');
            return;
        }

        const response = await fetch(`/api/accreditation/cycle/${cycleId}/restore`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restored_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Cycle restored successfully', 'success');
            closeAllModals();
            await loadActiveCycle();
        } else {
            showToast(data.error || 'Failed to restore cycle', 'error');
        }
    } catch (error) {
        console.error('Error restoring cycle:', error);
        showToast('Failed to restore cycle', 'error');
    }
}

// ============================================
// EXPORT ARCHIVED CYCLE DATA
// ============================================

async function exportArchivedCycleData(cycleId, type) {
    try {
        showToast('Generating export...', 'info');

        const response = await fetch(`/api/accreditation/sections/all/${cycleId}`);
        const data = await response.json();

        if (!data.sections || data.sections.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }

        const cycleRes = await fetch('/api/accreditation/cycles');
        const cyclesData = await cycleRes.json();
        const cycle = cyclesData.cycles.find(c => c.id === cycleId);

        const wb = XLSX.utils.book_new();

        if (type === 'sections' || type === 'complete') {
            const wsData = [
                [`Sections Export - ${cycle.academic_year}`],
                [`Generated: ${new Date().toLocaleDateString()}`],
                [],
                ['Section Name', 'Area', 'Google Drive Link', 'Submitted By', 'Date Submitted', 'Review Status']
            ];

            data.sections.forEach(section => {
                wsData.push([
                    section.section_name,
                    `Area ${section.area_number}`,
                    section.google_drive_link || 'Not Submitted',
                    section.area_head_name || '-',
                    section.submitted_at ? new Date(section.submitted_at).toLocaleDateString() : '-',
                    section.review_status || 'Not Reviewed'
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, 'Sections');
        }

        if (type === 'reviews' || type === 'complete') {
            const reviewData = data.sections.filter(s => s.review_status && s.review_status !== 'Not Reviewed');
            
            const wsData = [
                [`Reviews Export - ${cycle.academic_year}`],
                [`Generated: ${new Date().toLocaleDateString()}`],
                [],
                ['Section', 'Area', 'Status', 'Reviewed By', 'Date']
            ];

            reviewData.forEach(section => {
                wsData.push([
                    section.section_name,
                    `Area ${section.area_number}`,
                    section.review_status,
                    section.reviewed_by_name || '-',
                    section.submitted_at ? new Date(section.submitted_at).toLocaleDateString() : '-'
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, 'Reviews');
        }

        XLSX.writeFile(wb, `Archived_Cycle_${cycle.academic_year}_${type}.xlsx`);
        showToast('Export complete', 'success');

    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Failed to export data', 'error');
    }
}