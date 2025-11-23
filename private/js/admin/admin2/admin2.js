// admin2.js 
// HELPER: Logout
function logout() {
  window.location.href = '/public/index.html'; 
}

// HELPER: Fetch and update total recent uploads 
async function updateRecentUploadsCount() {
  try {
    const response = await fetch('http://localhost:3000/api/recent-uploads');
    const data = await response.json();

    if (data.success) {
      const countElement = document.getElementById('recentUploadsCount');
      if (countElement) {
        countElement.textContent = data.totalRecentUploads;
      }
    } else {
      console.error('Failed to fetch recent uploads:', data.message);
    }
  } catch (err) {
    console.error('Error fetching recent uploads:', err);
  }
}

// HELPER: Load analytics overview from fileRepository data
async function loadAnalyticsOverview() {
  const PYTHON_API_URL = "http://localhost:5000/api";
  const analyticsContainer = document.getElementById('analyticsOverviewContainer');
  
  if (!analyticsContainer) {
    console.warn('Analytics overview container not found');
    return;
  }

  try {
    // Show loading state
    analyticsContainer.innerHTML = '<div class="analytics-loading"><i class="bi bi-hourglass-split"></i> Loading analytics...</div>';

    // Fetch uploaded files from file repository
    const response = await fetch("http://localhost:3000/api/files/data");
    const uploadedFiles = await response.json();

    if (!uploadedFiles || uploadedFiles.length === 0) {
      analyticsContainer.innerHTML = '<div class="analytics-empty"><i class="bi bi-inbox"></i><p>No analytics data available yet. Upload files to generate analytics.</p></div>';
      return;
    }

    // Process analytics for the most recent files (limit to 3 for overview)
    const recentFiles = uploadedFiles.slice(0, 3);
    const analyticsResults = [];

    for (let file of recentFiles) {
      const actualFilename = file.filename || file.originalName || file.displayName;
      const displayName = file.displayName || file.originalName || file.filename;
      const chartType = localStorage.getItem(`chartType_${displayName}`) || 'bar';

      try {
        // Call Python API for analytics processing
        const analyticsResponse = await fetch(`${PYTHON_API_URL}/analytics/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: actualFilename,
            chart_type: chartType
          })
        });

        if (!analyticsResponse.ok) {
          throw new Error(`HTTP error! status: ${analyticsResponse.status}`);
        }

        const analyticsData = await analyticsResponse.json();

        analyticsResults.push({
          title: displayName || 'Dataset',
          date: new Date(file.uploaded_at).toLocaleDateString(),
          statistics: analyticsData.statistics,
          chartImage: analyticsData.chart_image,
          recordsProcessed: analyticsData.statistics.count
        });

      } catch (error) {
        console.error(`Error processing ${actualFilename}:`, error);
      }
    }

    // Render analytics overview
    renderAnalyticsOverview(analyticsResults);

  } catch (err) {
    console.error('Error loading analytics overview:', err);
    analyticsContainer.innerHTML = '<div class="analytics-error"><i class="bi bi-exclamation-triangle"></i><p>Failed to load analytics. Please try again.</p></div>';
  }
}

// HELPER: Render analytics overview cards
function renderAnalyticsOverview(analyticsResults) {
  const analyticsContainer = document.getElementById('analyticsOverviewContainer');
  
  if (!analyticsContainer || analyticsResults.length === 0) {
    analyticsContainer.innerHTML = '<div class="analytics-empty"><i class="bi bi-inbox"></i><p>No analytics available.</p></div>';
    return;
  }

  // Clear container
  analyticsContainer.innerHTML = '';

  // Create analytics summary stats at the top
  const totalRecords = analyticsResults.reduce((sum, result) => sum + result.recordsProcessed, 0);
  const avgMean = analyticsResults.reduce((sum, result) => sum + result.statistics.mean, 0) / analyticsResults.length;

  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'analytics-summary';
  summaryDiv.innerHTML = `
    <div class="summary-stat">
      <i class="bi bi-bar-chart-fill"></i>
      <div>
        <h4>${analyticsResults.length}</h4>
        <p>Active Datasets</p>
      </div>
    </div>
    <div class="summary-stat">
      <i class="bi bi-database-fill"></i>
      <div>
        <h4>${totalRecords.toLocaleString()}</h4>
        <p>Total Records</p>
      </div>
    </div>
    <div class="summary-stat">
      <i class="bi bi-calculator-fill"></i>
      <div>
        <h4>${avgMean.toFixed(2)}</h4>
        <p>Average Mean</p>
      </div>
    </div>
  `;
  analyticsContainer.appendChild(summaryDiv);

  // Create grid for analytics cards
  const gridDiv = document.createElement('div');
  gridDiv.className = 'analytics-grid';

  analyticsResults.forEach((result, index) => {
    const card = document.createElement('div');
    card.className = 'analytics-card';
    card.innerHTML = `
      <div class="analytics-card-header">
        <div>
          <h3>${result.title}</h3>
          <p class="analytics-date"><i class="bi bi-calendar3"></i> ${result.date}</p>
        </div>
        <span class="analytics-badge">${result.recordsProcessed} records</span>
      </div>
      
      <div class="analytics-chart-preview">
        <img src="${result.chartImage}" alt="Chart Preview" />
      </div>
      
      <div class="analytics-stats-mini">
        <div class="stat-item">
          <span class="stat-label">Mean</span>
          <span class="stat-value">${result.statistics.mean.toFixed(2)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Median</span>
          <span class="stat-value">${result.statistics.median.toFixed(2)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Std Dev</span>
          <span class="stat-value">${result.statistics.std.toFixed(2)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Range</span>
          <span class="stat-value">${result.statistics.range.toFixed(2)}</span>
        </div>
      </div>
    `;
    
    gridDiv.appendChild(card);
  });

  analyticsContainer.appendChild(gridDiv);

  // Add "View All Analytics" button
  const viewAllBtn = document.createElement('button');
  viewAllBtn.className = 'view-all-analytics-btn';
  viewAllBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> View All Analytics Reports';
  viewAllBtn.onclick = () => {
    window.location.href = './analyticsReport.html';
  };
  analyticsContainer.appendChild(viewAllBtn);
}

// MAIN DOM LOGIC
document.addEventListener('DOMContentLoaded', () => {
  // NAV HIGHLIGHTING 
  const navItems = document.querySelectorAll('.nav-item');
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop();

  navItems.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;
    const href = link.getAttribute('href');

    // case 1: links with an actual page
    if (href.endsWith('.html')) {
      const linkFile = href.split('/').pop();
      item.classList.toggle('active', linkFile === currentFile);
    }
    // case 2: dashboard or hash links
    else if (href.startsWith('#') && currentFile === 'admin2.html') {
      item.classList.toggle('active', href === '#overview');
    }
  });

  // MOBILE MENU TOGGLE 
  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.onclick = () => document.querySelector('.sidebar').classList.toggle('open');
  }

  // COUNTERS 
  const counters = document.querySelectorAll('.card-number');
  counters.forEach(counter => {
    const updateCount = () => {
      const target = +counter.getAttribute('data-count');
      const current = +counter.innerText;
      const increment = Math.ceil(target / 100);
      if (current < target) {
        counter.innerText = Math.min(current + increment, target);
        setTimeout(updateCount, 20);
      } else {
        counter.innerText = target;
      }
    };
    updateCount();
  });

  // DATE/TIME 
  function updateDateTime() {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    };
    const formatted = now.toLocaleString('en-US', options);
    const dt = document.getElementById('datetime');
    if (dt) dt.textContent = formatted;
  }
  setInterval(updateDateTime, 1000);
  updateDateTime();

  // RECENT UPLOADS 
  updateRecentUploadsCount();

  // LOAD ANALYTICS OVERVIEW
  loadAnalyticsOverview();
});

// Recent Updates Modal 
const updatesModal = document.getElementById("updatesModal");
const viewAllUpdatesBtn = document.getElementById("viewAllUpdatesBtn");
const closeUpdatesBtn = document.querySelector(".updates-close");
const updatesModalTableBody = document.getElementById("updatesModalTableBody");

if (viewAllUpdatesBtn) {
  viewAllUpdatesBtn.addEventListener("click", () => {
    const tableRows = document.querySelectorAll(".updates-table tbody tr");
    updatesModalTableBody.innerHTML = "";
    tableRows.forEach(row => {
      updatesModalTableBody.innerHTML += row.outerHTML;
    });
    updatesModal.style.display = "flex";
  });
}

if (closeUpdatesBtn) {
  closeUpdatesBtn.addEventListener("click", () => {
    updatesModal.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === updatesModal) {
    updatesModal.style.display = "none";
  }
});