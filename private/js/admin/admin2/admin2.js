// admin2.js 
// HELPER: logout
function logout() {
  window.location.href = '/public/index.html'; 
}

// HELPER: fetch and update total recent uploads 
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
    // show loading state
    analyticsContainer.innerHTML = '<div class="analytics-loading"><i class="bi bi-hourglass-split"></i> Loading analytics...</div>';

    // fetch uploaded files from file repository
    const response = await fetch("http://localhost:3000/api/files/data");
    const uploadedFiles = await response.json();

    if (!uploadedFiles || uploadedFiles.length === 0) {
      analyticsContainer.innerHTML = '<div class="analytics-empty"><i class="bi bi-inbox"></i><p>No analytics data available yet. Upload files to generate analytics.</p></div>';
      return;
    }

    // process analytics for the most recent files (limit lang to 3 for overview)
    const recentFiles = uploadedFiles.slice(0, 3);
    const analyticsResults = [];

    for (let file of recentFiles) {
      const actualFilename = file.filename || file.originalName || file.displayName;
      const displayName = file.displayName || file.originalName || file.filename;
      const chartType = localStorage.getItem(`chartType_${displayName}`) || 'bar';

      try {
        // call python API for analytics processing
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

    // render analytics overview
    renderAnalyticsOverview(analyticsResults);

  } catch (err) {
    console.error('Error loading analytics overview:', err);
    analyticsContainer.innerHTML = '<div class="analytics-error"><i class="bi bi-exclamation-triangle"></i><p>Failed to load analytics. Please try again.</p></div>';
  }
}

// HELPER: render analytics overview cards
function renderAnalyticsOverview(analyticsResults) {
  const analyticsContainer = document.getElementById('analyticsOverviewContainer');
  
  if (!analyticsContainer || analyticsResults.length === 0) {
    analyticsContainer.innerHTML = '<div class="analytics-empty"><i class="bi bi-inbox"></i><p>No analytics available.</p></div>';
    return;
  }

  // clear container
  analyticsContainer.innerHTML = '';

  // create analytics summary stats at the top
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

  // create grid for analytics cards
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

  // dinagdag yung "view analytics reports" button
  const viewAllBtn = document.createElement('button');
  viewAllBtn.className = 'view-all-analytics-btn';
  viewAllBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> View All Analytics Reports';
  viewAllBtn.onclick = () => {
    window.location.href = './analyticsReport.html';
  };
  analyticsContainer.appendChild(viewAllBtn);
}

// MAIN INITIALIZATION - SINGLE DOMContentLoaded

