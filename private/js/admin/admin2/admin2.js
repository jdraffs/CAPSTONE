// admin2.js - PART 1: CORE FUNCTIONS & PROFILE DROPDOWN

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
    analyticsContainer.innerHTML = '<div class="analytics-loading"><i class="bi bi-hourglass-split"></i> Loading analytics...</div>';

    const response = await fetch("http://localhost:3000/api/files/data");
    const uploadedFiles = await response.json();

    if (!uploadedFiles || uploadedFiles.length === 0) {
      analyticsContainer.innerHTML = '<div class="analytics-empty"><i class="bi bi-inbox"></i><p>No analytics data available yet. Upload files to generate analytics.</p></div>';
      return;
    }

    const recentFiles = uploadedFiles.slice(0, 3);
    const analyticsResults = [];

    for (let file of recentFiles) {
      const actualFilename = file.filename || file.originalName || file.displayName;
      const displayName = file.displayName || file.originalName || file.filename;
      const chartType = localStorage.getItem(`chartType_${displayName}`) || 'bar';

      try {
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

  analyticsContainer.innerHTML = '';

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

  const viewAllBtn = document.createElement('button');
  viewAllBtn.className = 'view-all-analytics-btn';
  viewAllBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> View All Analytics Reports';
  viewAllBtn.onclick = () => {
    window.location.href = './analyticsReport.html';
  };
  analyticsContainer.appendChild(viewAllBtn);
}

// admin2.js - PART 2: MAIN INITIALIZATION & QUICK ACTIONS MODALS

// MAIN INITIALIZATION - SINGLE DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize profile dropdown FIRST
  initializeProfileDropdown();

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

  // Update summary card counts with real data
  async function updateSummaryCounts() {
    try {
      const response = await fetch('http://localhost:3000/api/dashboard/stats');
      const result = await response.json();

      if (result.success) {
        const stats = result.stats;

        const updatesCard = document.getElementById('totalUpdatesCount');
        if (updatesCard) {
          animateCount(updatesCard, parseInt(updatesCard.textContent) || 0, stats.totalUpdates);
        }

        const reportsCard = document.getElementById('totalReportsCount');
        if (reportsCard) {
          animateCount(reportsCard, parseInt(reportsCard.textContent) || 0, stats.totalReports);
        }

        const repoCard = document.getElementById('totalRepoItemsCount');
        if (repoCard) {
          animateCount(repoCard, parseInt(repoCard.textContent) || 0, stats.totalRepoItems);
        }

        console.log('✅ Dashboard stats updated:', stats);
      } else {
        console.error('Failed to fetch dashboard stats');
      }
    } catch (err) {
      console.error('Error updating summary counts:', err);
    }
  }

  // Animate count from current value to target value
  function animateCount(element, start, end) {
    const duration = 1000;
    const startTime = performance.now();
    const difference = end - start;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuad = progress * (2 - progress);
      const current = Math.floor(start + (difference * easeOutQuad));
      
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = end;
      }
    }
    
    requestAnimationFrame(update);
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
  
  const recentEvents = await fetchRecentEvents(7);
  const allEvents = await fetchRecentEvents(100);
  
  renderEventsList(recentEvents);
  renderModalAll(allEvents);
  await updateSummaryCounts();

  updateRecentUploadsCount();
  loadAnalyticsOverview();

  // auto-refresh every 30 seconds
  setInterval(async () => {
    const freshEvents = await fetchRecentEvents(7);
    renderEventsList(freshEvents);
    await updateSummaryCounts();
  }, 30000);
});


