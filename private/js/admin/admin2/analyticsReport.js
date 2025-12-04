//analyticsReport.js
(async function() {
  const reportsGrid = document.querySelector(".reports-grid");
  const PYTHON_API_URL = "http://localhost:5000/api";

  if (!reportsGrid) {
    console.error("Reports grid element not found");
    return;
  }

  // show loading state
  reportsGrid.innerHTML = "<p>Loading analytics with Python processing...</p>";

  //log analytics event helper
  async function logAnalyticsEvent(fileName, fileId) {
    try {
      await fetch("http://localhost:3000/api/analytics/generated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New analytics report generated",
          details: fileName,
          file_id: fileId,
          adminid: localStorage.getItem("adminid") || "unknown"
        })
      });
      console.log(`✅ Logged analytics event for ${fileName}`);
    } catch (err) {
      console.error("Failed to log analytics event:", err);
    }
  }

  let reports = []; 

  try {
    // fetch uploaded files
    const response = await fetch("http://localhost:3000/api/files/data");
    const uploadedFiles = await response.json();

    console.log("📁 Fetched files:", uploadedFiles);

    if (!uploadedFiles || uploadedFiles.length === 0) {
      console.warn("No uploaded data found");
      reportsGrid.innerHTML = "<p>No analytics available yet. Upload a file to generate reports.</p>";
      return;
    }

    // process each file
    for (let index = 0; index < uploadedFiles.length; index++) {
      const file = uploadedFiles[index];

      const actualFilename = file.file_name || file.filename;
      const displayName = file.file_name || file.filename || `Report ${index + 1}`;
      const chartType = localStorage.getItem(`chartType_${displayName}`) || "bar";

      console.log(`🔄 Processing file ${index + 1}/${uploadedFiles.length}:`, actualFilename);

      try {
        const analyticsResponse = await fetch(`${PYTHON_API_URL}/analytics/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: actualFilename,
            chart_type: chartType
          })
        });

        if (!analyticsResponse.ok) {
          const errorText = await analyticsResponse.text();
          console.error(`❌ HTTP ${analyticsResponse.status}:`, errorText);
          throw new Error(`HTTP error! status: ${analyticsResponse.status}`);
        }

        const analyticsData = await analyticsResponse.json();

        // log the event
        await logAnalyticsEvent(displayName, file.id);

        reports.push({
          id: index + 1,
          file_id: file.id,
          title: displayName || `Report ${index + 1}`,
          actualFilename: actualFilename,
          metric: file.file_type || "Uploaded Dataset",
          date: new Date(file.created_at).toLocaleDateString(),
          recordsProcessed: analyticsData.statistics.count,
          chartType: chartType,
          chartImage: analyticsData.chart_image,
          statistics: analyticsData.statistics,
          interpretation: analyticsData.interpretation,
          tableData: analyticsData.table_data,
          fileInfo: analyticsData.file_info,
          summary: analyticsData.summary
        });

        console.log(`✅ Successfully processed ${actualFilename}`);

      } catch (error) {
        console.error(`❌ Error processing ${actualFilename}:`, error);

        reports.push({
          id: index + 1,
          file_id: file.id,
          title: displayName || `Report ${index + 1}`,
          actualFilename: actualFilename,
          metric: "Error Processing",
          date: new Date(file.created_at).toLocaleDateString(),
          recordsProcessed: 0,
          chartType: chartType,
          error: error.message
        });
      }
    }

    // clear loading
    reportsGrid.innerHTML = "";
    console.log(`📊 Generated ${reports.length} reports`);

    // render reports
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
          <button class="refresh-btn" data-id="${report.id}" data-filename="${report.actualFilename}">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
          <button class="delete-btn" data-file-id="${report.file_id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;

      reportsGrid.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading analytics:", err);
    reportsGrid.innerHTML = '<div class="analytics-error"><i class="bi bi-exclamation-triangle"></i><p>Failed to load analytics. Please try again.</p></div>';
  }

// dito mga event handlers
  // delete button handler
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    const fileId = btn.dataset.fileId;
    
    if (!fileId) {
      alert("Error: File ID not found");
      return;
    }

    if (!confirm("Are you sure you want to delete this file permanently?")) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i>';

    try {
      const response = await fetch(`http://localhost:3000/api/files/files/${fileId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      alert("File deleted successfully.");
      btn.closest(".report-card").remove();
      
      if (reportsGrid.children.length === 0) {
        reportsGrid.innerHTML = "<p>No analytics available.</p>";
      }

    } catch (error) {
      console.error("Delete error:", error);
      alert(`Failed to delete: ${error.message}`);
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash"></i>';
    }
  });

  // chart type change handler
  document.addEventListener("change", async (e) => {
    if (!e.target.classList.contains("chart-type-select")) return;

    const reportId = e.target.id.split("-")[1];
    const selectedType = e.target.value;
    const report = reports.find(r => r.id == reportId);
    
    if (!report) return;

    const card = e.target.closest(".report-card");
    const chartContainer = card.querySelector(".chart-container");
    const originalContent = chartContainer.innerHTML;
    chartContainer.innerHTML = '<p>Regenerating chart...</p>';

    try {
      const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: report.actualFilename,
          chart_type: selectedType
        })
      });

      if (!response.ok) throw new Error('Failed to regenerate');

      const analyticsData = await response.json();
      
      chartContainer.innerHTML = `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;
      
      report.chartImage = analyticsData.chart_image;
      report.chartType = selectedType;
      report.statistics = analyticsData.statistics;

      localStorage.setItem(`chartType_${report.title}`, selectedType);

    } catch (error) {
      console.error('Regenerate error:', error);
      chartContainer.innerHTML = originalContent;
      alert('Failed to regenerate chart.');
    }
  });

  // refresh button handler
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".refresh-btn");
    if (!btn) return;

    const reportId = btn.dataset.id;
    const filename = btn.dataset.filename;
    const report = reports.find(r => r.id == reportId);
    
    if (!report) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i>';

    try {
      const response = await fetch(`${PYTHON_API_URL}/analytics/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename,
          chart_type: report.chartType
        })
      });

      if (!response.ok) throw new Error('Refresh failed');

      const analyticsData = await response.json();
      
      Object.assign(report, {
        chartImage: analyticsData.chart_image,
        statistics: analyticsData.statistics,
        interpretation: analyticsData.interpretation
      });

      const card = btn.closest(".report-card");
      card.querySelector(".chart-container").innerHTML = 
        `<img src="${analyticsData.chart_image}" alt="Chart" class="chart-preview-img" />`;

      card.querySelector(".quick-stats").innerHTML = `
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

      alert('Refreshed successfully!');

    } catch (error) {
      console.error('Refresh error:', error);
      alert('Failed to refresh.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
    }
  });

  // view button handler
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-btn");
    if (!btn) return;
    
    const reportId = btn.dataset.id;
    const report = reports.find(r => r.id == reportId);
    if (report) openReportDetails(report);
  });

  // modal function
  function openReportDetails(report) {
    const modal = document.getElementById("reportModal");
    if (!modal) {
      alert("Modal not found!");
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
        <div class="stat-card blue"><strong>Mean</strong><p>${stats.mean.toFixed(2)}</p></div>
        <div class="stat-card green"><strong>Median</strong><p>${stats.median.toFixed(2)}</p></div>
        <div class="stat-card purple"><strong>Mode</strong><p>${stats.mode.toFixed(2)}</p></div>
        <div class="stat-card orange"><strong>Std Dev</strong><p>${stats.std.toFixed(2)}</p></div>
        <div class="stat-card red"><strong>Min</strong><p>${stats.min.toFixed(2)}</p></div>
        <div class="stat-card teal"><strong>Max</strong><p>${stats.max.toFixed(2)}</p></div>
        <div class="stat-card yellow"><strong>Q1</strong><p>${stats.q1.toFixed(2)}</p></div>
        <div class="stat-card pink"><strong>Q3</strong><p>${stats.q3.toFixed(2)}</p></div>
      </div>

      <div class="insight">
        <strong>🔍 Analysis Summary</strong>
        <div class="interpretation-text">${report.interpretation}</div>
      </div>

      ${report.fileInfo ? `
        <div class="file-info">
          <strong>📊 File Information</strong>
          <p><strong>Total Rows:</strong> ${report.fileInfo.total_rows.toLocaleString()}</p>
          <p><strong>Total Columns:</strong> ${report.fileInfo.total_columns}</p>
          <p><strong>Analyzed Column:</strong> ${report.fileInfo.analyzed_column}</p>
        </div>
      ` : ''}

      <div class="advanced-stats">
        <strong>📈 Advanced Statistics</strong>
        <table class="stats-table">
          <tr>
            <td><strong>Variance:</strong></td><td>${stats.variance.toFixed(2)}</td>
            <td><strong>Range:</strong></td><td>${stats.range.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Sum:</strong></td><td>${stats.sum.toFixed(2)}</td>
            <td><strong>Count:</strong></td><td>${stats.count}</td>
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
            ${report.tableData.rows.slice(0, 50).map(row => `
              <tr>${row.map(cell => `<td>${typeof cell === 'number' ? cell.toFixed(2) : cell}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    modal.classList.add("active");
  }

  // close modal 
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay") || e.target.classList.contains("close-modal")) {
      document.getElementById("reportModal")?.classList.remove("active");
    }
  });

})(); 