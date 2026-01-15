// private/js/admin/admiLlave/areaHead/statistics.js

let currentUser = null;
let activeCycleId = null;
let currentCycle = null;
let assignedArea = null;
let sections = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadCurrentUser();
    await loadActiveCycle();
    await loadAssignedArea();
    await loadSections();
    renderStatisticsUI();
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

async function loadSections() {
    if (!activeCycleId || !assignedArea) return;

    try {
        const response = await fetch(`/api/accreditation/sections/${activeCycleId}/${assignedArea.area_id}`);
        const data = await response.json();

        if (data.sections) {
            sections = data.sections;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

// ============================================
// RENDER STATISTICS UI
// ============================================

function renderStatisticsUI() {
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
                <h1 class="main-title">Statistics & Analytics</h1>
                <p class="subtitle">Area ${assignedArea.area_number}: ${assignedArea.area_name}</p>
            </div>
            <div class="header-actions">
                <button class="btn-secondary" onclick="refreshStatistics()">
                    <i class="fas fa-sync"></i> Refresh
                </button>
                <button class="btn-primary" onclick="exportStatistics()">
                    <i class="fas fa-download"></i> Export Report
                </button>
            </div>
        </div>

        <!-- Overview Stats -->
        <div class="stats-grid-large">
            <div class="stat-card-large total">
                <div class="stat-icon-large">
                    <i class="fas fa-list"></i>
                </div>
                <div class="stat-content-large">
                    <div class="stat-label-large">Total Sections</div>
                    <div class="stat-value-large" id="totalSections">0</div>
                    <div class="stat-change positive" id="totalChange">100%</div>
                </div>
            </div>

            <div class="stat-card-large submitted">
                <div class="stat-icon-large">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content-large">
                    <div class="stat-label-large">Submitted</div>
                    <div class="stat-value-large" id="submittedSections">0</div>
                    <div class="stat-progress">
                        <div class="stat-progress-bar" id="submittedProgress"></div>
                    </div>
                </div>
            </div>

            <div class="stat-card-large pending">
                <div class="stat-icon-large">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content-large">
                    <div class="stat-label-large">Pending</div>
                    <div class="stat-value-large" id="pendingSections">0</div>
                    <div class="stat-progress">
                        <div class="stat-progress-bar pending-bar" id="pendingProgress"></div>
                    </div>
                </div>
            </div>

            <div class="stat-card-large reviewed">
                <div class="stat-icon-large">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <div class="stat-content-large">
                    <div class="stat-label-large">Reviewed</div>
                    <div class="stat-value-large" id="reviewedSections">0</div>
                    <div class="stat-progress">
                        <div class="stat-progress-bar reviewed-bar" id="reviewedProgress"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-container">
            <!-- Submission Progress Chart -->
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">
                        <i class="fas fa-chart-pie"></i> Submission Status
                    </h3>
                </div>
                <div class="chart-body">
                    <canvas id="submissionChart"></canvas>
                </div>
            </div>

            <!-- Review Status Chart -->
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">
                        <i class="fas fa-chart-bar"></i> Review Status
                    </h3>
                </div>
                <div class="chart-body">
                    <canvas id="reviewChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Detailed Breakdown -->
        <div class="breakdown-card">
            <div class="breakdown-header">
                <h2 class="breakdown-title">
                    <i class="fas fa-th-list"></i> Section Breakdown
                </h2>
            </div>
            <div class="breakdown-table-container">
                <table class="breakdown-table">
                    <thead>
                        <tr>
                            <th>Section Name</th>
                            <th>Link Status</th>
                            <th>Review Status</th>
                            <th>Submitted Date</th>
                            <th>Days Since Submission</th>
                        </tr>
                    </thead>
                    <tbody id="breakdownTableBody">
                        <tr>
                            <td colspan="5" class="loading-cell">Loading data...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Performance Metrics -->
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="metric-content">
                    <div class="metric-label">Submission Rate</div>
                    <div class="metric-value" id="submissionRate">0%</div>
                    <div class="metric-desc">Sections with links</div>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="metric-content">
                    <div class="metric-label">Avg. Review Time</div>
                    <div class="metric-value" id="avgReviewTime">0</div>
                    <div class="metric-desc">Days from submission</div>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="metric-content">
                    <div class="metric-label">Completion Rate</div>
                    <div class="metric-value" id="completionRate">0%</div>
                    <div class="metric-desc">Complete reviews</div>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="metric-content">
                    <div class="metric-label">Needs Attention</div>
                    <div class="metric-value" id="needsAttention">0</div>
                    <div class="metric-desc">Revisions required</div>
                </div>
            </div>
        </div>
    `;

    // Update page title
    document.getElementById('pageTitle').textContent = 'Statistics & Analytics';

    // Calculate and display statistics
    calculateStatistics();
}

// ============================================
// CALCULATE STATISTICS
// ============================================

function calculateStatistics() {
    const total = sections.length;
    const submitted = sections.filter(s => s.google_drive_link).length;
    const pending = total - submitted;
    const reviewed = sections.filter(s => s.review_status && s.review_status !== 'Not Reviewed').length;
    const complete = sections.filter(s => s.review_status === 'Complete').length;
    const needsRevision = sections.filter(s => s.review_status === 'Needs Revision').length;
    const incomplete = sections.filter(s => s.review_status === 'Incomplete').length;
    const notReviewed = sections.filter(s => !s.review_status || s.review_status === 'Not Reviewed').length;

    // Update overview stats
    document.getElementById('totalSections').textContent = total;
    document.getElementById('submittedSections').textContent = submitted;
    document.getElementById('pendingSections').textContent = pending;
    document.getElementById('reviewedSections').textContent = reviewed;

    // Update progress bars
    const submittedPct = total > 0 ? (submitted / total) * 100 : 0;
    const pendingPct = total > 0 ? (pending / total) * 100 : 0;
    const reviewedPct = total > 0 ? (reviewed / total) * 100 : 0;

    document.getElementById('submittedProgress').style.width = `${submittedPct}%`;
    document.getElementById('pendingProgress').style.width = `${pendingPct}%`;
    document.getElementById('reviewedProgress').style.width = `${reviewedPct}%`;

    // Update performance metrics
    document.getElementById('submissionRate').textContent = `${Math.round(submittedPct)}%`;
    
    // Calculate average review time
    const reviewedSections = sections.filter(s => s.submitted_at && s.reviewed_at);
    let avgReviewDays = 0;
    if (reviewedSections.length > 0) {
        const totalDays = reviewedSections.reduce((sum, s) => {
            const submitted = new Date(s.submitted_at);
            const reviewed = new Date(s.reviewed_at);
            return sum + Math.floor((reviewed - submitted) / (1000 * 60 * 60 * 24));
        }, 0);
        avgReviewDays = Math.round(totalDays / reviewedSections.length);
    }
    document.getElementById('avgReviewTime').textContent = avgReviewDays;

    const completionPct = total > 0 ? (complete / total) * 100 : 0;
    document.getElementById('completionRate').textContent = `${Math.round(completionPct)}%`;
    document.getElementById('needsAttention').textContent = needsRevision;

    // Create charts
    createSubmissionChart(submitted, pending);
    createReviewChart(complete, needsRevision, incomplete, notReviewed);

    // Display breakdown table
    displayBreakdownTable();
}

// ============================================
// CREATE CHARTS
// ============================================

function createSubmissionChart(submitted, pending) {
    const ctx = document.getElementById('submissionChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Submitted', 'Pending'],
            datasets: [{
                data: [submitted, pending],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createReviewChart(complete, needsRevision, incomplete, notReviewed) {
    const ctx = document.getElementById('reviewChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Complete', 'Needs Revision', 'Incomplete', 'Not Reviewed'],
            datasets: [{
                label: 'Sections',
                data: [complete, needsRevision, incomplete, notReviewed],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ============================================
// DISPLAY BREAKDOWN TABLE
// ============================================

function displayBreakdownTable() {
    const tbody = document.getElementById('breakdownTableBody');
    
    if (sections.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="no-data">No sections found</td></tr>
        `;
        return;
    }

    tbody.innerHTML = sections.map(section => {
        const hasLink = section.google_drive_link;
        const linkStatus = hasLink 
            ? '<span class="badge badge-green">Submitted</span>' 
            : '<span class="badge badge-gray">Not Submitted</span>';
        
        const reviewStatus = getReviewStatusBadge(section.review_status);
        
        const submittedDate = section.submitted_at 
            ? new Date(section.submitted_at).toLocaleDateString() 
            : '-';
        
        let daysSince = '-';
        if (section.submitted_at) {
            const submitted = new Date(section.submitted_at);
            const now = new Date();
            const days = Math.floor((now - submitted) / (1000 * 60 * 60 * 24));
            daysSince = `${days} day${days !== 1 ? 's' : ''}`;
        }

        return `
            <tr>
                <td><strong>${section.section_name}</strong></td>
                <td>${linkStatus}</td>
                <td>${reviewStatus}</td>
                <td>${submittedDate}</td>
                <td>${daysSince}</td>
            </tr>
        `;
    }).join('');
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

async function refreshStatistics() {
    showToast('Refreshing statistics...', 'info');
    await loadSections();
    calculateStatistics();
    showToast('Statistics updated', 'success');
}

function exportStatistics() {
    if (sections.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const csvContent = [
        ['Section Name', 'Link Status', 'Review Status', 'Submitted Date', 'Days Since Submission'],
        ...sections.map(s => [
            s.section_name,
            s.google_drive_link ? 'Submitted' : 'Not Submitted',
            s.review_status || 'Not Reviewed',
            s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '-',
            s.submitted_at ? Math.floor((new Date() - new Date(s.submitted_at)) / (1000 * 60 * 60 * 24)) : '-'
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Area_${assignedArea.area_number}_Statistics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('Statistics exported successfully', 'success');
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