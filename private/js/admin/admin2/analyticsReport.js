//analyticsReport.js - Enhanced with search, filter, export, and working summary cards - PART 1
document.addEventListener("DOMContentLoaded", async () => {
  const reportsGrid = document.querySelector(".reports-grid");
  const searchInput = document.querySelector(".search-input");
  const filterSelect = document.querySelector(".filter-select");
  const exportAllBtn = document.querySelector(".export-btn");
  const PYTHON_API_URL = "http://localhost:5000/api";

  // Fetch uploaded files (data repository)
  let uploadedFiles = [];
  let reports = [];
  let filteredReports = [];

  try {
    const response = await fetch("http://localhost:3000/api/files/data");
    uploadedFiles = await response.json();
  } catch (err) {
    console.error("Error fetching file data:", err);
  }

  if (!reportsGrid || uploadedFiles.length === 0) {
    console.warn("No uploaded data found or missing grid element");
    reportsGrid.innerHTML = "<p>No analytics available yet. Upload a file to generate reports.</p>";
    updateSummaryCards([], uploadedFiles);
    return;
  }

  // Show loading state
  reportsGrid.innerHTML = "<p>Loading analytics with Python processing...</p>";

  // Batch process all files with Python backend
  for (let index = 0; index < uploadedFiles.length; index++) {
    const file = uploadedFiles[index];
    
    const actualFilename = file.filename || file.originalName || file.displayName;
    const displayName = file.displayName || file.originalName || file.filename;
    
    const chartType = localStorage.getItem(`chartType_${displayName}`) || file.chart_type || "bar";
    
    try {
      const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: actualFilename,
          chart_type: chartType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analyticsData = await response.json();

      reports.push({
        id: index + 1,
        file_id: file.id,
        title: displayName || `Report ${index + 1}`,
        actualFilename: actualFilename,
        metric: file.type || "Uploaded Dataset",
        date: new Date(file.uploaded_at).toLocaleDateString(),
        uploadedAt: new Date(file.uploaded_at),
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
        fileExtension: actualFilename.split('.').pop().toUpperCase()
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
        recordsProcessed: 0,
        chartType: chartType,
        error: error.message,
        fileExtension: actualFilename.split('.').pop().toUpperCase()
      });
    }
  }

  // Update summary cards with actual data
  updateSummaryCards(reports, uploadedFiles);

  // Initialize filtered reports
  filteredReports = [...reports];

  // Clear loading state and render reports
  renderReports(filteredReports);

  // Search functionality
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    applyFilters(searchTerm, filterSelect.value);
  });

  // Filter functionality
  filterSelect.addEventListener("change", (e) => {
    const searchTerm = searchInput.value.toLowerCase();
    applyFilters(searchTerm, e.target.value);
  });

  // Export All functionality
  exportAllBtn.addEventListener("click", () => {
    exportAllReports(reports);
  });

  function applyFilters(searchTerm, fileType) {
    filteredReports = reports.filter(report => {
      // Search filter
      const matchesSearch = !searchTerm || 
        report.title.toLowerCase().includes(searchTerm) ||
        report.currentColumn.toLowerCase().includes(searchTerm) ||
        report.metric.toLowerCase().includes(searchTerm);

      // File type filter
      const matchesType = fileType === "All Types" || 
        report.fileExtension === fileType;

      return matchesSearch && matchesType;
    });

    renderReports(filteredReports);
  }

  function updateSummaryCards(reportsList, filesList) {
    // Total Reports
    const totalReportsCard = document.querySelector(".summary-card:nth-child(1) .summary-value");
    if (totalReportsCard) {
      totalReportsCard.textContent = reportsList.length;
    }

    // Total Records Tracked
    const totalRecords = reportsList.reduce((sum, report) => {
      return sum + (report.recordsProcessed || 0);
    }, 0);
    const totalRecordsCard = document.querySelector(".summary-card:nth-child(2) .summary-value");
    const totalRecordsLabel = document.querySelector(".summary-card:nth-child(2) .summary-label");
    if (totalRecordsCard) {
      totalRecordsCard.textContent = totalRecords.toLocaleString();
    }
    if (totalRecordsLabel) {
      totalRecordsLabel.textContent = "Total Records Tracked";
    }

    // Most Recent Report
    const mostRecentReport = reportsList.sort((a, b) => 
      b.uploadedAt - a.uploadedAt
    )[0];
    const recentReportCard = document.querySelector(".summary-card:nth-child(3) .summary-value");
    if (recentReportCard && mostRecentReport) {
      recentReportCard.textContent = mostRecentReport.title.length > 20 
        ? mostRecentReport.title.substring(0, 20) + "..." 
        : mostRecentReport.title;
    }

    // Average Records per Report
    const avgRecords = reportsList.length > 0 
      ? Math.round(totalRecords / reportsList.length) 
      : 0;
    const avgCard = document.querySelector(".summary-card:nth-child(4) .summary-value");
    const avgLabel = document.querySelector(".summary-card:nth-child(4) .summary-label");
    if (avgCard) {
      avgCard.textContent = avgRecords.toLocaleString();
    }
    if (avgLabel) {
      avgLabel.textContent = "Avg Records per Report";
    }
  }

  function exportAllReports(reportsList) {
    if (reportsList.length === 0) {
      toast.warning("No reports available to export.");
      return;
    }

    // Create CSV content
    let csvContent = "Report Title,File Type,Date Uploaded,Records Processed,Current Column,Mean,Median,Std Dev,Min,Max\n";

    reportsList.forEach(report => {
      if (!report.error) {
        const stats = report.statistics;
        csvContent += `"${report.title}",${report.fileExtension},${report.date},${report.recordsProcessed},"${report.currentColumn}",${stats.mean.toFixed(2)},${stats.median.toFixed(2)},${stats.std.toFixed(2)},${stats.min.toFixed(2)},${stats.max.toFixed(2)}\n`;
      }
    });

    // Create download link
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
      reportsGrid.innerHTML = "<p>No reports match your search criteria.</p>";
      return;
    }

    reportsList.forEach(report => {
      const card = document.createElement("div");
      card.className = "report-card";

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

      // Build column selector if multiple columns available
      let columnSelector = '';
      if (report.availableColumns && report.availableColumns.length > 1) {
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

      card.innerHTML = `
        <div class="report-header">
          <div>
            <h3>${report.title}</h3>
            <p>${report.metric}</p>
            <p class="current-column-display"><strong>Analyzing:</strong> ${report.currentColumn}</p>
          </div>
        </div>
        ${columnSelector}
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
          <button class="view-btn" data-id="${report.id}">
            <i class="bi bi-eye"></i> View Full Report
          </button>
          <button class="refresh-btn" data-id="${report.id}" data-filename="${report.actualFilename || report.title}">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
          <button class="delete-btn" data-file-id="${report.file_id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;

      reportsGrid.appendChild(card);
    });

    // Re-attach event listeners for dynamically created elements
    attachCardEventListeners();
  }
  // PART 2 - Event Listeners and Helper Functions

  function attachCardEventListeners() {
    // Handle column selection changes
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
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: report.actualFilename || report.title,
              chart_type: report.chartType,
              column: selectedColumn
            })
          });

          if (!response.ok) {
            throw new Error('Failed to load column data');
          }

          const analyticsData = await response.json();
          
          chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;
          
          report.chartImage = analyticsData.chart_image;
          report.statistics = analyticsData.statistics;
          report.interpretation = analyticsData.interpretation;
          report.tableData = analyticsData.table_data;
          report.currentColumn = analyticsData.file_info.analyzed_column;

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

        } catch (error) {
          console.error('Error loading column data:', error);
          chartContainer.innerHTML = originalContent;
          toast.error('Failed to load data for selected column. Please try again.');
        }
      });
    });

    // Handle chart type changes
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
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: report.actualFilename || report.title,
              chart_type: selectedType,
              column: selectedColumn
            })
          });

          if (!response.ok) {
            throw new Error('Failed to regenerate chart');
          }

          const analyticsData = await response.json();
          
          chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;
          
          report.chartImage = analyticsData.chart_image;
          report.chartType = selectedType;
          report.statistics = analyticsData.statistics;
          report.interpretation = analyticsData.interpretation;

          localStorage.setItem(`chartType_${report.title}`, selectedType);

        } catch (error) {
          console.error('Error regenerating chart:', error);
          chartContainer.innerHTML = originalContent;
          toast.error('Failed to regenerate chart. Please try again.');
        }
      });
    });
  }

  // Handle delete button
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    const fileId = btn.dataset.fileId;
    
    if (!fileId) {
      toast.error("Error: File ID not found");
      return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this file permanently? This action cannot be undone.");
    if (!confirmDelete) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i>';

    try {
      const response = await fetch(`http://localhost:3000/api/files/files/${fileId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      toast.warning("File permanently deleted.");
      
      // Remove from reports array
      reports = reports.filter(r => r.file_id != fileId);
      filteredReports = filteredReports.filter(r => r.file_id != fileId);
      
      // Update summary cards
      updateSummaryCards(reports, uploadedFiles);
      
      // Re-render
      renderReports(filteredReports);
      
      if (reports.length === 0) {
        reportsGrid.innerHTML = "<p>No analytics available yet. Upload a file to generate reports.</p>";
      }

    } catch (error) {
      console.error("Error deleting permanently:", error);
      toast.error(`Failed to delete file: ${error.message}`);
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash"></i>';
    }
  });

  // Handle refresh button
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".refresh-btn");
    if (!btn) return;

    const reportId = btn.dataset.id;
    const filename = btn.dataset.filename;
    const report = reports.find(r => r.id == reportId);
    
    if (!report) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';

    const card = btn.closest(".report-card");
    const columnSelector = card.querySelector(".column-select-dropdown");
    const selectedColumn = columnSelector ? columnSelector.value : null;

    try {
      const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename,
          chart_type: report.chartType,
          column: selectedColumn
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh analytics');
      }

      const analyticsData = await response.json();
      
      Object.assign(report, {
        chartImage: analyticsData.chart_image,
        statistics: analyticsData.statistics,
        interpretation: analyticsData.interpretation,
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
      btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
    }
  });

  // Handle "View Report" click
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-btn");
    if (!btn) return;
    const reportId = btn.dataset.id;
    const report = reports.find(r => r.id == reportId);
    if (report) openReportDetails(report);
  });

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
        <strong>🔍 Analysis Summary</strong>
        <div class="interpretation-text">
          ${report.interpretation}
        </div>
      </div>

      ${report.fileInfo ? `
        <div class="file-info">
          <strong>📊 File Information</strong>
          <p><strong>Total Rows:</strong> ${report.fileInfo.total_rows.toLocaleString()}</p>
          <p><strong>Total Columns:</strong> ${report.fileInfo.total_columns}</p>
          <p><strong>Analyzed Column:</strong> ${report.fileInfo.analyzed_column}</p>
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

    // Add export event listeners
    addExportListeners(report);
  }

  function addExportListeners(report) {
    // Export as CSV
    const csvBtn = document.querySelector('.export-csv-btn');
    if (csvBtn) {
      csvBtn.onclick = () => exportReportAsCSV(report);
    }

    // Export as PDF
    const pdfBtn = document.querySelector('.export-pdf-btn');
    if (pdfBtn) {
      pdfBtn.onclick = () => exportReportAsPDF(report);
    }
  }

  function exportReportAsCSV(report) {
    let csvContent = `Report: ${report.title}\nDate: ${report.date}\nAnalyzed Column: ${report.currentColumn}\n\n`;
    
    // Add statistics
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
    csvContent += `Q3,${stats.q3.toFixed(2)}\n\n`;

    // Add data table
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
  }

  function exportReportAsPDF(report) {
    // Create printable HTML content
    const printWindow = window.open('', '_blank');
    const stats = report.statistics;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title} - Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .chart { max-width: 100%; margin: 20px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-box { border: 1px solid #ddd; padding: 10px; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p><strong>Date:</strong> ${report.date}</p>
        <p><strong>Analyzed Column:</strong> ${report.currentColumn}</p>
        <p><strong>Records Processed:</strong> ${report.recordsProcessed}</p>

        <div class="section">
          <h2>Chart Visualization</h2>
          <img src="${report.chartImage}" class="chart" />
        </div>

        <div class="section">
          <h2>Statistics Summary</h2>
          <div class="stats-grid">
            <div class="stat-box"><strong>Mean:</strong> ${stats.mean.toFixed(2)}</div>
            <div class="stat-box"><strong>Median:</strong> ${stats.median.toFixed(2)}</div>
            <div class="stat-box"><strong>Mode:</strong> ${stats.mode.toFixed(2)}</div>
            <div class="stat-box"><strong>Std Dev:</strong> ${stats.std.toFixed(2)}</div>
            <div class="stat-box"><strong>Min:</strong> ${stats.min.toFixed(2)}</div>
            <div class="stat-box"><strong>Max:</strong> ${stats.max.toFixed(2)}</div>
            <div class="stat-box"><strong>Q1:</strong> ${stats.q1.toFixed(2)}</div>
            <div class="stat-box"><strong>Q3:</strong> ${stats.q3.toFixed(2)}</div>
          </div>
        </div>

        <div class="section">
          <h2>Data Table</h2>
          <table>
            <thead>
              <tr>${report.tableData.headers.map(h => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${report.tableData.rows.map(row => 
                `<tr>${row.map(cell => `<td>${typeof cell === 'number' ? cell.toFixed(2) : cell}</td>`).join("")}</tr>`
              ).join("")}
            </tbody>
          </table>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }

  // Close modal
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay") || e.target.classList.contains("close-modal")) {
      document.getElementById("reportModal").classList.remove("active");
    }
  });
});