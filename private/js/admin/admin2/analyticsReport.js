document.addEventListener("DOMContentLoaded", async () => {
  const reportsGrid = document.querySelector(".reports-grid");

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

  // Convert uploaded file data into report-like format
  const reports = uploadedFiles.map((file, index) => {
    // Simulated random dataset for visualization (replace with parsed CSV/Excel values)
    const sampleData = file.data?.map(Number).filter(n => !isNaN(n)) || [5, 8, 12, 6, 10];
    const labels = file.labels || ["A", "B", "C", "D", "E"];

    return {
      id: index + 1,
      title: file.filename || `Report ${index + 1}`,
      metric: file.type || "Uploaded Dataset",
      date: new Date(file.uploaded_at).toLocaleDateString(),
      recordsProcessed: sampleData.length,
      chartType: file.chart_type || localStorage.getItem("lastChartType") || "bar",
      chartData: {
        labels,
        datasets: [
          {
            label: "Data Values",
            data: sampleData,
            backgroundColor: "rgba(100, 149, 237, 0.6)",
            borderColor: "#4682B4",
            borderWidth: 1
          }
        ]
      },
      interpretation: generateInterpretation(sampleData),
      tableData: {
        headers: ["Label", "Value"],
        rows: labels.map((l, i) => [l, sampleData[i]])
      }
    };
  });

  // Render dynamic reports
  reports.forEach(report => {
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

    const data = report.chartData.datasets[0].data;
    const mean = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2);
    const median = calcMedian(data);
    const mode = calcMode(data);
    const count = data.length;

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

    modal.classList.add("active");

    const ctx = document.getElementById("detailedChart").getContext("2d");
    new Chart(ctx, {
      type: report.chartType,
      data: report.chartData,
      options: { responsive: true, plugins: { legend: { display: true } } }
    });
  }

  // Close modal
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay") || e.target.classList.contains("close-modal")) {
      document.getElementById("reportModal").classList.remove("active");
    }
  });

  

  // Helper functions
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

  function generateInterpretation(data) {
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    if (avg > 75) return "The dataset indicates strong upward performance.";
    if (avg > 50) return "The dataset shows moderate and consistent trends.";
    if (avg > 25) return "The dataset reveals fluctuating or developing performance.";
    return "Low averages suggest areas that may need improvement.";
  }
});