// QUICK ACTIONS MODALS FUNCTIONALITY
(function() {
  const uploadModal = document.getElementById('uploadModal');
  const analyticsModal = document.getElementById('analyticsModal');
  const repositoryModal = document.getElementById('repositoryModal');

  const quickUploadAction = document.getElementById('quickUploadAction');
  const quickAnalyticsAction = document.getElementById('quickAnalyticsAction');
  const quickRepositoryAction = document.getElementById('quickRepositoryAction');

  const quickFileInput = document.getElementById('quickFileInput');
  const quickFileInfo = document.getElementById('quickFileInfo');
  const quickPreviewArea = document.getElementById('quickPreviewArea');
  const quickTablePreview = document.getElementById('quickTablePreview');
  const quickUploadBtn = document.getElementById('quickUploadBtn');

  let selectedQuickFile = null;
  let quickFileData = [];

  function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (quickUploadAction) {
    quickUploadAction.addEventListener('click', () => {
      openModal(uploadModal);
      resetUploadModal();
    });
  }

  if (quickAnalyticsAction) {
    quickAnalyticsAction.addEventListener('click', () => {
      openModal(analyticsModal);
      loadQuickAnalytics();
    });
  }

  if (quickRepositoryAction) {
    quickRepositoryAction.addEventListener('click', () => {
      openModal(repositoryModal);
      loadQuickRepository();
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-modal-overlay') || 
        e.target.classList.contains('quick-modal-close')) {
      closeModal(uploadModal);
      closeModal(analyticsModal);
      closeModal(repositoryModal);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(uploadModal);
      closeModal(analyticsModal);
      closeModal(repositoryModal);
    }
  });

  function resetUploadModal() {
    selectedQuickFile = null;
    quickFileData = [];
    quickFileInput.value = '';
    quickFileInfo.innerHTML = '';
    quickFileInfo.classList.remove('show', 'error');
    quickPreviewArea.style.display = 'none';
    quickTablePreview.innerHTML = '';
    quickUploadBtn.disabled = true;
    quickUploadBtn.innerHTML = '<i class="fa fa-upload"></i> Upload File';
  }

  if (quickFileInput) {
    quickFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectedQuickFile = file;
      const fileSize = (file.size / 1024).toFixed(1);
      
      quickFileInfo.innerHTML = `
        <i class="fa fa-file"></i>
        <strong>${file.name}</strong> (${fileSize} KB)
      `;
      quickFileInfo.classList.add('show');
      quickFileInfo.classList.remove('error');

      const fileName = file.name.toLowerCase();
      
      try {
        if (fileName.endsWith('.csv')) {
          await parseQuickCSV(file);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          await parseQuickExcel(file);
        } else if (fileName.endsWith('.json')) {
          await parseQuickJSON(file);
        } else {
          throw new Error('Unsupported file format');
        }
        
        quickUploadBtn.disabled = false;
      } catch (err) {
        quickFileInfo.innerHTML = `
          <i class="fa fa-exclamation-circle"></i>
          Error: ${err.message}
        `;
        quickFileInfo.classList.add('error');
        quickUploadBtn.disabled = true;
      }
    });
  }

  function parseQuickCSV(file) {
    return new Promise((resolve, reject) => {
      if (typeof Papa === 'undefined') {
        reject(new Error('PapaParse library not loaded'));
        return;
      }

      Papa.parse(file, {
        header: true,
        preview: 5,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            quickFileData = results.data;
            renderQuickPreview(results.data);
            resolve();
          } else {
            reject(new Error('No data found in CSV'));
          }
        },
        error: (err) => reject(err)
      });
    });
  }

  function parseQuickExcel(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') {
        reject(new Error('XLSX library not loaded'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          if (jsonData.length > 0) {
            quickFileData = jsonData.slice(0, 5);
            renderQuickPreview(quickFileData);
            resolve();
          } else {
            reject(new Error('No data found in Excel'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error reading Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  function parseQuickJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const data = Array.isArray(parsed) ? parsed : [parsed];
          
          if (data.length > 0) {
            quickFileData = data.slice(0, 5);
            renderQuickPreview(quickFileData);
            resolve();
          } else {
            reject(new Error('No data found in JSON'));
          }
        } catch (err) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading JSON file'));
      reader.readAsText(file);
    });
  }

  function renderQuickPreview(data) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const table = document.createElement('table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.slice(0, 5).forEach(row => {
      const tr = document.createElement('tr');
      headers.forEach(h => {
        const td = document.createElement('td');
        td.textContent = row[h] ?? '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    quickTablePreview.innerHTML = '';
    quickTablePreview.appendChild(table);
    quickPreviewArea.style.display = 'block';
  }

  if (quickUploadBtn) {
    quickUploadBtn.addEventListener('click', async () => {
      if (!selectedQuickFile) return;

      quickUploadBtn.disabled = true;
      quickUploadBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Uploading...';

      try {
        const adminid = localStorage.getItem('adminid') || '1';
        const formData = new FormData();
        formData.append('file', selectedQuickFile);
        formData.append('adminid', adminid);
        formData.append('folder_id', null);

        const res = await fetch('http://localhost:3000/api/files/upload', {
          method: 'POST',
          body: formData
        });

        const result = await res.json();

        if (result.success) {
          quickFileInfo.innerHTML = `
            <i class="fa fa-check-circle"></i>
            <strong>${selectedQuickFile.name}</strong> uploaded successfully!
          `;
          quickUploadBtn.innerHTML = '<i class="fa fa-check"></i> Uploaded!';
          quickUploadBtn.style.background = '#10b981';

          // Refresh dashboard counts
          setTimeout(async () => {
            await fetchRecentEvents(7);
            await updateSummaryCounts();
            
            setTimeout(() => {
              closeModal(uploadModal);
              toast.success('File uploaded successfully!');
            }, 1500);
          }, 1000);
          setTimeout(() => {
            closeModal(uploadModal);
            alertSystem.success('File uploaded successfully!');
            window.location.reload();
          }, 1500);

        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (err) {
        quickFileInfo.innerHTML = `
          <i class="fa fa-exclamation-circle"></i>
          Upload failed: ${err.message}
        `;
        quickFileInfo.classList.add('error');
        quickUploadBtn.disabled = false;
        quickUploadBtn.innerHTML = '<i class="fa fa-upload"></i> Upload File';
      }
    });
  }

  async function loadQuickAnalytics() {
    const container = document.getElementById('quickAnalyticsContent');
    const PYTHON_API_URL = 'http://localhost:5000/api';

    container.innerHTML = '<div class="loading-state"><i class="fa fa-spinner fa-spin"></i><p>Loading analytics...</p></div>';

    try {
      const response = await fetch('http://localhost:3000/api/files/data');
      const files = await response.json();

      if (!files || files.length === 0) {
        container.innerHTML = '<div class="loading-state"><i class="fa fa-inbox"></i><p>No analytics available yet.</p></div>';
        return;
      }

      const recentFiles = files.slice(0, 3);
      const analyticsCards = [];

      for (let file of recentFiles) {
        const actualFilename = file.file_name || file.filename;
        const displayName = file.file_name || file.filename;
        const chartType = localStorage.getItem(`chartType_${displayName}`) || 'bar';

        try {
          const analyticsResponse = await fetch(`${PYTHON_API_URL}/analytics/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: actualFilename,
              chart_type: chartType
            })
          });

          if (!analyticsResponse.ok) continue;

          const analyticsData = await analyticsResponse.json();

          analyticsCards.push({
            id: file.id,
            filename: actualFilename,
            displayName: displayName,
            chartType: chartType,
            chartImage: analyticsData.chart_image,
            statistics: analyticsData.statistics
          });

        } catch (err) {
          console.error(`Error processing ${actualFilename}:`, err);
        }
      }

      if (analyticsCards.length === 0) {
        container.innerHTML = '<div class="loading-state"><i class="fa fa-exclamation-triangle"></i><p>Failed to load analytics.</p></div>';
        return;
      }

      container.innerHTML = '';

      analyticsCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'quick-analytics-card';
        cardEl.innerHTML = `
          <h4><i class="fa fa-chart-bar"></i> ${card.displayName}</h4>
          
          <div class="chart-preview">
            <img src="${card.chartImage}" alt="Chart">
          </div>

          <div class="chart-controls">
            <select class="quick-chart-type" data-id="${card.id}" data-filename="${card.filename}">
              <option value="bar" ${card.chartType === 'bar' ? 'selected' : ''}>Bar</option>
              <option value="line" ${card.chartType === 'line' ? 'selected' : ''}>Line</option>
              <option value="pie" ${card.chartType === 'pie' ? 'selected' : ''}>Pie</option>
              <option value="histogram" ${card.chartType === 'histogram' ? 'selected' : ''}>Histogram</option>
            </select>
          </div>

          <div class="stats-mini">
            <div class="stat">
              <span class="stat-label">Mean</span>
              <span class="stat-value">${card.statistics.mean.toFixed(2)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Median</span>
              <span class="stat-value">${card.statistics.median.toFixed(2)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Std Dev</span>
              <span class="stat-value">${card.statistics.std.toFixed(2)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Count</span>
              <span class="stat-value">${card.statistics.count}</span>
            </div>
          </div>
        `;
        container.appendChild(cardEl);
      });

    } catch (err) {
      console.error('Error loading quick analytics:', err);
      container.innerHTML = '<div class="loading-state"><i class="fa fa-exclamation-triangle"></i><p>Error loading analytics.</p></div>';
    }
  }

  async function loadQuickRepository() {
    const container = document.getElementById('quickRepoContent');

    container.innerHTML = '<div class="loading-state"><i class="fa fa-spinner fa-spin"></i><p>Loading files...</p></div>';

    try {
      const response = await fetch('http://localhost:3000/api/files/files?all=true');
      const result = await response.json();

      if (!result.success || !result.files || result.files.length === 0) {
        container.innerHTML = '<div class="loading-state"><i class="fa fa-inbox"></i><p>No files in repository.</p></div>';
        return;
      }

      const recentFiles = result.files.slice(0, 5);

      container.innerHTML = '';

      recentFiles.forEach(file => {
        const fileEl = document.createElement('div');
        fileEl.className = 'quick-repo-item';
        
        const fileExt = file.file_name ? file.file_name.split('.').pop().toUpperCase() : 'FILE';
        const uploadDate = new Date(file.created_at).toLocaleDateString();

        fileEl.innerHTML = `
          <div class="file-icon">
            <i class="fa fa-file-${getFileIconType(file.file_name)}"></i>
          </div>
          <div class="file-info">
            <div class="file-name">${file.file_name || 'Unknown'}</div>
            <div class="file-meta">${fileExt} • ${uploadDate}</div>
          </div>
          <div class="file-actions">
            <button class="action-icon-btn" title="Download" onclick="window.downloadQuickFile('${file.file_path}', '${file.file_name}')">
              <i class="fa fa-download"></i>
            </button>
            <button class="action-icon-btn" title="Open in new tab" onclick="window.open('${file.file_path}', '_blank')">
              <i class="fa fa-external-link-alt"></i>
            </button>
            <button class="action-icon-btn" title="Delete" onclick="window.deleteQuickFile(${file.id}, this)">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        `;
        container.appendChild(fileEl);
      });

    } catch (err) {
      console.error('Error loading repository:', err);
      container.innerHTML = '<div class="loading-state"><i class="fa fa-exclamation-triangle"></i><p>Error loading files.</p></div>';
    }
  }

  function getFileIconType(filename) {
    if (!filename) return 'alt';
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      'csv': 'csv',
      'xlsx': 'excel',
      'xls': 'excel',
      'json': 'code',
      'pdf': 'pdf',
      'doc': 'word',
      'docx': 'word'
    };
    return iconMap[ext] || 'alt';
  }

  window.downloadQuickFile = function(filePath, fileName) {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.deleteQuickFile = async function(fileId, btnElement) {
    if (!confirm('Are you sure you want to delete this file?')) return;

    btnElement.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    btnElement.disabled = true;

    try {
      const response = await fetch(`http://localhost:3000/api/files/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

      btnElement.closest('.quick-repo-item').remove();

      const container = document.getElementById('quickRepoContent');
      if (container.children.length === 0) {
        container.innerHTML = '<div class="loading-state"><i class="fa fa-inbox"></i><p>No files in repository.</p></div>';
      }

    } catch (err) {
      toast.error('Failed to delete file: ' + err.message);
      btnElement.innerHTML = '<i class="fa fa-trash"></i>';
      btnElement.disabled = false;
    }
  };

})();
