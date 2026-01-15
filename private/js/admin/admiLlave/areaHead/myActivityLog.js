// private/js/admin/admiLlave/areaHead/myActivityLog.js

let currentUser = null;
let activeCycleId = null;
let currentCycle = null;
let assignedArea = null;
let allActivities = [];
let currentPage = 1;
const itemsPerPage = 20;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadCurrentUser();
    await loadActiveCycle();
    await loadAssignedArea();
    rendermyActivityLogUI();
});

// ============================================
// LOAD USER DATA
// ============================================

async function loadCurrentUser() {
    try {
        const userStr = localStorage.getItem('accreditation_user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            const userName = document.querySelector('.user-name');
            if (userName) {
                userName.textContent = currentUser.full_name || currentUser.username;
            }
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
        }
    } catch (error) {
        console.error('Error loading active cycle:', error);
    }
}

async function loadAssignedArea() {
    if (!activeCycleId || !currentUser) return;

    try {
        const response = await fetch(`/api/accreditation/areas/${activeCycleId}`);
        const data = await response.json();

        if (data.areas) {
            assignedArea = data.areas.find(area => area.area_head_id === currentUser.id);
        }
    } catch (error) {
        console.error('Error loading assigned area:', error);
    }
}

// ============================================
// RENDER MY REVIEWS UI
// ============================================

