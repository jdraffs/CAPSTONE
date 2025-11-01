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
});

// START OF ADMIN2.JS CONTENT
window.addEventListener('DOMContentLoaded', () => {
  if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => console.log('XLSX loaded dynamically');
    document.body.appendChild(script);
  }
});


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
    setTimeout(() => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      renderTable(jsonData);
    }, 800); 
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


// FILE UPLOAD + PREVIEW 
const fileInput = document.getElementById("excelFile");

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    setTimeout(() => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      renderTable(jsonData);
      generateBtn.disabled = false; //Para maenable yung "Generate Visualization"
    }, 800);
  };

  reader.readAsArrayBuffer(file);
});

// TABLE RENDERING FUNCTION 
function renderTable(data) {
  if (!data || !data.length) {
    tablePreview.innerHTML = "<p>No data found in the file.</p>";
    return;
  }

  const headers = Object.keys(data[0]);
  const headerHTML = headers.map(h => `<th>${h}</th>`).join("");
  const rowsHTML = data
    .map(row => {
      const cells = headers.map(h => `<td>${row[h] ?? ""}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  tablePreview.innerHTML = `
    <table class="preview-table">
      <thead><tr>${headerHTML}</tr></thead>
      <tbody>${rowsHTML}</tbody>
    </table>
  `;
}

// START NG CHART GENERATION 
generateBtn.addEventListener("click", () => {
  const table = tablePreview.querySelector("table");
  if (!table) {
    alert("Please upload a file first.");
    return;
  }

  // extract headers & rows
  const headers = Array.from(table.querySelectorAll("th")).map(th => th.textContent);
  const rows = Array.from(table.querySelectorAll("tr"))
    .slice(1)
    .map(tr => Array.from(tr.querySelectorAll("td")).map(td => td.textContent));

  if (!headers.length || !rows.length) {
    alert("No data available to visualize.");
    return;
  }

  // detect numeric columns
  const numericCols = headers.filter((_, colIndex) =>
    rows.every(row => !isNaN(parseFloat(row[colIndex])) && row[colIndex] !== "")
  );

  if (numericCols.length === 0) {
    alert("No numeric columns found for chart visualization.");
    return;
  }

  // use first numeric column for chart data
  const valueColIndex = headers.indexOf(numericCols[0]);
  const labels = rows.map(row => row[0]); // first column = labels
  const values = rows.map(row => parseFloat(row[valueColIndex]));

  // clear previous chart
  const vizArea = document.getElementById("visualizationArea");
  vizArea.innerHTML = '<canvas id="dataChart"></canvas>';

  //draw chart
  const ctx = document.getElementById("dataChart").getContext("2d");
  new Chart(ctx, {
    type: "bar", // pwedeng palitan ng line or pie
    data: {
      labels: labels,
      datasets: [
        {
          label: `${numericCols[0]} (Preview)`,
          data: values,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: "Generated Data Visualization",
          font: { size: 16 },
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
});