document.addEventListener('DOMContentLoaded', async () => {
  // PART 1: BASIC UI SETUP
  
  // NAV HIGHLIGHTING 
  const navItems = document.querySelectorAll('.nav-item');
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop();

  navItems.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;
    const href = link.getAttribute('href');

    if (href.endsWith('.html')) {
      const linkFile = href.split('/').pop();
      item.classList.toggle('active', linkFile === currentFile);
    } else if (href.startsWith('#') && currentFile === 'admin2.html') {
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

  // PART 2: RECENT UPDATES SYSTEM
  
  const updatesTbody = document.querySelector(".updates-table tbody");
  const updatesModalBody = document.getElementById("updatesModalTableBody");
  const viewAllBtn = document.getElementById("viewAllUpdatesBtn");
  const updatesModal = document.getElementById("updatesModal");
  const updatesClose = document.querySelector(".updates-close");

  // fetch recent events from API
  async function fetchRecentEvents(limit = 7) {
    try {
      const res = await fetch(`http://localhost:3000/api/events/recent?limit=${limit}`);
      const json = await res.json();
      return json.success ? json.events : [];
    } catch (e) {
      console.error("Failed to load events:", e);
      return [];
    }
  }

  // convert timestamp to "time ago" format
  function timeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  }

  // get icon HTML based on event type
function getIconForEventType(type) {
  const iconMap = {
    file_upload: '<i class="fa-solid fa-upload updates-icon blue"></i>',
    report_generated: '<i class="fa-solid fa-chart-line updates-icon purple"></i>',
    repo_update: '<i class="fa-solid fa-folder updates-icon orange"></i>',
    
    // NEW:binago q icons
    repo_file_added: '<i class="fa-solid fa-folder-plus updates-icon yellow"></i>',
    repo_file_deleted: '<i class="fa-solid fa-trash updates-icon red"></i>',
    
    chart_created: '<i class="fa-solid fa-chart-simple updates-icon green"></i>',
  };
  return iconMap[type] || '<i class="fa-solid fa-info-circle updates-icon"></i>';
}

  // render events in the dashboard table
  function renderEventsList(events) {
    if (!updatesTbody) return;
    
    updatesTbody.innerHTML = "";
    
    if (events.length === 0) {
      updatesTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No recent updates</td></tr>';
      return;
    }

    events.forEach(event => {
      const tr = document.createElement("tr");
      const icon = getIconForEventType(event.event_type);
      tr.innerHTML = `
        <td>${icon} ${event.title}</td>
        <td>${event.details || ""}</td>
        <td>${timeAgo(event.created_at)}</td>
      `;
      updatesTbody.appendChild(tr);
    });
  }

  // render all events in modal
  function renderModalAll(events) {
    if (!updatesModalBody) return;
    
    updatesModalBody.innerHTML = "";
    
    if (events.length === 0) {
      updatesModalBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No updates available</td></tr>';
      return;
    }

    events.forEach(event => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${event.title}</td>
        <td>${event.details || ""}</td>
        <td>${new Date(event.created_at).toLocaleString()}</td>
      `;
      updatesModalBody.appendChild(tr);
    });
  }

  // update summary card counts
  async function updateSummaryCounts() {
    try {
      // fetch all events for counting
      const allEvents = await fetchRecentEvents(1000);
      
      // count by type
      const fileUploads = allEvents.filter(e => e.event_type === "file_upload").length;
      const reportsGenerated = allEvents.filter(e => e.event_type === "report_generated").length;
      const repoUpdates = allEvents.filter(e => e.event_type === "repo_update").length;

      // update card values (use data-count to trigger animation)
      const datasetsCard = document.querySelector(".summary-card.faculty .card-number");
      const reportsCard = document.querySelector(".summary-card.alumni .card-number");
      const repoCard = document.querySelector(".summary-card.research .card-number");

      if (datasetsCard) {
        datasetsCard.setAttribute('data-count', fileUploads);
        datasetsCard.textContent = '0'; // reset to trigger animation
      }
      if (reportsCard) {
        reportsCard.setAttribute('data-count', reportsGenerated);
        reportsCard.textContent = '0';
      }
      if (repoCard) {
        repoCard.setAttribute('data-count', repoUpdates);
        repoCard.textContent = '0';
      }

      // re-trigger counter animation
      counters.forEach(counter => {
        const updateCount = () => {
          const target = +counter.getAttribute('data-count');
          const current = +counter.innerText;
          const increment = Math.ceil(target / 100) || 1;
          if (current < target) {
            counter.innerText = Math.min(current + increment, target);
            setTimeout(updateCount, 20);
          } else {
            counter.innerText = target;
          }
        };
        updateCount();
      });

    } catch (err) {
      console.error("Failed to update summary counts:", err);
    }
  }

  // modal controls
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
      if (updatesModal) updatesModal.style.display = "flex";
    });
  }

  if (updatesClose) {
    updatesClose.addEventListener("click", () => {
      if (updatesModal) updatesModal.style.display = "none";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === updatesModal) {
      updatesModal.style.display = "none";
    }
  });

  // PART 3: LOAD ALL DATA
  
  // initial load
  const recentEvents = await fetchRecentEvents(7);
  const allEvents = await fetchRecentEvents(100);
  
  renderEventsList(recentEvents);
  renderModalAll(allEvents);
  await updateSummaryCounts();

  // load other dashboard components
  updateRecentUploadsCount();
  loadAnalyticsOverview();

  // optional pero auto-refresh every 30 seconds
  setInterval(async () => {
    const freshEvents = await fetchRecentEvents(7);
    renderEventsList(freshEvents);
    await updateSummaryCounts();
  }, 30000);
});