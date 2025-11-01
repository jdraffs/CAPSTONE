// === HELPER: Logout ===
function logout() {
  window.location.href = '/public/index.html'; // adjust path if needed
}

// === HELPER: Fetch and update total recent uploads ===
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

// === MAIN DOM LOGIC ===
document.addEventListener('DOMContentLoaded', () => {
  // --- NAV HIGHLIGHTING ---
  const navItems = document.querySelectorAll('.nav-item');
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop();

  navItems.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;
    const href = link.getAttribute('href');

    // Case 1: Links with an actual page
    if (href.endsWith('.html')) {
      const linkFile = href.split('/').pop();
      item.classList.toggle('active', linkFile === currentFile);
    }
    // Case 2: Dashboard or hash links
    else if (href.startsWith('#') && currentFile === 'admin2.html') {
      item.classList.toggle('active', href === '#overview');
    }
  });

  // --- TAB SWITCHING ---
  // document.querySelectorAll('.nav-link').forEach(link => {
  //   link.addEventListener('click', e => {
  //     e.preventDefault();

  //     // Update active nav item
  //     document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  //     link.closest('.nav-item').classList.add('active');

  //     // Hide all pages
  //     document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active', 'fade-up'));

  //     // Show selected page
  //     const pageName = link.getAttribute('data-page');
  //     const pageDiv = document.getElementById(pageName + '-page');
  //     if (pageDiv) {
  //       pageDiv.classList.add('active');
  //       void pageDiv.offsetWidth; // trigger reflow for animation
  //       pageDiv.classList.add('fade-up');
  //     }
  //   });
  // });

  // --- MOBILE MENU TOGGLE ---
  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.onclick = () => document.querySelector('.sidebar').classList.toggle('open');
  }

  // --- COUNTERS ---
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

  // --- DATE/TIME ---
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

  // --- RECENT UPLOADS ---
  updateRecentUploadsCount();
});

// START OF ADMIN2.JS CONTENT
const dataFileInput = document.getElementById('dataFileInput');
const fileInfo = document.getElementById('fileInfo');
const tablePreview = document.getElementById('tablePreview');
const loadingSpinner = document.getElementById('loadingSpinner');
const noFileMsg = document.getElementById('noFileMsg');
const generateBtn = document.getElementById('generateVizBtn');

if (dataFileInput) {
  dataFileInput.addEventListener('change', () => {
    const file = dataFileInput.files[0];
    if (!file) return;

  const fileSizeKB = (file.size / 1024).toFixed(1);
  fileInfo.textContent = `File uploaded: ${file.name}, size: ${fileSizeKB} KB`;

  showLoading();

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    parseExcel(file);
  } else if (fileName.endsWith('.json')) {
    parseJSON(file);
  } else {
    hideLoading();
    tablePreview.innerHTML = `<p>Unsupported file format.</p>`;
  }
});

function showLoading() {
  loadingSpinner.style.display = 'block';
  noFileMsg.style.display = 'none';
  tablePreview.querySelectorAll('p:not(#noFileMsg)').forEach(p => p.remove());
}

function hideLoading() {
  loadingSpinner.style.display = 'none';
    const fileSizeKB = (file.size / 1024).toFixed(1);
    fileInfo.textContent = `File uploaded: ${file.name}, size: ${fileSizeKB} KB`;

    showLoading();

    setTimeout(() => {
      hideLoading();
      noFileMsg.style.display = 'none';
      tablePreview.innerHTML = `<p>File "${file.name}" ready for preview.</p>`;
      generateBtn.disabled = false;
    }, 2000);
  };
}

function renderTable(data) {
  hideLoading();
  if (!data || !data.length) {
    tablePreview.innerHTML = '<p>No data found in file.</p>';
    return;
  }

  const table = document.createElement('table');
  table.classList.add('data-table');

  // header
  const headerRow = document.createElement('tr');
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // first few rows
  data.slice(0, 10).forEach(row => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  tablePreview.innerHTML = '';
  tablePreview.appendChild(table);
  generateBtn.disabled = false;
}

//parsers

function parseCSV(file) {
  Papa.parse(file, {
    header: true,
    complete: (results) => renderTable(results.data),
    error: (err) => {
      hideLoading();
      tablePreview.innerHTML = `<p>Error reading CSV: ${err.message}</p>`;
    }
  });
}

function parseExcel(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    renderTable(jsonData);
  };
  reader.onerror = () => {
    hideLoading();
    tablePreview.innerHTML = `<p>Error reading Excel file.</p>`;
  };
  reader.readAsArrayBuffer(file);
}

function parseJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonData = JSON.parse(e.target.result);
      const arrayData = Array.isArray(jsonData) ? jsonData : [jsonData];
      renderTable(arrayData);
    } catch (err) {
      tablePreview.innerHTML = `<p>Error parsing JSON: ${err.message}</p>`;
    } finally {
      hideLoading();
    }
  };
  reader.readAsText(file);
}
