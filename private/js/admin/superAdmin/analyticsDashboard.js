// analyticsDashboard.js - SuperAdmin Analytics Dashboard - PART 1
// UPDATED: Fetches and displays saved AI interpretations
document.addEventListener("DOMContentLoaded", async () => {
  const mainContent = document.getElementById("mainContent");
  const PYTHON_API_URL = "http://localhost:5000/api";
  const NODE_API_URL = "http://localhost:3000/api";
  
  let uploadedFiles = [];
  let reports = [];

  const CURRENT_ADMIN_ID = 'superadmin';

  // Admin name mapping
  const ADMIN_NAMES = {
    '1': 'adminEnierga',
    '2': 'adminAve',
    'admin1': 'adminEnierga',
    'admin2': 'adminAve',
    'adminEnierga': 'adminEnierga',
    'adminAve': 'adminAve'
  };

  function createRefreshButton() {
    const headerRight = document.querySelector('.header-right');
    
    const refreshBtn = document.createElement('div');
    refreshBtn.innerHTML = `
      <button class="refresh-btn" id="refreshDashboard" title="Refresh Dashboard">
        <i class="fas fa-sync-alt"></i>
      </button>
    `;
    
    headerRight.insertBefore(refreshBtn.firstElementChild, headerRight.firstChild);
    document.getElementById('refreshDashboard').addEventListener('click', handleRefresh);
  }

  async function handleRefresh() {
    const refreshBtn = document.getElementById('refreshDashboard');
    const icon = refreshBtn.querySelector('i');
    
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    try {
      const response = await fetch(`${NODE_API_URL}/files/data`);
      uploadedFiles = await response.json();
      
      if (uploadedFiles.length === 0) {
        renderEmptyState();
      } else {
        await processAllAnalytics();
        renderDashboard();
      }
      
      showRefreshNotification('Dashboard refreshed successfully!', 'success');
    } catch (error) {
      console.error('Refresh error:', error);
      showRefreshNotification('Failed to refresh dashboard', 'error');
    } finally {
      icon.classList.remove('fa-spin');
      refreshBtn.disabled = false;
    }
  }

  function showRefreshNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `refresh-notification ${type}`;
    notification.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  createRefreshButton();

  function getAdminDisplayName(adminId) {
    return ADMIN_NAMES[adminId] || `Admin ${adminId}`;
  }

  await initializeDashboard();

  async function initializeDashboard() {
    mainContent.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading analytics dashboard...</div>';

    try {
      const response = await fetch(`${NODE_API_URL}/files/data`);
      uploadedFiles = await response.json();

      console.log("📊 Fetched files:", uploadedFiles);

      if (uploadedFiles.length === 0) {
        renderEmptyState();
        return;
      }

      await processAllAnalytics();
      renderDashboard();

    } catch (err) {
      console.error("Error initializing dashboard:", err);
      mainContent.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Failed to load analytics data</div>';
    }
  }

  // ✅ UPDATED: Fetch saved interpretation from database
  async function processAllAnalytics() {
    reports = [];
    
    for (let index = 0; index < uploadedFiles.length; index++) {
      const file = uploadedFiles[index];
      const actualFilename = file.filename || file.file_name || file.originalName || file.displayName;
      const displayName = file.displayName || file.originalName || file.file_name || file.filename;
      
      const fileAdminId = file.adminid || 'Unknown';
      const chartType = localStorage.getItem(`chartType_${displayName}`) || file.chart_type || "bar";

      try {
        // ✅ ADDED: Fetch saved interpretation from database
        let savedInterpretation = null;
        let interpretationGenerated = null;
        let analyzedColumn = null;

        try {
          const interpretationResponse = await fetch(`${NODE_API_URL}/files/interpretation/${file.id}`);
          if (interpretationResponse.ok) {
            const interpretationData = await interpretationResponse.json();
            savedInterpretation = interpretationData.interpretation;
            interpretationGenerated = interpretationData.generated_at;
            analyzedColumn = interpretationData.analyzed_column;
            console.log(`✅ Found saved interpretation for ${displayName}`);
          }
        } catch (err) {
          console.log(`ℹ️ No saved interpretation for ${displayName}`);
        }

        // Process analytics WITHOUT generating new interpretation
        const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: actualFilename,
            chart_type: chartType,
            generate_interpretation: false  // Don't generate on load
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
          interpretation: savedInterpretation || "No AI interpretation available yet. Admin needs to generate one.",
          hasInterpretation: !!savedInterpretation,
          interpretationGenerated: interpretationGenerated,
          analyzedColumn: analyzedColumn,
          tableData: analyticsData.table_data,
          fileInfo: analyticsData.file_info,
          summary: analyticsData.summary,
          availableColumns: analyticsData.file_info?.available_columns || [],
          columnDescriptions: analyticsData.file_info?.column_descriptions || {},
          currentColumn: analyticsData.file_info?.analyzed_column || "Default Column",
          fileExtension: actualFilename.split('.').pop().toUpperCase(),
          adminId: fileAdminId
        });

      } catch (error) {
        console.error(`Error processing ${actualFilename}:`, error);
      }
    }
  }

  async function renderDashboard() {
    const adminActivityHtml = await renderAdminActivity();
    
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

      <!-- Admin Activity Overview -->
      <div class="admin-activity-section">
        <h2 class="section-title"><i class="fas fa-users-cog"></i> Admin Activity Overview</h2>
        ${adminActivityHtml}
      </div>

      <!-- Analytics Reports Grid -->
      <div class="analytics-grid-section">
        <div class="section-header">
          <h2 class="section-title"><i class="fas fa-chart-bar"></i> Analytics Reports</h2>
          <div class="filter-controls">
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

  async function renderAdminActivity() {
    const adminStats = {};
    
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

    try {
      const response = await fetch(`${NODE_API_URL}/activity-logs`);
      const activityLogs = await response.json();
      
      activityLogs.forEach(log => {
        const adminId = log.adminid;
        const logTimestamp = new Date(log.timestamp);
        
        if (adminStats[adminId]) {
          if (logTimestamp > adminStats[adminId].lastActivity) {
            adminStats[adminId].lastActivity = logTimestamp;
          }
        }
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }

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
              <h4>${getAdminDisplayName(adminId)}</h4>
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

  // Continue to Part 2...
  window.processAllAnalytics = processAllAnalytics;
  window.renderDashboard = renderDashboard;
  window.getAdminDisplayName = getAdminDisplayName;
  window.formatTimeAgo = formatTimeAgo;
  window.getUniqueAdmins = getUniqueAdmins;
  window.renderEmptyState = renderEmptyState;
  window.reports = reports;
  window.PYTHON_API_URL = PYTHON_API_URL;
  window.NODE_API_URL = NODE_API_URL;
  // analyticsDashboard.js - PART 2 (Continuation)
// This part contains renderReportsGrid, modal, and event handlers

  // ✅ UPDATED: Show interpretation status badge in report cards
  function renderReportsGrid() {
    if (window.reports.length === 0) {
      return '<p class="no-data">No reports available</p>';
    }

    return window.reports.map(report => {
      // Interpretation status badge
      const interpretationBadge = report.hasInterpretation 
        ? `<span class="ai-status-badge success"><i class="fas fa-check-circle"></i> AI Analysis Available</span>`
        : `<span class="ai-status-badge pending"><i class="fas fa-robot"></i> No AI Analysis</span>`;

      return `
      <div class="analytics-report-card" data-report-id="${report.id}">
        <div class="report-card-header">
          <h3>${report.title}</h3>
          <span class="admin-badge">${window.getAdminDisplayName(report.adminId)}</span>
        </div>
        
        ${interpretationBadge}
        
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
    `}).join('');
  }

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

  function attachEventListeners() {
    const timeFilter = document.getElementById('timeFilter');
    
    if (timeFilter) {
      timeFilter.addEventListener('change', applyFilters);
    }

    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
      el.addEventListener('click', closeModal);
    });

    document.querySelectorAll('.column-select-dropdown').forEach(select => {
      select.addEventListener('change', handleColumnChange);
    });
  }

  async function handleColumnChange(event) {
    const select = event.target;
    const reportId = select.dataset.reportId;
    const selectedColumn = select.value;
    const report = window.reports.find(r => r.id == reportId);
    
    if (!report) return;

    const card = select.closest('.analytics-report-card');
    const chartContainer = card.querySelector('.chart-preview');
    const originalContent = chartContainer.innerHTML;
    
    chartContainer.innerHTML = '<p class="loading-chart">Loading data for selected column...</p>';

    try {
      const response = await fetch(`${window.PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: report.actualFilename,
          chart_type: report.chartType,
          column: selectedColumn,
          generate_interpretation: false
        })
      });

      if (!response.ok) throw new Error('Failed to load column data');

      const analyticsData = await response.json();
      
      report.chartImage = analyticsData.chart_image;
      report.statistics = analyticsData.statistics;
      report.interpretation = "Column changed - admin needs to regenerate AI interpretation for new data.";
      report.hasInterpretation = false;
      report.tableData = analyticsData.table_data;
      report.currentColumn = analyticsData.file_info.analyzed_column;

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

      // Update AI status badge
      const badge = card.querySelector('.ai-status-badge');
      if (badge) {
        badge.className = 'ai-status-badge pending';
        badge.innerHTML = '<i class="fas fa-robot"></i> No AI Analysis';
      }

    } catch (error) {
      console.error('Error loading column data:', error);
      chartContainer.innerHTML = originalContent;
      alertSystem.warning('Failed to load data for selected column. Please try again.');
    }
  }

  function applyFilters() {
    const timeFilter = document.getElementById('timeFilter').value;
    
    let filteredReports = [...window.reports];

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
      
      document.querySelectorAll('.column-select-dropdown').forEach(select => {
        select.addEventListener('change', handleColumnChange);
      });
    }
  }

  function renderSingleReportCard(report) {
    const interpretationBadge = report.hasInterpretation 
      ? `<span class="ai-status-badge success"><i class="fas fa-check-circle"></i> AI Analysis Available</span>`
      : `<span class="ai-status-badge pending"><i class="fas fa-robot"></i> No AI Analysis</span>`;

    return `
      <div class="analytics-report-card" data-report-id="${report.id}">
        <div class="report-card-header">
          <h3>${report.title}</h3>
          <span class="admin-badge">${window.getAdminDisplayName(report.adminId)}</span>
        </div>
        
        ${interpretationBadge}
        
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

  // ✅ UPDATED: Display saved AI interpretation in modal
  window.viewReportDetails = function(reportId) {
    const report = window.reports.find(r => r.id === reportId);
    if (!report) return;

    const modal = document.getElementById('reportModal');
    const detailsContainer = modal.querySelector('.report-details');
    
    // Format interpretation generated date if available
    let interpretationMeta = '';
    if (report.hasInterpretation && report.interpretationGenerated) {
      const generatedDate = new Date(report.interpretationGenerated);
      interpretationMeta = `<p class="interpretation-meta"><i class="fas fa-clock"></i> Generated: ${generatedDate.toLocaleString()}</p>`;
    }
    
    detailsContainer.innerHTML = `
      <h2>${report.title}</h2>
      <div class="modal-admin-info">
        <span class="admin-badge-large">Uploaded by ${window.getAdminDisplayName(report.adminId)}</span>
        <span class="upload-date-large">${report.date}</span>
        ${report.hasInterpretation 
          ? '<span class="ai-status-badge success"><i class="fas fa-check-circle"></i> AI Analysis Available</span>'
          : '<span class="ai-status-badge pending"><i class="fas fa-robot"></i> No AI Analysis</span>'}
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
      
      <div class="modal-interpretation ${report.hasInterpretation ? 'has-ai' : 'no-ai'}">
        <h3><i class="fas fa-lightbulb"></i> Detailed AI Analysis</h3>
        ${interpretationMeta}
        <div class="interpretation-content">
          ${report.hasInterpretation 
            ? report.interpretation 
            : '<p class="no-interpretation"><i class="fas fa-info-circle"></i> No AI interpretation has been generated for this report yet. The admin who uploaded this file needs to click "Generate AI" on their Analytics Report page to create an interpretation.</p>'}
        </div>
        ${report.analyzedColumn ? `<p class="analyzed-column-info"><strong>Analyzed Column:</strong> ${report.analyzedColumn}</p>` : ''}
      </div>
    `;
    
    modal.classList.add('active');
  };

  function closeModal() {
    document.getElementById('reportModal').classList.remove('active');
  }

  function getUniqueAdmins() {
    return [...new Set(window.reports.map(r => r.adminId))].filter(id => 
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

  // Export functions to window for access
  window.renderReportsGrid = renderReportsGrid;
  window.generateExecutiveSummary = generateExecutiveSummary;
  window.attachEventListeners = attachEventListeners;
  window.applyFilters = applyFilters;
  window.closeModal = closeModal;

});