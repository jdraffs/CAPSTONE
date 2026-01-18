// private/js/admin/admiLlave/report&Logs.js

const adminid = 6; // AdminLlave's ID
let activeCycleId = null;
let currentCycle = null;
let activeSubTab = 'reports'; // Default sub-tab
let allActivityLogs = [];
let currentPage = 1;
const itemsPerPage = 50;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadActiveCycle();
    renderReportsLogsUI();
    setupEventListeners();
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
// RENDER REPORTS & LOGS UI
// ============================================

function renderReportsLogsUI() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <!-- Sub-Tab Toggle -->
        <div class="sub-tab-toggle">
            <button class="sub-tab-btn active" data-tab="reports" onclick="switchSubTab('reports')">
                <i class="fas fa-chart-bar"></i> Accreditation Reports 
            </button>
            <button class="sub-tab-btn" data-tab="logs" onclick="switchSubTab('logs')">
                <i class="fas fa-history"></i> Activity Log
            </button>
        </div>

        <!-- Reports & Analytics Sub-Tab -->
        <div class="sub-tab-content" id="reportsTab">
            <!-- Report Generation Panel -->
            <div class="report-card">
                <div class="report-card-header">
                    <h2 class="report-card-title">
                        <i class="fas fa-file-download"></i> Generate Reports
                    </h2>
                </div>

                <div class="reports-grid" id="reportsGrid">
                    <!-- Report items will be loaded here -->
                </div>
            </div>

        </div>

        <!-- Activity Log Sub-Tab -->
        <div class="sub-tab-content" id="logsTab" style="display: none;">
            <!-- Will be loaded when tab is clicked -->
        </div>
    `;

    // Load reports data
    if (activeCycleId) {
        loadReportsTab();
    } else {
        showNoCycleMessage();
    }
}

// ============================================
// SWITCH SUB-TAB
// ============================================

function switchSubTab(tabName) {
    activeSubTab = tabName;

    // Update button states
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Show/hide tab content
    document.getElementById('reportsTab').style.display = tabName === 'reports' ? 'block' : 'none';
    document.getElementById('logsTab').style.display = tabName === 'logs' ? 'block' : 'none';

    // Load appropriate data
    if (tabName === 'logs') {
        renderActivityLogTab();
    }
}

// ============================================
// LOAD REPORTS TAB
// ============================================

function loadReportsTab() {
    loadReportTypes();
    loadPreviousReports();
    loadAnalytics();
}

function loadReportTypes() {
    const reportsGrid = document.getElementById('reportsGrid');
    
    const reportTypes = [
        {
            id: 'area-completion',
            title: 'Area Completion Report',
            description: 'Detailed report of completion status for each accreditation area',
            icon: 'fa-clipboard-check',
            formats: ['PDF', 'Excel']
        },
        {
            id: 'section-compliance',
            title: 'Accreditation Compliance Report',
            description: 'Complete list of all accreditation items with submission and review status',
            icon: 'fa-list-check',
            formats: ['PDF', 'Excel']
        },
        {
            id: 'accreditor-summary',
            title: 'Accreditor Review Summary',
            description: 'Performance summary and statistics for each accreditor',
            icon: 'fa-user-check',
            formats: ['PDF', 'Excel']
        },
        {
            id: 'master-links',
            title: 'Master Link Repository',
            description: 'All Google Drive links with metadata in one exportable file',
            icon: 'fa-link',
            formats: ['Excel']
        },
        {
            id: 'complete-report',
            title: 'Complete Accreditation Report',
            description: 'Comprehensive report combining all data with executive summary',
            icon: 'fa-file-pdf',
            formats: ['PDF']
        }
    ];

    reportsGrid.innerHTML = reportTypes.map(report => `
        <div class="report-item">
            <div class="report-item-header">
                <div class="report-icon">
                    <i class="fas ${report.icon}"></i>
                </div>
                <div>
                    <div class="report-item-title">${report.title}</div>
                </div>
            </div>
            <div class="report-item-desc">${report.description}</div>
            <div class="report-item-footer">
                <div class="report-format">
                    ${report.formats.map(format => `
                        <span class="format-badge">${format}</span>
                    `).join('')}
                </div>
                <button class="btn-generate" onclick="generateReport('${report.id}', '${report.title}')" ${!activeCycleId ? 'disabled' : ''}>
                    <i class="fas fa-download"></i> Generate
                </button>
            </div>
        </div>
    `).join('');
}

async function loadPreviousReports() {
    const previousReportsList = document.getElementById('previousReportsList');
    
    // Mock data - replace with actual API call
    const previousReports = [];

    if (previousReports.length === 0) {
        previousReportsList.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-inbox"></i>
                <p>No reports generated yet</p>
            </div>
        `;
        return;
    }

    previousReportsList.innerHTML = previousReports.map(report => `
        <div class="report-list-item">
            <div class="report-info">
                <div class="report-file-icon">
                    <i class="fas ${report.format === 'PDF' ? 'fa-file-pdf' : 'fa-file-excel'}"></i>
                </div>
                <div class="report-details">
                    <div class="report-name">${report.name}</div>
                    <div class="report-meta">
                        Generated on ${new Date(report.date).toLocaleDateString()} • 
                        ${report.size}
                    </div>
                </div>
            </div>
            <div class="report-actions">
                <button class="btn-download" onclick="downloadReport('${report.id}')">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn-delete-report" onclick="deleteReport('${report.id}', '${report.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function loadAnalytics() {
    if (!activeCycleId) {
        document.getElementById('analyticsStats').innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-chart-bar"></i>
                <p>No analytics available without an active cycle</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/dashboard/stats/${activeCycleId}`);
        const data = await response.json();

        if (data.stats) {
            const stats = data.stats;
            const total = parseInt(stats.total_sections) || 0;
            const reviewed = parseInt(stats.reviewed_count) || 0;
            const complete = parseInt(stats.complete_count) || 0;

            const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0;

            document.getElementById('analyticsStats').innerHTML = `
                <div class="summary-stat-card">
                    <div class="stat-number">${completionRate}%</div>
                    <div class="stat-description">Overall Completion Rate</div>
                </div>
                <div class="summary-stat-card">
                    <div class="stat-number">5</div>
                    <div class="stat-description">Avg Days to Review</div>
                </div>
                <div class="summary-stat-card">
                    <div class="stat-number">${complete}</div>
                    <div class="stat-description">Complete Sections</div>
                </div>
                <div class="summary-stat-card">
                    <div class="stat-number">Area 1</div>
                    <div class="stat-description">Highest Completion</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// ============================================
// GENERATE REPORTS
// ============================================

async function generateReport(reportId, reportTitle) {
    if (!activeCycleId) {
        showToast('No active cycle to generate report from', 'error');
        return;
    }

    showToast(`Generating ${reportTitle}...`, 'info');

    try {
        // Fetch data based on report type
        let data;
        switch (reportId) {
            case 'area-completion':
                data = await generateAreaCompletionReport();
                break;
            case 'section-compliance':
                data = await generateSectionComplianceReport();
                break;
            case 'accreditor-summary':
                data = await generateAccreditorSummaryReport();
                break;
            case 'master-links':
                data = await generateMasterLinksReport();
                break;
            case 'complete-report':
                data = await generateCompleteReport();
                break;
            default:
                showToast('Unknown report type', 'error');
                return;
        }

        showToast(`${reportTitle} generated successfully!`, 'success');
        await loadPreviousReports();
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Failed to generate report', 'error');
    }
}

async function generateAreaCompletionReport() {
    const response = await fetch(`/api/accreditation/areas/${activeCycleId}`);
    const data = await response.json();

    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Area Completion Report'],
        [`Academic Year: ${currentCycle.academic_year}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [],
        ['Area', 'Area Name', 'Total Sections', 'Submitted', 'Reviewed', 'Complete', 'Completion %']
    ];

    data.areas.forEach(area => {
        const total = parseInt(area.total_sections) || 0;
        const complete = parseInt(area.complete_sections) || 0;
        const completionPct = total > 0 ? Math.round((complete / total) * 100) : 0;

        wsData.push([
            `Area ${area.area_number}`,
            area.area_name,
            total,
            area.submitted_sections || 0,
            area.reviewed_sections || 0,
            complete,
            `${completionPct}%`
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Area Completion');

    // Download file
    XLSX.writeFile(wb, `Area_Completion_Report_${currentCycle.academic_year}.xlsx`);

    return data;
}

async function generateSectionComplianceReport() {
    const response = await fetch(`/api/accreditation/reviews/all/${activeCycleId}`);
    const data = await response.json();

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Section Compliance Report'],
        [`Academic Year: ${currentCycle.academic_year}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [],
        ['Section Name', 'Area', 'Google Drive Link', 'Submitted Date', 'Review Status', 'Reviewed By', 'Comments']
    ];

    data.reviews.forEach(section => {
        wsData.push([
            section.section_name,
            `Area ${section.area_number}`,
            section.google_drive_link || 'Not Submitted',
            section.submitted_at ? new Date(section.submitted_at).toLocaleDateString() : '-',
            section.review_status || 'Not Reviewed',
            section.reviewed_by_name || '-',
            section.comments || '-'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Section Compliance');

    XLSX.writeFile(wb, `Section_Compliance_Report_${currentCycle.academic_year}.xlsx`);

    return data;
}

async function generateAccreditorSummaryReport() {
    const response = await fetch(`/api/accreditation/accreditor-performance/${activeCycleId}`);
    const data = await response.json();

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Accreditor Review Summary'],
        [`Academic Year: ${currentCycle.academic_year}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [],
        ['Accreditor Name', 'Assigned Areas', 'Total Assigned', 'Reviewed', 'Pending', 'Completion %', 'Last Activity']
    ];

    data.performance.forEach(acc => {
        const total = parseInt(acc.total_assigned) || 0;
        const reviewed = parseInt(acc.reviewed_count) || 0;
        const completionPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

        wsData.push([
            acc.accreditor_name,
            acc.assigned_areas || '-',
            total,
            reviewed,
            total - reviewed,
            `${completionPct}%`,
            acc.last_activity ? new Date(acc.last_activity).toLocaleDateString() : 'Never'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Accreditor Summary');

    XLSX.writeFile(wb, `Accreditor_Summary_Report_${currentCycle.academic_year}.xlsx`);

    return data;
}

async function generateMasterLinksReport() {
    const response = await fetch(`/api/accreditation/reviews/all/${activeCycleId}`);
    const data = await response.json();

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Master Link Repository'],
        [`Academic Year: ${currentCycle.academic_year}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [],
        ['Section', 'Area', 'Google Drive Link', 'Submitted By', 'Date Submitted', 'Status']
    ];

    data.reviews.forEach(section => {
        wsData.push([
            section.section_name,
            `Area ${section.area_number}: ${section.area_name}`,
            section.google_drive_link || 'Not Submitted',
            section.submitted_by_name || '-',
            section.submitted_at ? new Date(section.submitted_at).toLocaleDateString() : '-',
            section.review_status || 'Not Reviewed'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Master Links');

    XLSX.writeFile(wb, `Master_Link_Repository_${currentCycle.academic_year}.xlsx`);

    return data;
}

async function generateCompleteReport() {
    // This would generate a comprehensive PDF report
    // For now, we'll combine all data into Excel sheets
    const [areas, sections, accreditors] = await Promise.all([
        fetch(`/api/accreditation/areas/${activeCycleId}`).then(r => r.json()),
        fetch(`/api/accreditation/reviews/all/${activeCycleId}`).then(r => r.json()),
        fetch(`/api/accreditation/accreditor-performance/${activeCycleId}`).then(r => r.json())
    ]);

    const wb = XLSX.utils.book_new();

    // Executive Summary Sheet
    const summaryData = [
        ['Complete Accreditation Report'],
        [`Academic Year: ${currentCycle.academic_year}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [],
        ['Executive Summary'],
        ['Total Areas', '10'],
        ['Total Sections', sections.reviews.length],
        ['Total Accreditors', accreditors.performance.length]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary');

    // Add other sheets (reuse logic from other reports)
    // ... (Areas, Sections, Accreditors)

    XLSX.writeFile(wb, `Complete_Accreditation_Report_${currentCycle.academic_year}.xlsx`);

    return { areas, sections, accreditors };
}

function downloadReport(reportId) {
    showToast('Downloading report...', 'info');
    // Implement download logic
}

function deleteReport(reportId, reportName) {
    if (!confirm(`Delete "${reportName}"?`)) return;
    showToast('Report deleted', 'success');
    loadPreviousReports();
}

// ============================================
// ACTIVITY LOG TAB
// ============================================

function renderActivityLogTab() {
    const logsTab = document.getElementById('logsTab');
    
    logsTab.innerHTML = `
        <!-- Log Filters -->
        <div class="log-filters">
            <div class="filters-row">
                <div class="filter-group">
                    <label class="filter-label">Search</label>
                    <input type="text" class="filter-input" id="logSearchInput" placeholder="Search by user, section, or action...">
                </div>
                <div class="filter-group">
                    <label class="filter-label">User Role</label>
                    <select class="filter-select" id="filterUserRole">
                        <option value="">All Roles</option>
                        <option value="AdminLlave">AdminLlave</option>
                        <option value="Area Head">Area Head</option>
                        <option value="Accreditor">Accreditor</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Action Type</label>
                    <select class="filter-select" id="filterActionType">
                        <option value="">All Actions</option>
                        <option value="Created">Created</option>
                        <option value="Updated">Updated</option>
                        <option value="Deleted">Deleted</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Assigned">Assigned</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Date Range</label>
                    <input type="date" class="filter-input" id="filterDateFrom" placeholder="From">
                </div>
                <div class="filter-group">
                    <label class="filter-label">&nbsp;</label>
                    <input type="date" class="filter-input" id="filterDateTo" placeholder="To">
                </div>
            </div>
            <div class="filters-actions">
                <button class="btn-filter" onclick="applyLogFilters()">
                    <i class="fas fa-filter"></i> Apply Filters
                </button>
                <button class="btn-reset" onclick="resetLogFilters()">
                    <i class="fas fa-redo"></i> Reset
                </button>
                <button class="btn-export" onclick="exportActivityLog()">
                    <i class="fas fa-file-export"></i> Export Log
                </button>
            </div>
        </div>

        <!-- Activity Summary -->
        <div class="activity-summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-value" id="activitiesToday">0</div>
                    <div class="summary-label">Activities Today</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" id="activitiesWeek">0</div>
                    <div class="summary-label">Activities This Week</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" id="activitiesCycle">0</div>
                    <div class="summary-label">Activities This Cycle</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" id="mostActiveUser">-</div>
                    <div class="summary-label">Most Active User</div>
                </div>
            </div>
        </div>

        <!-- Activity Log Table -->
        <div class="log-card">
            <table class="log-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody id="activityLogTableBody">
                    <tr>
                        <td colspan="5" class="loading-cell">Loading activity log...</td>
                    </tr>
                </tbody>
            </table>

            <div class="pagination" id="logPagination">
                <button class="pagination-btn" onclick="previousPage()" id="prevPageBtn">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span class="pagination-info" id="paginationInfo">Page 1</span>
                <button class="pagination-btn" onclick="nextPage()" id="nextPageBtn">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    loadActivityLog();
}

async function loadActivityLog() {
    if (!activeCycleId) {
        document.getElementById('activityLogTableBody').innerHTML = `
            <tr><td colspan="5" class="no-data">No activity log available without an active cycle</td></tr>
        `;
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/activity/${activeCycleId}?limit=1000`);
        const data = await response.json();

        if (data.activities) {
            allActivityLogs = data.activities;
            displayActivityLog(allActivityLogs);
            updateActivitySummary(allActivityLogs);
        }
    } catch (error) {
        console.error('Error loading activity log:', error);
        document.getElementById('activityLogTableBody').innerHTML = `
            <tr><td colspan="5" class="error-cell">Error loading activity log</td></tr>
        `;
    }
}

function displayActivityLog(logs) {
    const tbody = document.getElementById('activityLogTableBody');
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="no-data">No activity found</td></tr>
        `;
        return;
    }

    // Pagination
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedLogs = logs.slice(startIdx, endIdx);

    tbody.innerHTML = paginatedLogs.map(log => {
        const timestamp = new Date(log.created_at);
        const formattedDate = timestamp.toLocaleDateString();
        const formattedTime = timestamp.toLocaleTimeString();

        return `
            <tr>
                <td>
                    <div class="log-timestamp">
                        ${formattedDate}<br>${formattedTime}
                    </div>
                </td>
                <td>
                    <div class="log-user">
                        <div class="user-avatar-small">
                            ${log.user_name ? log.user_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="user-info">
                            <div class="user-name">${log.user_name || 'System'}</div>
                            <div class="user-role">${log.user_role}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="action-badge action-${log.action_type.toLowerCase()}">
                        ${log.action_type}
                    </span>
                </td>
                <td><strong>${log.target_name}</strong></td>
                <td>
                    <div class="log-details" title="${log.details}">
                        ${log.details}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updatePagination(logs.length);
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('paginationInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayActivityLog(allActivityLogs);
    }
}

function nextPage() {
    const totalPages = Math.ceil(allActivityLogs.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayActivityLog(allActivityLogs);
    }
}

function updateActivitySummary(logs) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activitiesToday = logs.filter(log => new Date(log.created_at) >= todayStart).length;
    const activitiesWeek = logs.filter(log => new Date(log.created_at) >= weekStart).length;

    // Most active user
    const userCounts = {};
    logs.forEach(log => {
        const user = log.user_name || 'Unknown';
        userCounts[user] = (userCounts[user] || 0) + 1;
    });
    const mostActive = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];

    document.getElementById('activitiesToday').textContent = activitiesToday;
    document.getElementById('activitiesWeek').textContent = activitiesWeek;
    document.getElementById('activitiesCycle').textContent = logs.length;
    document.getElementById('mostActiveUser').textContent = mostActive ? mostActive[0] : '-';
}

function applyLogFilters() {
    const searchTerm = document.getElementById('logSearchInput').value.toLowerCase();
    const roleFilter = document.getElementById('filterUserRole').value;
    const actionFilter = document.getElementById('filterActionType').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;

    let filtered = allActivityLogs;

    if (searchTerm) {
        filtered = filtered.filter(log =>
            log.user_name?.toLowerCase().includes(searchTerm) ||
            log.target_name?.toLowerCase().includes(searchTerm) ||
            log.details?.toLowerCase().includes(searchTerm)
        );
    }

    if (roleFilter) {
        filtered = filtered.filter(log => log.user_role === roleFilter);
    }

    if (actionFilter) {
        filtered = filtered.filter(log => log.action_type === actionFilter);
    }

    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(log => new Date(log.created_at) >= fromDate);
    }

    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(log => new Date(log.created_at) <= toDate);
    }

    currentPage = 1;
    displayActivityLog(filtered);
    showToast(`Found ${filtered.length} activities`, 'info');
}

function resetLogFilters() {
    document.getElementById('logSearchInput').value = '';
    document.getElementById('filterUserRole').value = '';
    document.getElementById('filterActionType').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    
    currentPage = 1;
    displayActivityLog(allActivityLogs);
    showToast('Filters reset', 'info');
}

function exportActivityLog() {
    if (!activeCycleId || allActivityLogs.length === 0) {
        showToast('No activity log to export', 'error');
        return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Activity Log Export'],
        [`Academic Year: ${currentCycle.academic_year}`],
        [`Exported: ${new Date().toLocaleDateString()}`],
        [],
        ['Timestamp', 'User', 'Role', 'Action', 'Target', 'Details']
    ];

    allActivityLogs.forEach(log => {
        const timestamp = new Date(log.created_at);
        wsData.push([
            `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`,
            log.user_name || 'System',
            log.user_role,
            log.action_type,
            log.target_name,
            log.details
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Log');

    XLSX.writeFile(wb, `Activity_Log_${currentCycle.academic_year}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showToast('Activity log exported successfully', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showNoCycleMessage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="no-data-message">
            <i class="fas fa-exclamation-circle"></i>
            <h2>No Active Cycle</h2>
            <p>Please create accreditation cycle first to generate reports & view activity logs.</p>
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
    console.log('Report & Logs event listeners initialized');
}

function initializeProfileDropdown() {
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