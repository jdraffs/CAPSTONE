document.addEventListener("DOMContentLoaded", async () => {
  const reportsGrid = document.querySelector(".reports-grid");
  const PYTHON_API_URL = "http://localhost:5000/api";

  // Fetch uploaded files (data repository)
  let uploadedFiles = [];
  try {
    const response = await fetch("http://localhost:3000/api/files/data");
    uploadedFiles = await response.json();
  } catch (err) {
    console.error("Error fetching file data:", err);
  }

  if (!reportsGrid || uploadedFiles.length === 0) {
    console.warn("No uploaded data found or missing grid element");
    reportsGrid.innerHTML = "<p>No analytics available yet. Upload a file to generate reports.</p>";
    return;
  }

  // Show loading state
  reportsGrid.innerHTML = "<p>Loading analytics with Python processing...</p>";

  // Batch process all files with Python backend
  const reports = [];
  
  for (let index = 0; index < uploadedFiles.length; index++) {
    const file = uploadedFiles[index];
    
    // Use the ACTUAL filename (with timestamp) from the server
    const actualFilename = file.filename || file.originalName || file.displayName;
    const displayName = file.displayName || file.originalName || file.filename;
    
    const chartType = localStorage.getItem(`chartType_${displayName}`) || file.chart_type || "bar";
    
    try {
      // Call Python API for analytics processing
      const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: actualFilename,  // Send ACTUAL filename with timestamp
          chart_type: chartType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analyticsData = await response.json();

      reports.push({
        id: index + 1,
        title: file.filename || `Report ${index + 1}`,
        metric: file.type || "Uploaded Dataset",
        date: new Date(file.uploaded_at).toLocaleDateString(),
        recordsProcessed: analyticsData.statistics.count,
        chartType: chartType,
        chartImage: analyticsData.chart_image,
        statistics: analyticsData.statistics,
        interpretation: analyticsData.interpretation,
        tableData: analyticsData.table_data,
        fileInfo: analyticsData.file_info,
        summary: analyticsData.summary
      });

    } catch (error) {
      console.error(`Error processing ${file.filename}:`, error);
      
      // Fallback to basic report
      reports.push({
        id: index + 1,
        title: file.filename || `Report ${index + 1}`,
        metric: "Error Processing",
        date: new Date(file.uploaded_at).toLocaleDateString(),
        recordsProcessed: 0,
        chartType: chartType,
        error: error.message
      });
    }
  }

  // Clear loading state
  reportsGrid.innerHTML = "";

  // Render dynamic reports
  reports.forEach(report => {
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

    card.innerHTML = `
      <div class="report-header">
        <div>
          <h3>${report.title}</h3>
          <p>${report.metric}</p>
        </div>
      </div>
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
        <button class="refresh-btn" data-id="${report.id}" data-filename="${report.title}">
          <i class="bi bi-arrow-clockwise"></i> Refresh
        </button>
        <button class="delete-btn">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;

    reportsGrid.appendChild(card);
  });

  // Handle chart type changes
  document.querySelectorAll(".chart-type-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const reportId = e.target.id.split("-")[1];
      const selectedType = e.target.value;
      const report = reports.find(r => r.id == reportId);
      
      if (!report) return;

      // Show loading indicator
      const card = e.target.closest(".report-card");
      const chartContainer = card.querySelector(".chart-container");
      const originalContent = chartContainer.innerHTML;
      chartContainer.innerHTML = '<p>Regenerating chart...</p>';

      try {
        // Request new chart from Python API
        const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: report.title,
            chart_type: selectedType
          })
        });

        if (!response.ok) {
          throw new Error('Failed to regenerate chart');
        }

        const analyticsData = await response.json();
        
        // Update chart image
        chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;
        
        // Update report data
        report.chartImage = analyticsData.chart_image;
        report.chartType = selectedType;
        report.statistics = analyticsData.statistics;
        report.interpretation = analyticsData.interpretation;

        // Save preference
        localStorage.setItem(`chartType_${report.title}`, selectedType);

      } catch (error) {
        console.error('Error regenerating chart:', error);
        chartContainer.innerHTML = originalContent;
        alert('Failed to regenerate chart. Please try again.');
      }
    });
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

    try {
      const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename,
          chart_type: report.chartType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh analytics');
      }

      const analyticsData = await response.json();
      
      // Update report
      Object.assign(report, {
        chartImage: analyticsData.chart_image,
        statistics: analyticsData.statistics,
        interpretation: analyticsData.interpretation,
        tableData: analyticsData.table_data
      });

      // Update UI
      const card = btn.closest(".report-card");
      const chartContainer = card.querySelector(".chart-container");
      chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;

      // Update quick stats
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

      alert('Analytics refreshed successfully!');

    } catch (error) {
      console.error('Error refreshing analytics:', error);
      alert('Failed to refresh analytics. Please try again.');
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
      alert("Modal not found! Make sure #reportModal exists in your HTML.");
      return;
    }

    const reportDetails = modal.querySelector(".report-details");
    if (!reportDetails) return;

    const stats = report.statistics;

    reportDetails.innerHTML = `
      <h2>${report.title}</h2>
      
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
        <strong>🔍 AI-Powered Interpretation</strong>
        <div class="interpretation-text">
          ${report.interpretation}
        </div>
      </div>

      ${report.fileInfo ? `
        <div class="file-info">
          <strong>📊 File Information</strong>
          <p><strong>Total Rows:</strong> ${report.fileInfo.total_rows}</p>
          <p><strong>Total Columns:</strong> ${report.fileInfo.total_columns}</p>
          <p><strong>Analyzed Column:</strong> ${report.fileInfo.analyzed_column}</p>
          <p><strong>Numeric Columns Available:</strong> ${report.fileInfo.numeric_columns.join(', ')}</p>
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
        <button class="export-pdf-btn" onclick="alert('PDF export feature coming soon!')">
          <i class="bi bi-file-pdf"></i> Export as PDF
        </button>
        <button class="export-csv-btn" onclick="alert('CSV export feature coming soon!')">
          <i class="bi bi-file-spreadsheet"></i> Export as CSV
        </button>
      </div>
    `;

    modal.classList.add("active");
  }

  // Close modal
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay") || e.target.classList.contains("close-modal")) {
      document.getElementById("reportModal").classList.remove("active");
    }
  });
});