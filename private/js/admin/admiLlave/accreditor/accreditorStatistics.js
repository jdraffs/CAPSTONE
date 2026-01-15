// private/js/admin/admiLlave/accreditor/accreditorStatistics.js

let currentUser = null;
let activeCycleId = null;
let currentCycle = null;
let myReviews = [];
let assignedAreas = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadCurrentUser();
    await loadActiveCycle();
    await loadAssignedAreas();
    await loadMyReviews();
    renderStatisticsPage();
});

// ============================================
// LOAD DATA
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

async function loadAssignedAreas() {
    if (!activeCycleId || !currentUser) return;

    try {
        const response = await fetch(`/api/accreditation/areas/${activeCycleId}`);
        const data = await response.json();

        if (data.areas) {
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
        }
    } catch (error) {
        console.error('Error loading assigned areas:', error);
    }
}

async function loadMyReviews() {
    if (!activeCycleId || !currentUser) return;

    try {
        const response = await fetch(`/api/accreditation/reviews/all/${activeCycleId}`);
        const data = await response.json();

        if (data.reviews) {
            myReviews = data.reviews.filter(r => r.accreditor_id === currentUser.id);
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// ============================================
// CALCULATE STATISTICS
// ============================================

function calculateStats() {
    const total = myReviews.length;
    const complete = myReviews.filter(r => r.review_status === 'Complete').length;
    const needsRevision = myReviews.filter(r => r.review_status === 'Needs Revision').length;
    const incomplete = myReviews.filter(r => r.review_status === 'Incomplete').length;

    const completionRate = total > 0 ? ((complete / total) * 100).toFixed(1) : 0;

    // Calculate reviews by area
    const reviewsByArea = assignedAreas.map(area => {
        const areaReviews = myReviews.filter(r => r.area_id === area.area_id);
        const areaComplete = areaReviews.filter(r => r.review_status === 'Complete').length;
        
        return {
            ...area,
            reviewed: areaReviews.length,
            complete: areaComplete,
            completion_rate: areaReviews.length > 0 ? ((areaComplete / areaReviews.length) * 100).toFixed(1) : 0
        };
    });

    // Calculate activity timeline (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const count = myReviews.filter(r => {
            const reviewDate = new Date(r.reviewed_at);
            return reviewDate >= date && reviewDate < nextDate;
        }).length;
        
        last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: count
        });
    }

    // Find most recent review
    const recentReview = myReviews.length > 0 
        ? myReviews.reduce((latest, review) => {
            return new Date(review.reviewed_at) > new Date(latest.reviewed_at) ? review : latest;
        })
        : null;

    return {
        total,
        complete,
        needsRevision,
        incomplete,
        completionRate,
        reviewsByArea,
        last7Days,
        recentReview
    };
}

// ============================================
// RENDER PAGE
// ============================================

function renderStatisticsPage() {
    const mainContent = document.getElementById('mainContent');
    const stats = calculateStats();

    if (!activeCycleId) {
        mainContent.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-circle"></i>
                <h2>No Active Cycle</h2>
                <p>There is no active accreditation cycle.</p>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <!-- Page Header -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="main-title">My Statistics</h1>
                <p class="subtitle">Performance overview for ${currentCycle.academic_year}</p>
            </div>
            <div class="assigned-areas-badge">
                <i class="fas fa-chart-line"></i>
                ${stats.completionRate}% Completion Rate
            </div>
        </div>

        <!-- Overall Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon total">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total Reviews</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon complete">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.complete}</div>
                    <div class="stat-label">Complete</div>
                    <div class="stat-percentage">${stats.total > 0 ? ((stats.complete / stats.total) * 100).toFixed(0) : 0}%</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon pending">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.needsRevision}</div>
                    <div class="stat-label">Needs Revision</div>
                    <div class="stat-percentage">${stats.total > 0 ? ((stats.needsRevision / stats.total) * 100).toFixed(0) : 0}%</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon reviewed">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.incomplete}</div>
                    <div class="stat-label">Incomplete</div>
                    <div class="stat-percentage">${stats.total > 0 ? ((stats.incomplete / stats.total) * 100).toFixed(0) : 0}%</div>
                </div>
            </div>
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
            <!-- Status Distribution -->
            <div class="chart-card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-chart-pie"></i> Status Distribution
                    </h3>
                </div>
                <div class="chart-container">
                    <canvas id="statusChart"></canvas>
                </div>
            </div>

            <!-- Activity Timeline -->
            <div class="chart-card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-chart-line"></i> Recent Activity (Last 7 Days)
                    </h3>
                </div>
                <div class="chart-container">
                    <canvas id="activityChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Area Breakdown -->
        <div class="sections-card">
            <div class="card-header">
                <h2 class="card-title">
                    <i class="fas fa-layer-group"></i> Performance by Area
                </h2>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Area</th>
                            <th>Total Sections</th>
                            <th>Reviewed</th>
                            <th>Complete</th>
                            <th>Completion Rate</th>
                            <th>Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.reviewsByArea.map(area => `
                            <tr>
                                <td>
                                    <strong>Area ${area.area_number}</strong><br>
                                    <span style="font-size: 12px; color: #64748b;">${area.area_name}</span>
                                </td>
                                <td>${area.total_sections}</td>
                                <td>${area.reviewed}</td>
                                <td>${area.complete}</td>
                                <td>
                                    <span class="badge ${area.completion_rate >= 80 ? 'badge-green' : area.completion_rate >= 50 ? 'badge-yellow' : 'badge-red'}">
                                        ${area.completion_rate}%
                                    </span>
                                </td>
                                <td>
                                    <div class="progress-bar-container">
                                        <div class="progress-bar-fill" style="width: ${area.completion_rate}%"></div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="info-card">
            <div class="info-header">
                <i class="fas fa-clock"></i>
                <h3>Last Activity</h3>
            </div>
            <div class="info-content">
                ${stats.recentReview ? `
                    <p><strong>Last Reviewed:</strong> ${stats.recentReview.section_name}</p>
                    <p><strong>Status:</strong> ${getReviewStatusBadge(stats.recentReview.review_status)}</p>
                    <p><strong>Date:</strong> ${new Date(stats.recentReview.reviewed_at).toLocaleString()}</p>
                ` : '<p>No reviews yet</p>'}
            </div>
        </div>
    `;

    // Update page title
    document.getElementById('pageTitle').textContent = 'Accreditor Statistics';

    // Render charts
    renderStatusChart(stats);
    renderActivityChart(stats.last7Days);
}

// ============================================
// CHART RENDERING
// ============================================

function renderStatusChart(stats) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Complete', 'Needs Revision', 'Incomplete'],
            datasets: [{
                data: [stats.complete, stats.needsRevision, stats.incomplete],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderActivityChart(last7Days) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.date),
            datasets: [{
                label: 'Reviews',
                data: last7Days.map(d => d.count),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
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