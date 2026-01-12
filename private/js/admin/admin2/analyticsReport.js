//analyticsReport.js - COMPLETE FIXED VERSION
document.addEventListener("DOMContentLoaded", async () => {
  const reportsGrid = document.querySelector(".reports-grid");
  const searchInput = document.querySelector(".search-input");
  const filterSelect = document.querySelector(".filter-select");
  const exportAllBtn = document.querySelector(".export-btn");
  const PYTHON_API_URL = "http://localhost:5000/api";
  const NODE_API_URL = "http://localhost:3000/api";

  let uploadedFiles = [];
  let reports = [];
  let filteredReports = [];
  let currentView = "active"; // "active" or "trash"

  function getCurrentAdminId() {
    return localStorage.getItem('currentAdminId') || sessionStorage.getItem('adminId') || '2';
  }

  async function logAdminActivity(actionType, message, details = {}) {
    const adminId = getCurrentAdminId();
    
    const activityLog = {
      type: actionType,
      message: message,
      adminId: adminId,
      timestamp: new Date().toISOString(),
      details: details
    };

    try {
      const response = await fetch(`${NODE_API_URL}/activity-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityLog)
      });

      if (!response.ok) throw new Error('Failed to log to server');
      console.log(`✅ Activity logged: ${actionType} - ${message}`);
    } catch (error) {
      console.warn('Could not log to server, using localStorage fallback');
      let logs = JSON.parse(localStorage.getItem('analytics_activity_logs') || '[]');
      logs.push(activityLog);
      if (logs.length > 500) logs = logs.slice(-500);
      localStorage.setItem('analytics_activity_logs', JSON.stringify(logs));
    }
  }

  // Add view toggle buttons to header
  function createViewToggle() {
    const reportsHeader = document.querySelector(".reports-header");
    if (!reportsHeader) return;

    const existingToggle = document.querySelector(".view-toggle");
    if (existingToggle) existingToggle.remove();

    const viewToggle = document.createElement("div");
    viewToggle.className = "view-toggle";
    viewToggle.innerHTML = `
      <button class="view-toggle-btn ${currentView === 'active' ? 'active' : ''}" data-view="active">
        <i class="bi bi-file-earmark-text"></i> Active Reports
      </button>
      <button class="view-toggle-btn ${currentView === 'trash' ? 'active' : ''}" data-view="trash">
        <i class="bi bi-trash"></i> Trash
      </button>
    `;

    viewToggle.querySelectorAll(".view-toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentView = btn.dataset.view;
        document.querySelectorAll(".view-toggle-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadReports();
      });
    });

    const searchFilter = reportsHeader.querySelector(".search-filter");
    if (searchFilter) {
      reportsHeader.insertBefore(viewToggle, searchFilter);
    } else {
      reportsHeader.prepend(viewToggle);
    }
  }

  async function loadReports() {
    try {
      reportsGrid.innerHTML = "<p>Loading analytics...</p>";

      const endpoint = currentView === "trash" 
        ? `${NODE_API_URL}/files/trash`
        : `${NODE_API_URL}/files/data`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      uploadedFiles = currentView === "trash" ? data.files : data;

      if (uploadedFiles.length === 0) {
        const message = currentView === "trash" 
          ? "No reports in trash." 
          : "No analytics available yet. Upload a file to generate reports.";
        reportsGrid.innerHTML = `<p>${message}</p>`;
        updateSummaryCards([], uploadedFiles);
        return;
      }

      reports = [];

      for (let index = 0; index < uploadedFiles.length; index++) {
        const file = uploadedFiles[index];
        
        const actualFilename = file.filename || file.originalName || file.displayName;
        const displayName = file.displayName || file.originalName || file.filename;
        const chartType = localStorage.getItem(`chartType_${displayName}`) || file.chart_type || "bar";
        
        try {
          let savedInterpretation = null;
          let analyzedColumn = null;
          
          if (currentView === "active") {
            try {
              const interpretationResponse = await fetch(`${NODE_API_URL}/files/interpretation/${file.id}`);
              if (interpretationResponse.ok) {
                const interpretationData = await interpretationResponse.json();
                savedInterpretation = interpretationData.interpretation;
                analyzedColumn = interpretationData.analyzed_column;
              }
            } catch (err) {
              console.log(`No saved interpretation for ${displayName}`);
            }
          }

          const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: actualFilename,
              chart_type: chartType,
              generate_interpretation: false
            })
          });

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const analyticsData = await response.json();

          reports.push({
            id: index + 1,
            file_id: file.id,
            title: displayName || `Report ${index + 1}`,
            actualFilename: actualFilename,
            metric: file.type || "Uploaded Dataset",
            date: new Date(file.uploaded_at).toLocaleDateString(),
            uploadedAt: new Date(file.uploaded_at),
            trashedAt: file.trashed_at ? new Date(file.trashed_at) : null,
            recordsProcessed: analyticsData.statistics.count,
            chartType: chartType,
            chartImage: analyticsData.chart_image,
            statistics: analyticsData.statistics,
            interpretation: savedInterpretation,
            hasInterpretation: !!savedInterpretation,
            analyzedColumn: analyzedColumn || analyticsData.file_info?.analyzed_column,
            tableData: analyticsData.table_data,
            fileInfo: analyticsData.file_info,
            summary: analyticsData.summary,
            availableColumns: analyticsData.file_info?.available_columns || [],
            columnDescriptions: analyticsData.file_info?.column_descriptions || {},
            currentColumn: analyticsData.file_info?.analyzed_column || "Default Column",
            fileExtension: actualFilename.split('.').pop().toUpperCase(),
            isTrashed: currentView === "trash"
          });

        } catch (error) {
          console.error(`Error processing ${file.filename}:`, error);
          
          reports.push({
            id: index + 1,
            file_id: file.id,
            title: displayName || `Report ${index + 1}`,
            actualFilename: actualFilename,
            metric: "Error Processing",
            date: new Date(file.uploaded_at).toLocaleDateString(),
            uploadedAt: new Date(file.uploaded_at),
            trashedAt: file.trashed_at ? new Date(file.trashed_at) : null,
            recordsProcessed: 0,
            chartType: chartType,
            error: error.message,
            fileExtension: actualFilename.split('.').pop().toUpperCase(),
            isTrashed: currentView === "trash"
          });
        }
      }

      updateSummaryCards(reports, uploadedFiles);
      filteredReports = [...reports];
      renderReports(filteredReports);

    } catch (err) {
      console.error("Error loading reports:", err);
      reportsGrid.innerHTML = "<p>Error loading reports. Please try again.</p>";
    }
  }

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    applyFilters(searchTerm, filterSelect.value);
  });

  filterSelect.addEventListener("change", (e) => {
    const searchTerm = searchInput.value.toLowerCase();
    applyFilters(searchTerm, e.target.value);
  });

  exportAllBtn.addEventListener("click", () => {
    if (currentView === "trash") {
      toast.warning("Cannot export reports from trash. Restore them first.");
      return;
    }
    exportAllReports(reports);
  });

  function applyFilters(searchTerm, fileType) {
    filteredReports = reports.filter(report => {
      const matchesSearch = !searchTerm || 
        report.title.toLowerCase().includes(searchTerm) ||
        report.currentColumn.toLowerCase().includes(searchTerm) ||
        report.metric.toLowerCase().includes(searchTerm);

      const matchesType = fileType === "All Types" || report.fileExtension === fileType;
      return matchesSearch && matchesType;
    });

    renderReports(filteredReports);
  }

  function updateSummaryCards(reportsList, filesList) {
    const totalReportsCard = document.querySelector(".summary-card:nth-child(1) .summary-value");
    if (totalReportsCard) {
      totalReportsCard.textContent = reportsList.length;
    }

    const totalRecords = reportsList.reduce((sum, report) => sum + (report.recordsProcessed || 0), 0);
    const totalRecordsCard = document.querySelector(".summary-card:nth-child(2) .summary-value");
    const totalRecordsLabel = document.querySelector(".summary-card:nth-child(2) .summary-label");
    if (totalRecordsCard) totalRecordsCard.textContent = totalRecords.toLocaleString();
    if (totalRecordsLabel) {
      totalRecordsLabel.textContent = currentView === "trash" 
        ? "Records in Trash" 
        : "Total Records Tracked";
    }

    const mostRecentReport = reportsList.sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
    const recentReportCard = document.querySelector(".summary-card:nth-child(3) .summary-value");
    const recentLabel = document.querySelector(".summary-card:nth-child(3) .summary-label");
    if (recentReportCard && mostRecentReport) {
      recentReportCard.textContent = mostRecentReport.title.length > 20 
        ? mostRecentReport.title.substring(0, 20) + "..." 
        : mostRecentReport.title;
    }
    if (recentLabel) {
      recentLabel.textContent = currentView === "trash" ? "Recently Deleted" : "Most Recent Report";
    }

    const avgRecords = reportsList.length > 0 ? Math.round(totalRecords / reportsList.length) : 0;
    const avgCard = document.querySelector(".summary-card:nth-child(4) .summary-value");
    const avgLabel = document.querySelector(".summary-card:nth-child(4) .summary-label");
    if (avgCard) avgCard.textContent = avgRecords.toLocaleString();
    if (avgLabel) {
      avgLabel.textContent = currentView === "trash" 
        ? "Items in Trash" 
        : "Avg Records per Report";
    }
  }

  function exportAllReports(reportsList) {
    if (reportsList.length === 0) {
      toast.warning("No reports available to export.");
      return;
    }

    let csvContent = "Report Title,File Type,Date Uploaded,Records Processed,Current Column,Mean,Median,Std Dev,Min,Max\n";

    reportsList.forEach(report => {
      if (!report.error) {
        const stats = report.statistics;
        csvContent += `"${report.title}",${report.fileExtension},${report.date},${report.recordsProcessed},"${report.currentColumn}",${stats.mean.toFixed(2)},${stats.median.toFixed(2)},${stats.std.toFixed(2)},${stats.min.toFixed(2)},${stats.max.toFixed(2)}\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics_reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${reportsList.length} reports successfully!`);
  }

  function renderReports(reportsList) {
    reportsGrid.innerHTML = "";

    if (reportsList.length === 0) {
      const message = currentView === "trash" 
        ? "No reports in trash." 
        : "No reports match your search criteria.";
      reportsGrid.innerHTML = `<p>${message}</p>`;
      return;
    }

    if (currentView === "trash" && reportsList.length > 0) {
      const emptyTrashContainer = document.createElement("div");
      emptyTrashContainer.className = "empty-trash-container";
      emptyTrashContainer.innerHTML = `
        <button class="empty-trash-btn" id="emptyTrashBtn">
          <i class="bi bi-trash3"></i> Empty Trash (${reportsList.length})
        </button>
      `;
      reportsGrid.appendChild(emptyTrashContainer);
      
      // ADD EVENT LISTENER IMMEDIATELY AFTER APPENDING
      const emptyTrashBtn = document.getElementById("emptyTrashBtn");
      if (emptyTrashBtn) {
        emptyTrashBtn.addEventListener("click", async () => {
          await emptyTrash();
        });
      }
    }

    reportsList.forEach(report => {
      const card = document.createElement("div");
      card.className = `report-card ${report.isTrashed ? 'trashed' : ''}`;

      if (report.error) {
        card.innerHTML = `
          <div class="report-header">
            <div>
              <h3>${report.title}</h3>
              <p class="error-text">Error: ${report.error}</p>
            </div>
          </div>
        `;
        reportsGrid.appendChild(card);
        return;
      }

      let columnSelector = '';
      if (report.availableColumns && report.availableColumns.length > 1 && !report.isTrashed) {
        columnSelector = `
          <div class="column-selector">
            <label for="columnSelect-${report.id}">Select Data Column:</label>
            <select id="columnSelect-${report.id}" class="column-select-dropdown">
              ${report.availableColumns.map(col => `
                <option value="${col.raw_name}" ${col.display_name === report.currentColumn ? 'selected' : ''}>
                  ${col.display_name} (${col.data_count} values)
                </option>
              `).join('')}
            </select>
          </div>
        `;
      }

      const interpretationStatus = report.hasInterpretation 
        ? '<span class="interpretation-badge"><i class="bi bi-check-circle-fill"></i> AI Analysis Ready</span>'
        : '<span class="interpretation-badge empty"><i class="bi bi-robot"></i> No AI Analysis Yet</span>';

      const trashedBadge = report.isTrashed 
        ? `<span class="trashed-badge"><i class="bi bi-trash"></i> In Trash (${new Date(report.trashedAt).toLocaleDateString()})</span>`
        : '';

      card.innerHTML = `
        <div class="report-header">
          <div>
            <h3>${report.title}</h3>
            <p>${report.metric}</p>
            <p class="current-column-display"><strong>Analyzing:</strong> ${report.currentColumn}</p>
            ${trashedBadge}
            ${!report.isTrashed ? interpretationStatus : ''}
          </div>
        </div>
        ${!report.isTrashed ? columnSelector : ''}
        ${!report.isTrashed ? `
        <div class="chart-selector">
          <label for="chartType-${report.id}">Chart Type:</label>
          <select id="chartType-${report.id}" class="chart-type-select">
            <option value="bar" ${report.chartType === "bar" ? "selected" : ""}>Bar Chart</option>
            <option value="line" ${report.chartType === "line" ? "selected" : ""}>Line Chart</option>
            <option value="pie" ${report.chartType === "pie" ? "selected" : ""}>Pie Chart</option>
            <option value="histogram" ${report.chartType === "histogram" ? "selected" : ""}>Histogram</option>
            <option value="box" ${report.chartType === "box" ? "selected" : ""}>Box Plot</option>
          </select>
        </div>
        ` : ''}
        <div class="chart-container">
          <img src="${report.chartImage}" alt="Chart" class="chart-preview-img" />
        </div>
        <div class="report-meta">
          <span><i class="bi bi-calendar"></i> ${report.date}</span>
          <span><i class="bi bi-database"></i> ${report.recordsProcessed} records</span>
          ${report.summary?.outliers_detected ? `<span><i class="bi bi-exclamation-triangle"></i> ${report.summary.outliers_detected} outliers</span>` : ''}
        </div>
        <div class="quick-stats">
          <div class="stat-mini">
            <span class="stat-label">Mean</span>
            <span class="stat-value">${report.statistics.mean.toFixed(2)}</span>
          </div>
          <div class="stat-mini">
            <span class="stat-label">Median</span>
            <span class="stat-value">${report.statistics.median.toFixed(2)}</span>
          </div>
          <div class="stat-mini">
            <span class="stat-label">Std Dev</span>
            <span class="stat-value">${report.statistics.std.toFixed(2)}</span>
          </div>
        </div>
        <div class="report-actions">
          ${report.isTrashed ? `
            <div class="trash-actions">
              <button class="restore-btn" data-file-id="${report.file_id}" data-title="${report.title}">
                <i class="bi bi-arrow-counterclockwise"></i> Restore
              </button>
              <button class="delete-permanent-btn" data-file-id="${report.file_id}" data-title="${report.title}">
                <i class="bi bi-trash3"></i> Delete Permanently
              </button>
            </div>
          ` : `
            <div class="left-actions">
              <button class="view-btn" data-id="${report.id}">
                <i class="bi bi-eye"></i> View Report
              </button>
              <button
                class="generate-interpretation-btn"
                data-id="${report.id}"
                data-file-id="${report.file_id}"
                data-filename="${report.actualFilename}"
                ${report.hasInterpretation ? 'data-has-interpretation="true"' : ''}
              >
                <i class="bi bi-robot"></i>
                ${report.hasInterpretation ? 'Regenerate AI Analysis' : 'Generate AI Analysis'}
              </button>
            </div>
            <div class="right-actions">
              <button
                class="refresh-btn"
                data-id="${report.id}"
                data-filename="${report.actualFilename || report.title}"
              >
                <i class="fas fa-sync-alt"></i>
              </button>
              <button class="trash-btn" data-file-id="${report.file_id}" data-title="${report.title}">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          `}
        </div>
      `;

      reportsGrid.appendChild(card);
    });

    attachCardEventListeners();
  }

  // TRASH ACTION FUNCTIONS
  async function moveToTrash(fileId, fileName) {
    try {
      const response = await fetch(`${NODE_API_URL}/files/move-to-trash/${fileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error('Failed to move to trash');

      await logAdminActivity('trash', `Moved report to trash: ${fileName}`, {
        fileId: fileId,
        reportTitle: fileName,
        action: 'moved_to_trash'
      });

      toast.success(`"${fileName}" moved to trash.`);
      await loadReports();

    } catch (error) {
      console.error('Error moving to trash:', error);
      toast.error('Failed to move to trash. Please try again.');
      
      await logAdminActivity('error', `Failed to move report to trash: ${fileName}`, {
        fileId: fileId,
        error: error.message
      });
    }
  }

  async function restoreFromTrash(fileId, fileName) {
    try {
      const response = await fetch(`${NODE_API_URL}/files/restore/${fileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error('Failed to restore');

      await logAdminActivity('restore', `Restored report from trash: ${fileName}`, {
        fileId: fileId,
        reportTitle: fileName,
        action: 'restored_from_trash'
      });

      toast.success(`"${fileName}" has been restored.`);
      await loadReports();

    } catch (error) {
      console.error('Error restoring:', error);
      toast.error('Failed to restore. Please try again.');
      
      await logAdminActivity('error', `Failed to restore report: ${fileName}`, {
        fileId: fileId,
        error: error.message
      });
    }
  }

  async function deletePermanently(fileId, fileName) {
    if (!confirm(`Permanently delete "${fileName}"? This action cannot be undone!`)) {
      return;
    }
    
    try {
      const response = await fetch(`${NODE_API_URL}/files/permanent/${fileId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error('Failed to delete permanently');

      await logAdminActivity('delete', `Permanently deleted report: ${fileName}`, {
        fileId: fileId,
        reportTitle: fileName,
        action: 'deleted_permanently'
      });

      toast.warning(`"${fileName}" has been permanently deleted.`);
      await loadReports();

    } catch (error) {
      console.error('Error deleting permanently:', error);
      toast.error('Failed to delete permanently. Please try again.');
      
      await logAdminActivity('error', `Failed to permanently delete: ${fileName}`, {
        fileId: fileId,
        error: error.message
      });
    }
  }

  async function emptyTrash() {
    const trashedCount = reports.length;
    
    if (trashedCount === 0) {
      toast.warning("Trash is already empty.");
      return;
    }

    if (!confirm(`Permanently delete all ${trashedCount} report(s) in trash? This action cannot be undone!`)) {
      return;
    }
    
    try {
      const response = await fetch(`${NODE_API_URL}/files/empty-trash`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to empty trash');
      }

      const result = await response.json();

      await logAdminActivity('empty_trash', `Emptied trash: ${result.deletedCount} report(s) deleted`, {
        deletedCount: result.deletedCount,
        action: 'emptied_trash'
      });

      toast.success(`Trash emptied: ${result.deletedCount} report(s) permanently deleted.`);
      await loadReports();

    } catch (error) {
      console.error('Error emptying trash:', error);
      toast.error(`Failed to empty trash: ${error.message}`);
      
      await logAdminActivity('error', 'Failed to empty trash', {
        error: error.message
      });
    }
  }

  // Continued in next comment...
  function attachCardEventListeners() {
    // Trash button (move to trash)
    document.querySelectorAll(".trash-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        const fileName = e.currentTarget.dataset.title;
        await moveToTrash(fileId, fileName);
      });
    });

    // Restore button
    document.querySelectorAll(".restore-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        const fileName = e.currentTarget.dataset.title;
        await restoreFromTrash(fileId, fileName);
      });
    });

    // Delete permanently button
    document.querySelectorAll(".delete-permanent-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        const fileName = e.currentTarget.dataset.title;
        await deletePermanently(fileId, fileName);
      });
    });

    // Column selection changes
    document.querySelectorAll(".column-select-dropdown").forEach(select => {
      select.addEventListener("change", async (e) => {
        const reportId = e.target.id.split("-")[1];
        const selectedColumn = e.target.value;
        const report = reports.find(r => r.id == reportId);
        
        if (!report) return;

        const card = e.target.closest(".report-card");
        const chartContainer = card.querySelector(".chart-container");
        const columnDisplay = card.querySelector(".current-column-display");
        const originalContent = chartContainer.innerHTML;
        
        chartContainer.innerHTML = '<p>Loading data for selected column...</p>';

        try {
          const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: report.actualFilename || report.title,
              chart_type: report.chartType,
              column: selectedColumn,
              generate_interpretation: false
            })
          });

          if (!response.ok) throw new Error('Failed to load column data');

          const analyticsData = await response.json();
          
          chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;
          
          report.chartImage = analyticsData.chart_image;
          report.statistics = analyticsData.statistics;
          report.tableData = analyticsData.table_data;
          report.currentColumn = analyticsData.file_info.analyzed_column;
          report.interpretation = null;
          report.hasInterpretation = false;

          if (columnDisplay) {
            columnDisplay.innerHTML = `<strong>Analyzing:</strong> ${report.currentColumn}`;
          }

          const quickStats = card.querySelector(".quick-stats");
          quickStats.innerHTML = `
            <div class="stat-mini">
              <span class="stat-label">Mean</span>
              <span class="stat-value">${analyticsData.statistics.mean.toFixed(2)}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-label">Median</span>
              <span class="stat-value">${analyticsData.statistics.median.toFixed(2)}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-label">Std Dev</span>
              <span class="stat-value">${analyticsData.statistics.std.toFixed(2)}</span>
            </div>
          `;

          const generateBtn = card.querySelector(".generate-interpretation-btn");
          if (generateBtn) {
            generateBtn.innerHTML = '<i class="bi bi-robot"></i> Generate AI Analysis';
            generateBtn.removeAttribute('data-has-interpretation');
          }

          await logAdminActivity('update', `Changed analysis column for ${report.title} to ${report.currentColumn}`, {
            reportId: report.id,
            reportTitle: report.title,
            newColumn: report.currentColumn,
            action: 'column_change'
          });

        } catch (error) {
          console.error('Error loading column data:', error);
          chartContainer.innerHTML = originalContent;
          toast.error('Failed to load data for selected column. Please try again.');
          
          await logAdminActivity('error', `Failed to change column for ${report.title}`, {
            reportId: report.id,
            error: error.message
          });
        }
      });
    });

    // Chart type changes
    document.querySelectorAll(".chart-type-select").forEach(select => {
      select.addEventListener("change", async (e) => {
        const reportId = e.target.id.split("-")[1];
        const selectedType = e.target.value;
        const report = reports.find(r => r.id == reportId);
        
        if (!report) return;

        const card = e.target.closest(".report-card");
        const chartContainer = card.querySelector(".chart-container");
        const originalContent = chartContainer.innerHTML;
        chartContainer.innerHTML = '<p>Regenerating chart...</p>';

        const columnSelector = card.querySelector(".column-select-dropdown");
        const selectedColumn = columnSelector ? columnSelector.value : null;

        try {
          const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: report.actualFilename || report.title,
              chart_type: selectedType,
              column: selectedColumn,
              generate_interpretation: false
            })
          });

          if (!response.ok) throw new Error('Failed to regenerate chart');

          const analyticsData = await response.json();
          
          chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;
          
          report.chartImage = analyticsData.chart_image;
          report.chartType = selectedType;
          report.statistics = analyticsData.statistics;

          localStorage.setItem(`chartType_${report.title}`, selectedType);

          await logAdminActivity('update', `Changed chart type for ${report.title} to ${selectedType}`, {
            reportId: report.id,
            reportTitle: report.title,
            newChartType: selectedType,
            action: 'chart_type_change'
          });

        } catch (error) {
          console.error('Error regenerating chart:', error);
          chartContainer.innerHTML = originalContent;
          toast.error('Failed to regenerate chart. Please try again.');
          
          await logAdminActivity('error', `Failed to change chart type for ${report.title}`, {
            reportId: report.id,
            error: error.message
          });
        }
      });
    });

    // Generate Interpretation Button
    document.querySelectorAll(".generate-interpretation-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const reportId = e.currentTarget.dataset.id;
        const fileId = e.currentTarget.dataset.fileId;
        const filename = e.currentTarget.dataset.filename;
        const report = reports.find(r => r.id == reportId);
        
        if (!report) return;

        const card = e.currentTarget.closest(".report-card");
        const columnSelector = card.querySelector(".column-select-dropdown");
        const selectedColumn = columnSelector ? columnSelector.value : null;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
          const response = await fetch(`${PYTHON_API_URL}/analytics/generate-interpretation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: filename,
              file_id: fileId,
              column: selectedColumn,
              chart_type: report.chartType
            })
          });

          if (!response.ok) throw new Error('Failed to generate interpretation');

          const result = await response.json();
          
          report.interpretation = result.interpretation;
          report.hasInterpretation = true;
          report.analyzedColumn = result.column_analyzed || report.currentColumn;

          btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Regenerate AI Analysis';
          btn.setAttribute('data-has-interpretation', 'true');

          const badge = card.querySelector(".interpretation-badge");
          if (badge) {
            badge.className = "interpretation-badge";
            badge.innerHTML = '<i class="bi bi-check-circle-fill"></i> AI Analysis Ready';
          }

          toast.success('AI interpretation generated successfully!');

          await logAdminActivity('generate', `Generated AI interpretation for ${report.title}`, {
            reportId: report.id,
            reportTitle: report.title,
            fileId: fileId,
            analyzedColumn: report.analyzedColumn
          });

        } catch (error) {
          console.error('Error generating interpretation:', error);
          toast.error('Failed to generate AI interpretation. Please try again.');
          
          await logAdminActivity('error', `Failed to generate interpretation for ${report.title}`, {
            reportId: report.id,
            error: error.message
          });
        } finally {
          btn.disabled = false;
          if (!report.hasInterpretation) {
            btn.innerHTML = '<i class="bi bi-robot"></i> Generate AI Analysis';
          }
        }
      });
    });

    // Refresh button
    document.querySelectorAll(".refresh-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const reportId = e.currentTarget.dataset.id;
        const filename = e.currentTarget.dataset.filename;
        const report = reports.find(r => r.id == reportId);
        
        if (!report) return;

        btn.disabled = true;
        btn.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';

        const card = btn.closest(".report-card");
        const columnSelector = card.querySelector(".column-select-dropdown");
        const selectedColumn = columnSelector ? columnSelector.value : null;

        try {
          const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: filename,
              chart_type: report.chartType,
              column: selectedColumn,
              generate_interpretation: false
            })
          });

          if (!response.ok) throw new Error('Failed to refresh analytics');

          const analyticsData = await response.json();
          
          Object.assign(report, {
            chartImage: analyticsData.chart_image,
            statistics: analyticsData.statistics,
            tableData: analyticsData.table_data
          });

          const chartContainer = card.querySelector(".chart-container");
          chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;

          const quickStats = card.querySelector(".quick-stats");
          quickStats.innerHTML = `
            <div class="stat-mini">
              <span class="stat-label">Mean</span>
              <span class="stat-value">${analyticsData.statistics.mean.toFixed(2)}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-label">Median</span>
              <span class="stat-value">${analyticsData.statistics.median.toFixed(2)}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-label">Std Dev</span>
              <span class="stat-value">${analyticsData.statistics.std.toFixed(2)}</span>
            </div>
          `;

          toast.success('Analytics refreshed successfully!');

        } catch (error) {
          console.error('Error refreshing analytics:', error);
          toast.error('Failed to refresh analytics. Please try again.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
      });
    });

    // VIEW REPORT button
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const reportId = e.currentTarget.dataset.id;
        const report = reports.find(r => r.id == reportId);
        if (report) openReportDetails(report);
      });
    });
  }

  // MODAL AND EXPORT FUNCTIONS
  function openReportDetails(report) {
    const modal = document.getElementById("reportModal");
    if (!modal) {
      toast.error("Modal not found! Make sure #reportModal exists in your HTML.");
      return;
    }

    const reportDetails = modal.querySelector(".report-details");
    if (!reportDetails) return;

    const stats = report.statistics;

    reportDetails.innerHTML = `
      <h2>${report.title}</h2>
      <p class="current-column-display"><strong>Currently Analyzing:</strong> ${report.currentColumn}</p>
      
      <div class="chart-full">
        <img src="${report.chartImage}" alt="Full Chart" style="max-width: 100%; height: auto;" />
      </div>

      <div class="stats-section">
        <div class="stat-card blue">
          <strong>Mean</strong>
          <p>${stats.mean.toFixed(2)}</p>
        </div>
        <div class="stat-card green">
          <strong>Median</strong>
          <p>${stats.median.toFixed(2)}</p>
        </div>
        <div class="stat-card purple">
          <strong>Mode</strong>
          <p>${stats.mode.toFixed(2)}</p>
        </div>
        <div class="stat-card orange">
          <strong>Std Dev</strong>
          <p>${stats.std.toFixed(2)}</p>
        </div>
        <div class="stat-card red">
          <strong>Min</strong>
          <p>${stats.min.toFixed(2)}</p>
        </div>
        <div class="stat-card teal">
          <strong>Max</strong>
          <p>${stats.max.toFixed(2)}</p>
        </div>
        <div class="stat-card yellow">
          <strong>Q1</strong>
          <p>${stats.q1.toFixed(2)}</p>
        </div>
        <div class="stat-card pink">
          <strong>Q3</strong>
          <p>${stats.q3.toFixed(2)}</p>
        </div>
      </div>

      <div class="insight">
        <strong>🔍 Analysis Summary via Gemini AI</strong>
        <div class="interpretation-text">
          ${report.interpretation || 'No AI interpretation available yet. Click "Generate AI Analysis" to create one.'}
        </div>
        ${report.hasInterpretation && report.analyzedColumn ? `
          <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 15px 0;" />
          <p class="analyzed-column-info" style="margin: 10px 0 0 0; font-size: 0.9rem; color: #4a5568;">
            <strong>AI Analyzed Column:</strong> ${report.analyzedColumn}
          </p>
        ` : ''}
      </div>

      ${report.fileInfo ? `
        <div class="file-info">
          <strong>📊 File Information</strong>
          <p><strong>Total Rows:</strong> ${report.fileInfo.total_rows.toLocaleString()}</p>
          <p><strong>Total Columns:</strong> ${report.fileInfo.total_columns}</p>
          <p><strong>Selected Column:</strong> ${report.fileInfo.analyzed_column}</p>
          ${report.fileInfo.available_columns && report.fileInfo.available_columns.length > 1 ? 
            `<p><strong>Available Data Columns:</strong> ${report.fileInfo.available_columns.map(c => c.display_name).join(', ')}</p>` 
            : ''}
          ${report.summary?.is_sampled ? `<p><strong>Note:</strong> Large dataset - showing sample of ${report.summary.original_length.toLocaleString()} records</p>` : ''}
        </div>
      ` : ''}

      <div class="advanced-stats">
        <strong>📈 Advanced Statistics</strong>
        <table class="stats-table">
          <tr>
            <td><strong>Variance:</strong></td>
            <td>${stats.variance.toFixed(2)}</td>
            <td><strong>Range:</strong></td>
            <td>${stats.range.toFixed(2)}</td>
          </tr>
          ${stats.skewness !== undefined ? `
          <tr>
            <td><strong>Skewness:</strong></td>
            <td>${stats.skewness.toFixed(3)}</td>
            <td><strong>Kurtosis:</strong></td>
            <td>${stats.kurtosis.toFixed(3)}</td>
          </tr>
          ` : ''}
          <tr>
            <td><strong>Sum:</strong></td>
            <td>${stats.sum.toFixed(2)}</td>
            <td><strong>Count:</strong></td>
            <td>${stats.count}</td>
          </tr>
        </table>
      </div>

      <div class="data-table-container">
        <strong>📋 Data Table</strong>
        <table class="data-table">
          <thead>
            <tr>${report.tableData.headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${report.tableData.rows.map(row => `
              <tr>${row.map(cell => `<td>${typeof cell === 'number' ? cell.toFixed(2) : cell}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div class="export-options">
        <button class="export-pdf-btn" data-report-id="${report.id}">
          <i class="bi bi-file-pdf"></i> Export as PDF
        </button>
        <button class="export-csv-btn" data-report-id="${report.id}">
          <i class="bi bi-file-spreadsheet"></i> Export as CSV
        </button>
      </div>
    `;

    modal.classList.add("active");
    addExportListeners(report);
  }

  function addExportListeners(report) {
    const csvBtn = document.querySelector('.export-csv-btn');
    if (csvBtn) {
      csvBtn.onclick = () => exportReportAsCSV(report);
    }

    const pdfBtn = document.querySelector('.export-pdf-btn');
    if (pdfBtn) {
      pdfBtn.onclick = () => exportReportAsPDF(report);
    }
  }

  function exportReportAsCSV(report) {
    let csvContent = `Report: ${report.title}\nDate: ${report.date}\nAnalyzed Column: ${report.currentColumn}\n\n`;
    
    csvContent += "Statistics\n";
    csvContent += "Metric,Value\n";
    const stats = report.statistics;
    csvContent += `Mean,${stats.mean.toFixed(2)}\n`;
    csvContent += `Median,${stats.median.toFixed(2)}\n`;
    csvContent += `Mode,${stats.mode.toFixed(2)}\n`;
    csvContent += `Std Dev,${stats.std.toFixed(2)}\n`;
    csvContent += `Min,${stats.min.toFixed(2)}\n`;
    csvContent += `Max,${stats.max.toFixed(2)}\n`;
    csvContent += `Q1,${stats.q1.toFixed(2)}\n`;
    csvContent += `Q3,${stats.q3.toFixed(2)}\n`;
    csvContent += `Variance,${stats.variance.toFixed(2)}\n`;
    csvContent += `Range,${stats.range.toFixed(2)}\n\n`;

    csvContent += "Data Table\n";
    csvContent += report.tableData.headers.join(",") + "\n";
    report.tableData.rows.forEach(row => {
      csvContent += row.map(cell => typeof cell === 'number' ? cell.toFixed(2) : cell).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${report.title.replace(/[^a-z0-9]/gi, '_')}_report.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Report exported as CSV successfully!');
  }

  function exportReportAsPDF(report) {
    const printWindow = window.open('', '_blank');
    const stats = report.statistics;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title} - Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 3px solid #4a90e2; padding-bottom: 10px; }
          h2 { color: #4a90e2; margin-top: 30px; }
          .section { margin: 20px 0; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .chart { max-width: 100%; margin: 20px 0; border: 1px solid #ddd; padding: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .stat-box { border: 1px solid #ddd; padding: 15px; background: #f9f9f9; border-radius: 5px; }
          .stat-box strong { display: block; color: #666; font-size: 12px; margin-bottom: 5px; }
          .stat-box .value { font-size: 24px; font-weight: bold; color: #4a90e2; }
          .metadata { background: #f0f8ff; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0; }
          .interpretation { background: #fffaf0; padding: 15px; border-left: 4px solid #ffa500; margin: 20px 0; line-height: 1.6; }
          @media print { body { padding: 0; } .section { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        
        <div class="metadata">
          <p><strong>Date:</strong> ${report.date}</p>
          <p><strong>Analyzed Column:</strong> ${report.currentColumn}</p>
          <p><strong>Records Processed:</strong> ${report.recordsProcessed.toLocaleString()}</p>
          ${report.fileInfo ? `
            <p><strong>Total Rows:</strong> ${report.fileInfo.total_rows.toLocaleString()}</p>
            <p><strong>Total Columns:</strong> ${report.fileInfo.total_columns}</p>
          ` : ''}
        </div>

        <div class="section">
          <h2>📊 Chart Visualization</h2>
          <img src="${report.chartImage}" class="chart" />
        </div>

        <div class="section">
          <h2>📈 Statistics Summary</h2>
          <div class="stats-grid">
            <div class="stat-box"><strong>Mean</strong><div class="value">${stats.mean.toFixed(2)}</div></div>
            <div class="stat-box"><strong>Median</strong><div class="value">${stats.median.toFixed(2)}</div></div>
            <div class="stat-box"><strong>Mode</strong><div class="value">${stats.mode.toFixed(2)}</div></div>
            <div class="stat-box"><strong>Std Dev</strong><div class="value">${stats.std.toFixed(2)}</div></div>
            <div class="stat-box"><strong>Min</strong><div class="value">${stats.min.toFixed(2)}</div></div>
            <div class="stat-box"><strong>Max</strong><div class="value">${stats.max.toFixed(2)}</div></div>
            <div class="stat-box"><strong>Q1 (25%)</strong><div class="value">${stats.q1.toFixed(2)}</div></div>
            <div class="stat-box"><strong>Q3 (75%)</strong><div class="value">${stats.q3.toFixed(2)}</div></div>
          </div>
        </div>

        <div class="section">
          <h2>🔍 Analysis Interpretation</h2>
          <div class="interpretation">${report.interpretation || 'No interpretation available.'}</div>
        </div>

        <div class="section">
          <h2>📋 Advanced Statistics</h2>
          <table>
            <tr><th>Metric</th><th>Value</th><th>Metric</th><th>Value</th></tr>
            <tr><td><strong>Variance</strong></td><td>${stats.variance.toFixed(2)}</td><td><strong>Range</strong></td><td>${stats.range.toFixed(2)}</td></tr>
            ${stats.skewness !== undefined ? `
            <tr><td><strong>Skewness</strong></td><td>${stats.skewness.toFixed(3)}</td><td><strong>Kurtosis</strong></td><td>${stats.kurtosis.toFixed(3)}</td></tr>
            ` : ''}
            <tr><td><strong>Sum</strong></td><td>${stats.sum.toFixed(2)}</td><td><strong>Count</strong></td><td>${stats.count}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>📋 Data Table (Sample)</h2>
          <table>
            <thead><tr>${report.tableData.headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>
              ${report.tableData.rows.slice(0, 20).map(row => 
                `<tr>${row.map(cell => `<td>${typeof cell === 'number' ? cell.toFixed(2) : cell}</td>`).join("")}</tr>`
              ).join("")}
            </tbody>
          </table>
          ${report.tableData.rows.length > 20 ? `<p><em>Showing first 20 rows of ${report.tableData.rows.length} total rows</em></p>` : ''}
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #888;">
          <p>Generated on ${new Date().toLocaleString()} | Analytics Report System</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    toast.success('Opening print dialog for PDF export...');
  }

  // Close modal
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay") || e.target.classList.contains("close-modal")) {
      const modal = document.getElementById("reportModal");
      if (modal) {
        modal.classList.remove("active");
      }
    }
  });

  // ESC key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("reportModal");
      if (modal && modal.classList.contains("active")) {
        modal.classList.remove("active");
      }
    }
  });

  // Initialize view toggle
  createViewToggle();
  
  // Initial load
  await loadReports();

  // Export global functions
  window.moveToTrash = moveToTrash;
  window.restoreFromTrash = restoreFromTrash;
  window.deletePermanently = deletePermanently;
  window.emptyTrash = emptyTrash;
  window.openReportDetails = openReportDetails;
  window.addExportListeners = addExportListeners;
  window.exportReportAsCSV = exportReportAsCSV;
  window.exportReportAsPDF = exportReportAsPDF;
});