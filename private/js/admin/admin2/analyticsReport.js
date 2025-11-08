//analyticsReport.js
document.addEventListener("DOMContentLoaded", () => {
  const reportsGrid = document.querySelector(".reports-grid");

  if (!reportsGrid || typeof sampleReports === "undefined") {
    console.error("Missing .reports-grid element or sampleReports data");
    return;
  }

  // Render report cards dynamically
  sampleReports.forEach(report => {
    const card = document.createElement("div");
    card.className = "report-card";

    card.innerHTML = `
      <div class="report-header">
        <div>
          <h3>${report.title}</h3>
          <p>${report.metric}</p>
        </div>
      </div>
      <canvas id="chart-${report.id}" class="chart-preview"></canvas>
      <div class="report-meta">
        <span><i class="bi bi-calendar"></i> ${report.date}</span>
        <span><i class="bi bi-database"></i> ${report.recordsProcessed} records</span>
      </div>
      <div class="report-actions">
        <button class="view-btn" data-id="${report.id}">
          <i class="bi bi-eye"></i> View Report
        </button>
        <button class="delete-btn">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;

    reportsGrid.appendChild(card);

    // Create chart preview
    const ctx = document.getElementById(`chart-${report.id}`).getContext("2d");
    new Chart(ctx, {
      type: report.chartType,
      data: report.chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true }
        },
        scales: report.chartType === "bar" || report.chartType === "line"
          ? { y: { beginAtZero: true } }
          : {}
      }
    });
  });

  // 🔹 Handle View Report Click (for dynamically generated buttons)
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-btn");
    if (!btn) return;

    const reportId = btn.dataset.id;
    const report = sampleReports.find(r => r.id == reportId);
    if (!report) return;

    openReportDetails(report);
  });

  // 🔹 Function to open report modal
  function openReportDetails(report) {
    const modal = document.getElementById("reportModal");
    if (!modal) {
      alert("Modal not found! Make sure #reportModal is in your HTML.");
      return;
    }

    const reportDetails = modal.querySelector(".report-details");
    if (!reportDetails) return;

    // Chart data for calculations
    const data = report.chartData.datasets[0].data;
    const mean = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2);
    const median = calcMedian(data);
    const mode = calcMode(data);
    const count = data.length;

    // Populate modal
    reportDetails.innerHTML = `
      <h2>${report.title}</h2>
      <canvas id="detailedChart"></canvas>

      <div class="stats-section">
        <div class="stat-card blue"><strong>Mean</strong><p>${mean}</p></div>
        <div class="stat-card green"><strong>Median</strong><p>${median}</p></div>
        <div class="stat-card purple"><strong>Mode</strong><p>${mode}</p></div>
        <div class="stat-card orange"><strong>Count</strong><p>${count}</p></div>
      </div>

      <div class="insight">
        <strong>Trend Interpretation</strong>
        <p>${report.interpretation}</p>
      </div>

      <table class="data-table">
        <thead>
          <tr>${report.tableData.headers.map(h => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${report.tableData.rows.map(row => `
            <tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    `;

    // Show modal
    modal.classList.add("active");

    // Render detailed chart
    const ctx = document.getElementById("detailedChart").getContext("2d");
    new Chart(ctx, {
      type: report.chartType,
      data: report.chartData,
      options: { responsive: true, plugins: { legend: { display: true } } }
    });
  }

  // 🔹 Close modal when clicking overlay or close button
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay") || e.target.classList.contains("close-modal")) {
      document.getElementById("reportModal").classList.remove("active");
    }
  });

  // 🔹 Helper functions
  function calcMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
  }

  function calcMode(arr) {
    const freq = {};
    arr.forEach(n => (freq[n] = (freq[n] || 0) + 1));
    const max = Math.max(...Object.values(freq));
    const modes = Object.keys(freq).filter(n => freq[n] === max);
    return modes.join(", ");
  }
});
