// analyticsDashboard.js - SuperAdmin Analytics Dashboard - PART 1 (FIXED)
document.addEventListener("DOMContentLoaded", async () => {
  const mainContent = document.getElementById("mainContent");
  const PYTHON_API_URL = "http://localhost:5000/api";
  
  let uploadedFiles = [];
  let reports = [];
  let activityLogs = [];

  // Get current admin ID from session/localStorage
  const CURRENT_ADMIN_ID = 'superadmin'; // SuperAdmin identifier

  // Initialize dashboard
  await initializeDashboard();

  async function initializeDashboard() {
    mainContent.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading analytics dashboard...</div>';

    try {
      // Fetch uploaded files with proper admin tracking
      const response = await fetch("http://localhost:3000/api/files/data");
      uploadedFiles = await response.json();

      console.log("📊 Fetched files:", uploadedFiles);

      // Load activity logs from database or localStorage
      await loadActivityLogs();

      if (uploadedFiles.length === 0) {
        renderEmptyState();
        return;
      }

      // Process all analytics
      await processAllAnalytics();
      
      // Render complete dashboard
      renderDashboard();

    } catch (err) {
      console.error("Error initializing dashboard:", err);
      mainContent.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Failed to load analytics data</div>';
    }
  }

  async function loadActivityLogs() {
    // Try to fetch from database first, fallback to localStorage
    try {
      const response = await fetch("http://localhost:3000/api/activity-logs");
      if (response.ok) {
        activityLogs = await response.json();
      } else {
        // Fallback to localStorage
        activityLogs = JSON.parse(localStorage.getItem('analytics_activity_logs') || '[]');
      }
    } catch (error) {
      console.warn("Failed to load activity logs from server, using localStorage");
      activityLogs = JSON.parse(localStorage.getItem('analytics_activity_logs') || '[]');
    }
  }

  async function processAllAnalytics() {
    reports = [];
    
    for (let index = 0; index < uploadedFiles.length; index++) {
      const file = uploadedFiles[index];
      const actualFilename = file.filename || file.file_name || file.originalName || file.displayName;
      const displayName = file.displayName || file.originalName || file.file_name || file.filename;
      
      // Use the adminid from database - this is the FIX for problem #1 and #2
      const fileAdminId = file.adminid || 'Unknown';
      
      const chartType = localStorage.getItem(`chartType_${displayName}`) || file.chart_type || "bar";

      try {
        const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: actualFilename,
            chart_type: chartType
          })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const analyticsData = await response.json();

        reports.push({
          id: index + 1,
          file_id: file.id,
          title: displayName || `Report ${index + 1}`,
          actualFilename: actualFilename,
          metric: file.type || file.file_type || "Uploaded Dataset",
          date: new Date(file.uploaded_at || file.created_at).toLocaleDateString(),
          uploadedAt: new Date(file.uploaded_at || file.created_at),
          recordsProcessed: analyticsData.statistics.count,
          chartType: chartType,
          chartImage: analyticsData.chart_image,
          statistics: analyticsData.statistics,
          interpretation: analyticsData.interpretation,
          tableData: analyticsData.table_data,
          fileInfo: analyticsData.file_info,
          summary: analyticsData.summary,
          availableColumns: analyticsData.file_info?.available_columns || [],
          columnDescriptions: analyticsData.file_info?.column_descriptions || {},
          currentColumn: analyticsData.file_info?.analyzed_column || "Default Column",
          fileExtension: actualFilename.split('.').pop().toUpperCase(),
          adminId: fileAdminId // CRITICAL FIX - Use actual admin ID from database
        });

        // Log successful processing - but DON'T log SuperAdmin's viewing activity
        // Only log if this is an actual upload action

      } catch (error) {
        console.error(`Error processing ${actualFilename}:`, error);
      }
    }
  }

  function renderDashboard() {
    mainContent.innerHTML = `
      <!-- Executive Summary Cards -->
      <div class="executive-summary">
        ${renderExecutiveSummary()}
      </div>

      <!-- Performance Insights -->
      <div class="insights-section">
        <h2 class="section-title"><i class="fas fa-lightbulb"></i> Key Insights</h2>
        ${renderKeyInsights()}
      </div>

      <!-- Admin Activity Overview - FIXED -->
      <div class="admin-activity-section">
        <h2 class="section-title"><i class="fas fa-users-cog"></i> Admin Activity Overview</h2>
        ${renderAdminActivity()}
      </div>

      <!-- Analytics Reports Grid -->
      <div class="analytics-grid-section">
        <div class="section-header">
          <h2 class="section-title"><i class="fas fa-chart-bar"></i> Analytics Reports</h2>
          <div class="filter-controls">
            <select id="adminFilter" class="filter-select">
              <option value="all">All Admins</option>
              ${getUniqueAdmins().map(admin => `<option value="${admin}">Admin ${admin}</option>`).join('')}
            </select>
            <select id="timeFilter" class="filter-select">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
        <div class="reports-grid" id="reportsGrid">
          ${renderReportsGrid()}
        </div>
      </div>

      <!-- Activity Logs - FIXED to show admin actions only -->
      <div class="activity-logs-section">
        <div class="section-header">
          <h2 class="section-title"><i class="fas fa-history"></i> Admin Activity Logs</h2>
          <button class="clear-logs-btn" onclick="clearActivityLogs()">
            <i class="fas fa-trash-alt"></i> Clear Logs
          </button>
        </div>
        ${renderActivityLogs()}
      </div>

      <!-- Report Details Modal -->
      <div id="reportModal" class="modal">
        <div class="modal-overlay"></div>
        <div class="modal-container">
          <div class="modal-header">
            <h3>Report Details</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="report-details"></div>
          </div>
        </div>
      </div>
    `;

    attachEventListeners();
  }

  function renderExecutiveSummary() {
    const totalReports = reports.length;
    const totalRecords = reports.reduce((sum, r) => sum + r.recordsProcessed, 0);
    const avgRecordsPerReport = totalReports > 0 ? Math.round(totalRecords / totalReports) : 0;
    const uniqueAdmins = getUniqueAdmins().length;

    return `
      <div class="summary-card gradient-blue">
        <div class="summary-icon"><i class="fas fa-file-alt"></i></div>
        <div class="summary-content">
          <h3>${totalReports}</h3>
          <p>Total Reports</p>
        </div>
      </div>
      <div class="summary-card gradient-green">
        <div class="summary-icon"><i class="fas fa-database"></i></div>
        <div class="summary-content">
          <h3>${totalRecords.toLocaleString()}</h3>
          <p>Total Records</p>
        </div>
      </div>
      <div class="summary-card gradient-purple">
        <div class="summary-icon"><i class="fas fa-chart-line"></i></div>
        <div class="summary-content">
          <h3>${avgRecordsPerReport.toLocaleString()}</h3>
          <p>Avg Records/Report</p>
        </div>
      </div>
      <div class="summary-card gradient-orange">
        <div class="summary-icon"><i class="fas fa-users"></i></div>
        <div class="summary-content">
          <h3>${uniqueAdmins}</h3>
          <p>Active Admins</p>
        </div>
      </div>
    `;
  }

  function renderKeyInsights() {
    const insights = generateKeyInsights();
    
    return `
      <div class="insights-grid">
        ${insights.map(insight => `
          <div class="insight-card ${insight.type}">
            <div class="insight-icon">
              <i class="${insight.icon}"></i>
            </div>
            <div class="insight-content">
              <h4>${insight.title}</h4>
              <p>${insight.message}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function generateKeyInsights() {
    const insights = [];
    
    const totalRecords = reports.reduce((sum, r) => sum + r.recordsProcessed, 0);
    if (totalRecords > 10000) {
      insights.push({
        type: 'success',
        icon: 'fas fa-check-circle',
        title: 'Excellent Data Volume',
        message: `System has processed ${totalRecords.toLocaleString()} records, providing robust analytics foundation.`
      });
    }

    const recentUploads = reports.filter(r => {
      const daysDiff = (new Date() - r.uploadedAt) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    if (recentUploads.length > 0) {
      insights.push({
        type: 'info',
        icon: 'fas fa-clock',
        title: 'Recent Activity',
        message: `${recentUploads.length} reports uploaded in the last 7 days. System is actively used.`
      });
    }

    const avgMean = reports.reduce((sum, r) => sum + (r.statistics.mean || 0), 0) / reports.length;
    insights.push({
      type: 'primary',
      icon: 'fas fa-chart-pie',
      title: 'Data Distribution',
      message: `Average mean across all datasets is ${avgMean.toFixed(2)}, indicating ${avgMean > 50 ? 'higher' : 'moderate'} value trends.`
    });

    const highVarianceReports = reports.filter(r => r.statistics.std > r.statistics.mean * 0.5);
    if (highVarianceReports.length > reports.length * 0.3) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        title: 'Data Variance Detected',
        message: `${highVarianceReports.length} reports show high variance. Consider investigating for consistency.`
      });
    }

    return insights;
  }

  function renderAdminActivity() {
    const adminStats = {};
    
    // Build stats from actual reports data
    reports.forEach(report => {
      const adminId = report.adminId || 'Unknown';
      if (!adminStats[adminId]) {
        adminStats[adminId] = {
          uploads: 0,
          totalRecords: 0,
          lastActivity: report.uploadedAt
        };
      }
      adminStats[adminId].uploads++;
      adminStats[adminId].totalRecords += report.recordsProcessed;
      if (report.uploadedAt > adminStats[adminId].lastActivity) {
        adminStats[adminId].lastActivity = report.uploadedAt;
      }
    });

    // FIXED - Check if we have any admin activity
    if (Object.keys(adminStats).length === 0) {
      return '<p class="no-data">No admin activity recorded yet.</p>';
    }

    return `
      <div class="admin-stats-grid">
        ${Object.entries(adminStats).map(([adminId, stats]) => `
          <div class="admin-stat-card">
            <div class="admin-avatar">
              <i class="fas fa-user-shield"></i>
            </div>
            <div class="admin-info">
              <h4>Admin ${adminId}</h4>
              <div class="admin-metrics">
                <span><i class="fas fa-upload"></i> ${stats.uploads} uploads</span>
                <span><i class="fas fa-database"></i> ${stats.totalRecords.toLocaleString()} records</span>
              </div>
              <p class="last-activity">Last active: ${formatTimeAgo(stats.lastActivity)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderReportsGrid() {
    if (reports.length === 0) {
      return '<p class="no-data">No reports available</p>';
    }

    return reports.map(report => `
      <div class="analytics-report-card" data-report-id="${report.id}">
        <div class="report-card-header">
          <h3>${report.title}</h3>
          <span class="admin-badge">Admin ${report.adminId}</span>
        </div>
        
        <!-- ADDED: Column Selector (FIX #4) -->
        ${report.availableColumns && report.availableColumns.length > 1 ? `
          <div class="column-selector">
            <label>Analyzing Column:</label>
            <select class="column-select-dropdown" data-report-id="${report.id}">
              ${report.availableColumns.map(col => `
                <option value="${col.raw_name}" ${col.display_name === report.currentColumn ? 'selected' : ''}>
                  ${col.display_name} (${col.data_count} values)
                </option>
              `).join('')}
            </select>
          </div>
        ` : `
          <p class="current-column-display"><strong>Analyzing:</strong> ${report.currentColumn}</p>
        `}
        
        <div class="chart-preview">
          <img src="${report.chartImage}" alt="Chart Preview" />
        </div>
        
        <div class="report-stats-mini">
          <div class="stat-item">
            <span class="stat-label">Records</span>
            <span class="stat-value">${report.recordsProcessed.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Mean</span>
            <span class="stat-value">${report.statistics.mean.toFixed(1)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Range</span>
            <span class="stat-value">${report.statistics.range.toFixed(1)}</span>
          </div>
        </div>
        
        <div class="enhanced-interpretation">
          <h4><i class="fas fa-brain"></i> Executive Summary</h4>
          <p>${generateExecutiveSummary(report)}</p>
        </div>
        
        <div class="report-card-footer">
          <span class="upload-date"><i class="far fa-calendar"></i> ${report.date}</span>
          <button class="view-details-btn" onclick="viewReportDetails(${report.id})">
            <i class="fas fa-eye"></i> View Details
          </button>
        </div>
      </div>
    `).join('');
  }

  // analyticsDashboard.js - PART 2 (FIXED - Continued)

  function generateExecutiveSummary(report) {
    const stats = report.statistics;
    const columnName = report.currentColumn.toLowerCase();
    
    let trend = 'stable';
    if (stats.mean > stats.median + stats.std * 0.5) trend = 'skewed high';
    else if (stats.mean < stats.median - stats.std * 0.5) trend = 'skewed low';
    
    let performance = 'moderate';
    if (stats.mean > 75) performance = 'excellent';
    else if (stats.mean > 50) performance = 'good';
    else if (stats.mean < 30) performance = 'needs attention';
    
    const cv = (stats.std / stats.mean) * 100;
    let consistency = cv < 20 ? 'highly consistent' : cv < 40 ? 'moderately varied' : 'highly varied';

    let summary = `<strong>Performance: ${performance.toUpperCase()}</strong>. `;
    summary += `This dataset shows ${consistency} data with a ${trend} distribution. `;
    summary += `The average value of ${stats.mean.toFixed(1)} `;
    
    if (columnName.includes('enrollment') || columnName.includes('student')) {
      summary += `indicates ${stats.mean > 100 ? 'strong' : 'moderate'} enrollment figures. `;
    } else if (columnName.includes('grade') || columnName.includes('score')) {
      summary += `reflects ${performance} academic performance across the dataset. `;
    }
    
    if (stats.range > stats.mean * 2) {
      summary += `<strong>Note:</strong> Significant range (${stats.range.toFixed(1)}) suggests diverse data points requiring attention.`;
    }
    
    return summary;
  }

  function renderActivityLogs() {
    // FIXED - Filter to show only admin actions (uploads, deletions, etc.), NOT SuperAdmin viewing
    const adminActionLogs = activityLogs.filter(log => 
      log.adminId && 
      log.adminId !== CURRENT_ADMIN_ID && 
      log.adminId !== 'SuperAdmin' &&
      log.adminId !== 'superadmin'
    );

    if (adminActionLogs.length === 0) {
      return '<p class="no-logs">No admin activity logs yet</p>';
    }

    const recentLogs = adminActionLogs.slice(-50).reverse();

    return `
      <div class="logs-container">
        ${recentLogs.map(log => `
          <div class="log-entry ${log.type}">
            <div class="log-icon">
              <i class="${getLogIcon(log.type)}"></i>
            </div>
            <div class="log-content">
              <p class="log-message">${log.message}</p>
              <span class="log-meta">
                Admin ${log.adminId} • ${formatTimeAgo(new Date(log.timestamp))}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function attachEventListeners() {
    // Filter listeners
    const adminFilter = document.getElementById('adminFilter');
    const timeFilter = document.getElementById('timeFilter');
    
    if (adminFilter) {
      adminFilter.addEventListener('change', applyFilters);
    }
    if (timeFilter) {
      timeFilter.addEventListener('change', applyFilters);
    }

    // Modal close
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
      el.addEventListener('click', closeModal);
    });

    // ADDED: Column selector change listeners (FIX #4)
    document.querySelectorAll('.column-select-dropdown').forEach(select => {
      select.addEventListener('change', handleColumnChange);
    });
  }

  // NEW FUNCTION - Handle column selection changes (FIX #4)
  async function handleColumnChange(event) {
    const select = event.target;
    const reportId = select.dataset.reportId;
    const selectedColumn = select.value;
    const report = reports.find(r => r.id == reportId);
    
    if (!report) return;

    const card = select.closest('.analytics-report-card');
    const chartContainer = card.querySelector('.chart-preview');
    const originalContent = chartContainer.innerHTML;
    
    chartContainer.innerHTML = '<p class="loading-chart">Loading data for selected column...</p>';

    try {
      const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: report.actualFilename,
          chart_type: report.chartType,
          column: selectedColumn
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load column data');
      }

      const analyticsData = await response.json();
      
      // Update report data
      report.chartImage = analyticsData.chart_image;
      report.statistics = analyticsData.statistics;
      report.interpretation = analyticsData.interpretation;
      report.tableData = analyticsData.table_data;
      report.currentColumn = analyticsData.file_info.analyzed_column;

      // Update UI
      chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart Preview" />`;
      
      const statsContainer = card.querySelector('.report-stats-mini');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stat-item">
            <span class="stat-label">Records</span>
            <span class="stat-value">${analyticsData.statistics.count.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Mean</span>
            <span class="stat-value">${analyticsData.statistics.mean.toFixed(1)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Range</span>
            <span class="stat-value">${analyticsData.statistics.range.toFixed(1)}</span>
          </div>
        `;
      }

      const summaryContainer = card.querySelector('.enhanced-interpretation p');
      if (summaryContainer) {
        summaryContainer.innerHTML = generateExecutiveSummary(report);
      }

    } catch (error) {
      console.error('Error loading column data:', error);
      chartContainer.innerHTML = originalContent;
      alert('Failed to load data for selected column. Please try again.');
    }
  }

  function applyFilters() {
    const adminFilter = document.getElementById('adminFilter').value;
    const timeFilter = document.getElementById('timeFilter').value;
    
    let filteredReports = [...reports];

    if (adminFilter !== 'all') {
      filteredReports = filteredReports.filter(r => r.adminId == adminFilter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      filteredReports = filteredReports.filter(r => {
        const diff = now - r.uploadedAt;
        const daysDiff = diff / (1000 * 60 * 60 * 24);
        
        if (timeFilter === 'today') return daysDiff < 1;
        if (timeFilter === 'week') return daysDiff < 7;
        if (timeFilter === 'month') return daysDiff < 30;
        return true;
      });
    }

    const reportsGrid = document.getElementById('reportsGrid');
    if (reportsGrid) {
      reportsGrid.innerHTML = filteredReports.length > 0 
        ? filteredReports.map(report => renderSingleReportCard(report)).join('')
        : '<p class="no-data">No reports match the selected filters</p>';
      
      // Re-attach column selector listeners
      document.querySelectorAll('.column-select-dropdown').forEach(select => {
        select.addEventListener('change', handleColumnChange);
      });
    }
  }

  function renderSingleReportCard(report) {
    return `
      <div class="analytics-report-card" data-report-id="${report.id}">
        <div class="report-card-header">
          <h3>${report.title}</h3>
          <span class="admin-badge">Admin ${report.adminId}</span>
        </div>
        
        ${report.availableColumns && report.availableColumns.length > 1 ? `
          <div class="column-selector">
            <label>Analyzing Column:</label>
            <select class="column-select-dropdown" data-report-id="${report.id}">
              ${report.availableColumns.map(col => `
                <option value="${col.raw_name}" ${col.display_name === report.currentColumn ? 'selected' : ''}>
                  ${col.display_name} (${col.data_count} values)
                </option>
              `).join('')}
            </select>
          </div>
        ` : `
          <p class="current-column-display"><strong>Analyzing:</strong> ${report.currentColumn}</p>
        `}
        
        <div class="chart-preview">
          <img src="${report.chartImage}" alt="Chart Preview" />
        </div>
        <div class="report-stats-mini">
          <div class="stat-item">
            <span class="stat-label">Records</span>
            <span class="stat-value">${report.recordsProcessed.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Mean</span>
            <span class="stat-value">${report.statistics.mean.toFixed(1)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Range</span>
            <span class="stat-value">${report.statistics.range.toFixed(1)}</span>
          </div>
        </div>
        <div class="enhanced-interpretation">
          <h4><i class="fas fa-brain"></i> Executive Summary</h4>
          <p>${generateExecutiveSummary(report)}</p>
        </div>
        <div class="report-card-footer">
          <span class="upload-date"><i class="far fa-calendar"></i> ${report.date}</span>
          <button class="view-details-btn" onclick="viewReportDetails(${report.id})">
            <i class="fas fa-eye"></i> View Details
          </button>
        </div>
      </div>
    `;
  }

  // Global functions
  window.viewReportDetails = function(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const modal = document.getElementById('reportModal');
    const detailsContainer = modal.querySelector('.report-details');
    
    detailsContainer.innerHTML = `
      <h2>${report.title}</h2>
      <div class="modal-admin-info">
        <span class="admin-badge-large">Uploaded by Admin ${report.adminId}</span>
        <span class="upload-date-large">${report.date}</span>
      </div>
      
      <div class="modal-chart">
        <img src="${report.chartImage}" alt="Full Chart" />
      </div>
      
      <div class="modal-executive-summary">
        <h3><i class="fas fa-chart-bar"></i> Executive Summary</h3>
        <p>${generateExecutiveSummary(report)}</p>
      </div>
      
      <div class="modal-statistics-grid">
        <div class="stat-box"><strong>Mean:</strong> ${report.statistics.mean.toFixed(2)}</div>
        <div class="stat-box"><strong>Median:</strong> ${report.statistics.median.toFixed(2)}</div>
        <div class="stat-box"><strong>Mode:</strong> ${report.statistics.mode.toFixed(2)}</div>
        <div class="stat-box"><strong>Std Dev:</strong> ${report.statistics.std.toFixed(2)}</div>
        <div class="stat-box"><strong>Min:</strong> ${report.statistics.min.toFixed(2)}</div>
        <div class="stat-box"><strong>Max:</strong> ${report.statistics.max.toFixed(2)}</div>
        <div class="stat-box"><strong>Q1:</strong> ${report.statistics.q1.toFixed(2)}</div>
        <div class="stat-box"><strong>Q3:</strong> ${report.statistics.q3.toFixed(2)}</div>
      </div>
      
      <div class="modal-interpretation">
        <h3><i class="fas fa-lightbulb"></i> Detailed Analysis</h3>
        <div class="interpretation-content">${report.interpretation}</div>
      </div>
    `;
    
    modal.classList.add('active');
  };

  window.clearActivityLogs = function() {
    if (confirm('Are you sure you want to clear all activity logs?')) {
      activityLogs = [];
      localStorage.setItem('analytics_activity_logs', JSON.stringify(activityLogs));
      renderDashboard();
    }
  };

  function closeModal() {
    document.getElementById('reportModal').classList.remove('active');
  }

  // Helper functions
  function getLogIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
      upload: 'fas fa-cloud-upload-alt',
      delete: 'fas fa-trash-alt'
    };
    return icons[type] || 'fas fa-circle';
  }

  function getUniqueAdmins() {
    return [...new Set(reports.map(r => r.adminId))].filter(id => 
      id && id !== 'Unknown' && id !== 'SuperAdmin' && id !== 'superadmin'
    );
  }

  function formatTimeAgo(date) {
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
    return 'just now';
  }

  function renderEmptyState() {
    mainContent.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line empty-icon"></i>
        <h2>No Analytics Data Available</h2>
        <p>No reports have been uploaded yet. Analytics will appear here once admins upload data.</p>
      </div>
    `;
  }
});