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

// START OF ADMIN2.JS CLEAN VERSION

window.addEventListener("DOMContentLoaded", () => {
  // === Dynamic XLSX load ===
  if (typeof XLSX === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => console.log("XLSX loaded dynamically");
    document.body.appendChild(script);
  }

  const dataFileInput = document.getElementById("dataFileInput");
  const fileInfo = document.getElementById("fileInfo");
  const tablePreview = document.getElementById("tablePreview");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const noFileMsg = document.getElementById("noFileMsg");
  const generateBtn = document.getElementById("generateVizBtn");
  const vizArea = document.getElementById("visualizationArea");

  let jsonData = [];
  let uploadedFileId = null; // store backend file ID

  // === File Input Handler ===
  if (dataFileInput) {
    dataFileInput.addEventListener("change", async () => {
      const file = dataFileInput.files[0];
      if (!file) return;

      const fileSizeKB = (file.size / 1024).toFixed(1);
      fileInfo.textContent = `Uploading ${file.name}...`;

      showLoading();
      const fileName = file.name.toLowerCase();

      // Upload file to backend
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/data/upload", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        if (result.success) {
          uploadedFileId = result.id;
          console.log("File uploaded to DB, ID:", uploadedFileId);
          fileInfo.textContent = `${file.name} uploaded successfully (${fileSizeKB} KB)`;
        } else {
          console.error("Upload failed:", result.message);
          fileInfo.textContent = "Upload failed.";
        }
      } catch (err) {
        console.error("Upload error:", err);
        fileInfo.textContent = "Server upload failed.";
      }

      // Continue with preview rendering
      if (fileName.endsWith(".csv")) parseCSV(file);
      else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) parseExcel(file);
      else if (fileName.endsWith(".json")) parseJSON(file);
      else {
        hideLoading();
        tablePreview.innerHTML = `<p>Unsupported file format.</p>`;
      }
    });
  }

  function showLoading() {
    loadingSpinner.style.display = "block";
    noFileMsg.style.display = "none";
  }

  function hideLoading() {
    loadingSpinner.style.display = "none";
  }

  // === RENDER TABLE ===
  function renderTable(data) {
    hideLoading();
    if (!data || !data.length) {
      tablePreview.innerHTML = "<p>No data found in the file.</p>";
      generateBtn.disabled = true;
      return;
    }

    jsonData = data;

    const headers = Object.keys(data[0]);
    const table = document.createElement("table");
    table.className = "preview-table";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    headers.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    data.slice(0, 50).forEach((row) => {
      const tr = document.createElement("tr");
      headers.forEach((h) => {
        const td = document.createElement("td");
        td.textContent = row[h] ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    tablePreview.innerHTML = "";
    tablePreview.appendChild(table);

    // Enable visualization button
    generateBtn.disabled = false;
    generateBtn.classList.add("active");
  }

  // === PARSERS ===
  function parseCSV(file) {
    Papa.parse(file, {
      header: true,
      complete: (results) => renderTable(results.data),
      error: (err) => {
        hideLoading();
        tablePreview.innerHTML = `<p>Error reading CSV: ${err.message}</p>`;
      },
    });
  }

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const parsed = XLSX.utils.sheet_to_json(worksheet);
        renderTable(parsed);
      }, 500);
    };
    reader.onerror = () => {
      hideLoading();
      tablePreview.innerHTML = "<p>Error reading Excel file.</p>";
    };
    reader.readAsArrayBuffer(file);
  }

  function parseJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        renderTable(arr);
      } catch (err) {
        tablePreview.innerHTML = `<p>Error parsing JSON: ${err.message}</p>`;
      } finally {
        hideLoading();
      }
    };
    reader.readAsText(file);
  }

  // === CHART GENERATION ===
  generateBtn.addEventListener("click", async () => {
    if (jsonData.length === 0) {
      alert("Please upload and preview a file first.");
      return;
    }

    const headers = Object.keys(jsonData[0]);
    const numericCols = headers.filter((h) =>
      jsonData.every((row) => !isNaN(parseFloat(row[h])) && row[h] !== "")
    );

    if (numericCols.length === 0) {
      alert("No numeric columns found for chart visualization.");
      return;
    }

    // use first numeric column for chart
    const valueCol = numericCols[0];
    const labelCol = headers[0];
    const labels = jsonData.map((row) => row[labelCol]);
    const values = jsonData.map((row) => parseFloat(row[valueCol]));

    vizArea.innerHTML = '<canvas id="dataChart"></canvas>';
    const ctx = document.getElementById("dataChart").getContext("2d");

    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: `${valueCol} (Preview)`,
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

    // Send visualization to backend
    if (uploadedFileId) {
      const response = await fetch("/api/data/visualization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Generated Chart",
          chartType: "bar",
          labels,
          values,
          fileId: uploadedFileId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Visualization saved to DB");
      } else {
        console.error("Failed to save visualization:", result.message);
      }
    } else {
      console.warn("No uploaded file ID to link visualization with");
    }
  });
});
