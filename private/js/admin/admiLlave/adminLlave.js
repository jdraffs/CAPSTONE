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
                        <span class="info-label">Sections:</span>
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
                            <th>Section Name</th>
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
    alert(comments); // Simple implementation, can be enhanced with a modal
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