//dataUploads.js
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
  const uploadBtn = document.getElementById("uploadBtn");
  const vizArea = document.getElementById("visualizationArea");
  const chartTypeSelect = document.getElementById("chartTypeSelect");

  let jsonData = [];
  let selectedFile = null;
  let uploadedFileId = null;

  // === File Input Handler (Preview + Auto Visualization) ===
  if (dataFileInput) {
    dataFileInput.addEventListener("change", async () => {
      const file = dataFileInput.files[0];
      if (!file) {
        resetUI();
        return;
      }

      selectedFile = file;
      const fileSizeKB = (file.size / 1024).toFixed(1);
      fileInfo.innerHTML = `
        <i class="fa fa-file"></i>
        <strong>${file.name}</strong> (${fileSizeKB} KB) - Ready to upload
      `;
      
      showLoading();

      const fileName = file.name.toLowerCase();

      // Generate preview based on file type
      if (fileName.endsWith(".csv")) parseCSV(file);
      else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) parseExcel(file);
      else if (fileName.endsWith(".json")) parseJSON(file);
      else {
        hideLoading();
        tablePreview.innerHTML = `<p class="error-msg">⚠️ Unsupported file format. Please upload CSV, Excel, or JSON.</p>`;
        uploadBtn.disabled = true;
      }
    });
  }

  // === Chart Type Change Handler ===
  if (chartTypeSelect) {
    chartTypeSelect.addEventListener("change", () => {
      if (jsonData.length > 0) {
        generateVisualization();
      }
    });
  }

  // === Upload Button Handler ===
  if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
      if (!selectedFile) {
        alert("Please choose a file first!");
        return;
      }

      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Uploading...';

      try {
        const adminid = localStorage.getItem("adminid") || "1";
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("adminid", adminid);
        formData.append("folder_id", null);

        const res = await fetch("http://localhost:3000/api/files/upload", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        
        if (result.success) {
          uploadedFileId = result.file.id;
          console.log("✅ File uploaded to DB, ID:", uploadedFileId);
          
          fileInfo.innerHTML = `
            <i class="fa fa-check-circle" style="color: #10b981;"></i>
            <strong>${selectedFile.name}</strong> uploaded successfully!
          `;

          uploadBtn.innerHTML = '<i class="fa fa-check"></i> Uploaded Successfully';
          uploadBtn.style.background = "#10b981";
          
          showNotification("File uploaded successfully!", "success");
        } else {
          throw new Error(result.message || "Upload failed");
        }
      } catch (err) {
        console.error("Upload error:", err);
        fileInfo.innerHTML = `
          <i class="fa fa-exclamation-circle" style="color: #ef4444;"></i>
          Upload failed: ${err.message}
        `;
        
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fa fa-upload"></i> Upload File';
        
        showNotification("Upload failed. Please try again.", "error");
      }
    });
  }

  function resetUI() {
    selectedFile = null;
    jsonData = [];
    uploadedFileId = null;
    fileInfo.textContent = "";
    tablePreview.innerHTML = '<p id="noFileMsg">No file selected yet.</p>';
    vizArea.innerHTML = '<p>No visualization yet.</p>';
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fa fa-upload"></i> Upload File';
    uploadBtn.style.background = "";
  }

  function showLoading() {
    loadingSpinner.style.display = "block";
    noFileMsg.style.display = "none";
    uploadBtn.disabled = false;
  }

  function hideLoading() {
    loadingSpinner.style.display = "none";
  }

  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fa ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
      ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // === RENDER TABLE ===
  function renderTable(data) {
    hideLoading();
    
    if (!data || !data.length) {
      tablePreview.innerHTML = "<p class='error-msg'>⚠️ No data found in the file.</p>";
      uploadBtn.disabled = true;
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
    const previewRows = Math.min(data.length, 50);
    data.slice(0, previewRows).forEach((row) => {
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
    
    // Add row count info
    if (data.length > 50) {
      const rowInfo = document.createElement("div");
      rowInfo.className = "row-info";
      rowInfo.textContent = `Showing ${previewRows} of ${data.length} rows (preview limited to first 50 rows)`;
      tablePreview.appendChild(rowInfo);
    }

    uploadBtn.disabled = false;
    
    // Automatically generate visualization
    generateVisualization();
  }

  // === GENERATE VISUALIZATION ===
  function generateVisualization() {
    if (jsonData.length === 0) return;

    const headers = Object.keys(jsonData[0]);
    const numericCols = headers.filter((h) =>
      jsonData.every((row) => !isNaN(parseFloat(row[h])) && row[h] !== "")
    );

    if (numericCols.length === 0) {
      vizArea.innerHTML = '<p class="error-msg">⚠️ No numeric columns found for visualization.</p>';
      return;
    }

    const valueCol = numericCols[0];
    const labelCol = headers[0];
    const labels = jsonData.map((row) => row[labelCol]);
    const values = jsonData.map((row) => parseFloat(row[valueCol]));

    vizArea.innerHTML = '<canvas id="dataChart" style="height: 400px;"></canvas>';
    const ctx = document.getElementById("dataChart").getContext("2d");

    if (window.currentChart) {
      window.currentChart.destroy();
    }

    const chartType = chartTypeSelect?.value || "bar";

    // Maroon color scheme to match your theme
    const maroonPalette = [
      "rgba(139, 0, 0, 0.7)",    // Dark red
      "rgba(178, 34, 34, 0.7)",  // Firebrick
      "rgba(220, 20, 60, 0.7)",  // Crimson
      "rgba(205, 92, 92, 0.7)",  // Indian red
      "rgba(240, 128, 128, 0.7)", // Light coral
      "rgba(233, 150, 122, 0.7)", // Dark salmon
    ];

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(139, 0, 0, 0.4)");
    gradient.addColorStop(1, "rgba(139, 0, 0, 0.05)");

    const dataset = {
      label: valueCol,
      data: values,
      borderWidth: 2,
      tension: 0.4,
      fill: chartType === "line",
      borderRadius: 6,
      backgroundColor: chartType === "line" ? gradient : maroonPalette.slice(0, values.length),
      borderColor: chartType === "line" ? "#8b0000" : maroonPalette.slice(0, values.length),
      pointBackgroundColor: "#8b0000",
      pointRadius: 4,
      pointHoverRadius: 6,
    };

    window.currentChart = new Chart(ctx, {
      type: chartType,
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 15, right: 15, bottom: 10, left: 10 } },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `${valueCol} Visualization`,
            color: "#1f2937",
            font: { size: 16, weight: "600", family: "'Inter', sans-serif" },
            padding: { bottom: 10 },
          },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.8)",
            bodyFont: { size: 12 },
            cornerRadius: 4,
            padding: 8,
          },
        },
        scales: chartType === "pie" ? {} : {
          x: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#6b7280", font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#6b7280", font: { size: 11 } },
          },
        },
        elements: {
          bar: { borderRadius: 8 },
          line: { borderJoinStyle: "round" },
        },
        animation: { duration: 800, easing: "easeOutCubic" },
      },
    });
  }

  // === PARSERS ===
  function parseCSV(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: false,
      dynamicTyping: false,
      complete: (results) => {
        let data = results.data;

        const allHeaders = new Set();
        data.forEach(row => {
          Object.keys(row).forEach(key => {
            allHeaders.add(key.trim());
          });
        });

        const headerArray = Array.from(allHeaders);

        const normalizedData = data.map(row => {
          const cleanRow = {};
          headerArray.forEach(h => {
            cleanRow[h] = row[h] ?? "";
          });
          return cleanRow;
        });

        renderTable(normalizedData);
      },
      error: (err) => {
        hideLoading();
        tablePreview.innerHTML = `<p class="error-msg">❌ Error reading CSV: ${err.message}</p>`;
        uploadBtn.disabled = true;
      }
    });
  }

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];

          const parsed = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: false
          });

          renderTable(parsed);
        } catch (err) {
          hideLoading();
          tablePreview.innerHTML = `<p class="error-msg">❌ Error parsing Excel: ${err.message}</p>`;
          uploadBtn.disabled = true;
        }
      }, 300);
    };
    reader.onerror = () => {
      hideLoading();
      tablePreview.innerHTML = "<p class='error-msg'>❌ Error reading Excel file.</p>";
      uploadBtn.disabled = true;
    };
    reader.readAsArrayBuffer(file);
  }

  function parseJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];

        const allKeys = new Set();
        arr.forEach(obj => {
          Object.keys(obj).forEach(k => allKeys.add(k.trim()));
        });

        const keyArray = Array.from(allKeys);

        const normalized = arr.map(obj => {
          const clean = {};
          keyArray.forEach(k => {
            clean[k] = obj[k] ?? "";
          });
          return clean;
        });

        renderTable(normalized);
      } catch (err) {
        hideLoading();
        tablePreview.innerHTML = `<p class="error-msg">❌ Error parsing JSON: ${err.message}</p>`;
        uploadBtn.disabled = true;
      }
    };
    reader.readAsText(file);
  }
});