function rendermyActivityLogUI() {
    const mainContent = document.getElementById('mainContent');
    
    if (!activeCycleId || !assignedArea) {
        mainContent.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-circle"></i>
                <h2>No Active Assignment</h2>
                <p>You don't have an active area assignment or accreditation cycle.</p>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <!-- Page Header -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="main-title">My Activity Log</h1>
                <p class="subtitle">Area ${assignedArea.area_number}: ${assignedArea.area_name}</p>
            </div>
        </div>

        <!-- Activity Summary Cards -->
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-icon total">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="summary-content">
                    <div class="summary-value" id="totalActivities">0</div>
                    <div class="summary-label">Total Activities</div>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon submissions">
                    <i class="fas fa-upload"></i>
                </div>
                <div class="summary-content">
                    <div class="summary-value" id="submissionActivities">0</div>
                    <div class="summary-label">Link Submissions</div>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon updates">
                    <i class="fas fa-edit"></i>
                </div>
                <div class="summary-content">
                    <div class="summary-value" id="updateActivities">0</div>
                    <div class="summary-label">Updates Made</div>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon recent">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="summary-content">
                    <div class="summary-value" id="recentActivities">0</div>
                    <div class="summary-label">This Week</div>
                </div>
            </div>
        </div>

        <!-- Filters -->
        <div class="filters-card">
            <div class="filters-row">
                <div class="filter-group">
                    <label>Action Type</label>
                    <select id="filterActionType" onchange="filterActivities()">
                        <option value="">All Actions</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Updated">Updated</option>
                        <option value="Deleted">Deleted</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Date Range</label>
                    <select id="filterDateRange" onchange="filterActivities()">
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Search</label>
                    <input type="text" id="searchActivity" placeholder="Search by section..." onkeyup="filterActivities()">
                </div>
                <div class="filter-actions">
                    <button class="btn-secondary" onclick="resetFilters()">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                    <button class="btn-primary" onclick="exportActivities()">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
        </div>

        <!-- Activity Timeline -->
        <div class="activity-card">
            <div class="card-header">
                <h2 class="card-title">
                    <i class="fas fa-history"></i> Activity Timeline
                </h2>
            </div>
            <div class="activity-timeline" id="activityTimeline">
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i> Loading activities...
                </div>
            </div>
            
            <!-- Pagination -->
            <div class="pagination" id="pagination" style="display: none;">
                <button class="pagination-btn" onclick="previousPage()" id="prevBtn">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span class="pagination-info" id="paginationInfo">Page 1</span>
                <button class="pagination-btn" onclick="nextPage()" id="nextBtn">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    // Update page title
    document.getElementById('pageTitle').textContent = 'My Activity Log';

    // Load activities
    loadActivities();
}

// ============================================
// LOAD ACTIVITIES
// ============================================

async function loadActivities() {
    if (!activeCycleId || !currentUser) return;

    try {
        const response = await fetch(`/api/accreditation/area-head/activity/${currentUser.id}/${activeCycleId}`);
        const data = await response.json();

        if (data.activities) {
            allActivities = data.activities;
            displayActivities(allActivities);
            updateSummaryStats(allActivities);
        } else {
            allActivities = [];
            displayNoActivities();
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        showToast('Failed to load activities', 'error');
        displayNoActivities();
    }
}

function displayActivities(activities) {
    const timeline = document.getElementById('activityTimeline');
    
    if (activities.length === 0) {
        displayNoActivities();
        return;
    }

    // Pagination
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedActivities = activities.slice(startIdx, endIdx);

    timeline.innerHTML = paginatedActivities.map(activity => {
        const date = new Date(activity.created_at);
        const timeAgo = getTimeAgo(date);
        const actionIcon = getActionIcon(activity.action_type);
        const actionClass = activity.action_type.toLowerCase().replace(' ', '-');

        return `
            <div class="timeline-item">
                <div class="timeline-marker ${actionClass}">
                    <i class="fas ${actionIcon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <div class="timeline-title">
                            <strong>${activity.action_type}</strong> ${activity.target_type}
                        </div>
                        <div class="timeline-time">${timeAgo}</div>
                    </div>
                    <div class="timeline-body">
                        <div class="timeline-section">${activity.target_name}</div>
                        ${activity.details ? `<div class="timeline-details">${activity.details}</div>` : ''}
                    </div>
                    <div class="timeline-footer">
                        <span class="timeline-date">
                            <i class="fas fa-calendar"></i> 
                            ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updatePagination(activities.length);
    document.getElementById('pagination').style.display = 'flex';
}

function displayNoActivities() {
    const timeline = document.getElementById('activityTimeline');
    timeline.innerHTML = `
        <div class="no-activity-message">
            <i class="fas fa-inbox"></i>
            <h3>No Activities Yet</h3>
            <p>Your activities will appear here once you start submitting section links.</p>
        </div>
    `;
    document.getElementById('pagination').style.display = 'none';
}

// ============================================
// UPDATE SUMMARY STATS
// ============================================

function updateSummaryStats(activities) {
    const total = activities.length;
    const submitted = activities.filter(a => a.action_type === 'Submitted').length;
    const updated = activities.filter(a => a.action_type === 'Updated').length;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = activities.filter(a => new Date(a.created_at) >= weekAgo).length;

    document.getElementById('totalActivities').textContent = total;
    document.getElementById('submissionActivities').textContent = submitted;
    document.getElementById('updateActivities').textContent = updated;
    document.getElementById('recentActivities').textContent = thisWeek;
}

// ============================================
// FILTER ACTIVITIES
// ============================================

function filterActivities() {
    const actionType = document.getElementById('filterActionType').value;
    const dateRange = document.getElementById('filterDateRange').value;
    const searchTerm = document.getElementById('searchActivity').value.toLowerCase();

    let filtered = allActivities;

    // Filter by action type
    if (actionType) {
        filtered = filtered.filter(a => a.action_type === actionType);
    }

    // Filter by date range
    if (dateRange !== 'all') {
        const now = new Date();
        let startDate;

        if (dateRange === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (dateRange === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (dateRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        if (startDate) {
            filtered = filtered.filter(a => new Date(a.created_at) >= startDate);
        }
    }

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.target_name.toLowerCase().includes(searchTerm) ||
            (a.details && a.details.toLowerCase().includes(searchTerm))
        );
    }

    currentPage = 1;
    displayActivities(filtered);
}

function resetFilters() {
    document.getElementById('filterActionType').value = '';
    document.getElementById('filterDateRange').value = 'all';
    document.getElementById('searchActivity').value = '';
    currentPage = 1;
    displayActivities(allActivities);
}

// ============================================
// PAGINATION
// ============================================

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('paginationInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        filterActivities();
    }
}

function nextPage() {
    const totalPages = Math.ceil(allActivities.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        filterActivities();
    }
}

// ============================================
// EXPORT ACTIVITIES
// ============================================

function exportActivities() {
    if (allActivities.length === 0) {
        showToast('No activities to export', 'warning');
        return;
    }

    const csvContent = [
        ['Date', 'Time', 'Action', 'Target Type', 'Target Name', 'Details'],
        ...allActivities.map(a => {
            const date = new Date(a.created_at);
            return [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                a.action_type,
                a.target_type,
                a.target_name,
                a.details || ''
            ];
        })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `My_Activities_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('Activities exported successfully', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getActionIcon(actionType) {
    const icons = {
        'Submitted': 'fa-upload',
        'Updated': 'fa-edit',
        'Deleted': 'fa-trash',
        'Created': 'fa-plus',
        'Removed': 'fa-minus'
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