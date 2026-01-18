// certificates.js - Admin Dashboard

const ADMIN_ID = 1; // Replace with actual admin ID from session
const ADMIN_NAME = 'AdminMila'; // Replace with actual admin name from session

let currentFilters = {
  status: 'all',
  certificateType: 'all',
  search: ''
};

let currentRequestId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadStatistics();
  loadRequests();
  initializeEventListeners();
  initializeProfileDropdown();
});

// Event Listeners
function initializeEventListeners() {
  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilters.status = e.currentTarget.dataset.status;
      loadRequests();
    });
  });

  // Certificate type filter
  document.getElementById('certificateTypeFilter').addEventListener('change', (e) => {
    currentFilters.certificateType = e.target.value;
    loadRequests();
  });

  // Search
  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentFilters.search = e.target.value;
      loadRequests();
    }, 500);
  });

  // Close modals
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('requestModal').classList.remove('show');
  });

  document.getElementById('closeCertificateModal').addEventListener('click', () => {
    document.getElementById('certificatePreviewModal').classList.remove('show');
  });

  // Print certificate
  document.getElementById('printCertificateBtn').addEventListener('click', printCertificate);
  
  // Mark as printed
  document.getElementById('markAsPrintedBtn').addEventListener('click', markAsPrinted);
}

// Load Statistics
async function loadStatistics() {
  try {
    const response = await fetch('/api/certificate-requests/admin/stats');
    const data = await response.json();

    if (data.success) {
      const stats = data.stats;
      document.getElementById('pendingCount').textContent = stats.pending_count || 0;
      document.getElementById('generatedCount').textContent = stats.generated_count || 0;
      document.getElementById('printedCount').textContent = stats.printed_count || 0;
      document.getElementById('releasedCount').textContent = stats.released_count || 0;
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// Load Requests
async function loadRequests() {
  try {
    const params = new URLSearchParams({
      status: currentFilters.status,
      certificateType: currentFilters.certificateType,
      search: currentFilters.search
    });

    const response = await fetch(`/api/certificate-requests/admin/requests?${params}`);
    const data = await response.json();

    if (data.success) {
      renderRequestsTable(data.requests);
    }
  } catch (error) {
    console.error('Error loading requests:', error);
    showToast('Failed to load requests', 'error');
  }
}

// Render Requests Table
function renderRequestsTable(requests) {
  const tbody = document.getElementById('requestsTableBody');

  if (!requests || requests.length === 0) {
    tbody.innerHTML = `
      <tr class="no-data">
        <td colspan="8">
          <div class="empty-state">
            <i class="fa-solid fa-certificate"></i>
            <p>No certificate requests found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = requests.map(req => `
    <tr>
      <td><strong>${req.request_number}</strong></td>
      <td>${req.full_name}</td>
      <td>${req.student_number}</td>
      <td class="cert-type">${formatCertificateType(req.certificate_type)}</td>
      <td>${req.course} ${req.year_level}</td>
      <td>${formatDate(req.created_at)}</td>
      <td>${renderStatusBadge(req.status)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action btn-view" onclick="viewRequestDetails(${req.id})">
            <i class="fa-solid fa-eye"></i> View
          </button>
          ${renderActionButton(req)}
          <button class="btn-action btn-delete" onclick="deleteRequest(${req.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render Action Button based on status
function renderActionButton(req) {
  switch (req.status) {
    case 'pending':
      return `<button class="btn-action btn-generate" onclick="generateCertificate(${req.id})">
        <i class="fa-solid fa-file-circle-plus"></i> Generate
      </button>`;
    case 'generated':
      return `<button class="btn-action btn-print" onclick="previewCertificate(${req.id})">
        <i class="fa-solid fa-print"></i> Print
      </button>`;
    case 'printed':
      return `<button class="btn-action btn-success" onclick="releaseRequest(${req.id})">
        <i class="fa-solid fa-check-double"></i> Release
      </button>`;
    default:
      return '';
  }
}

// View Request Details
async function viewRequestDetails(id) {
  try {
    const response = await fetch(`/api/certificate-requests/admin/request/${id}`);
    const data = await response.json();

    if (data.success) {
      renderRequestModal(data.request, data.activityLogs);
      document.getElementById('requestModal').classList.add('show');
    }
  } catch (error) {
    console.error('Error loading request details:', error);
    showToast('Failed to load request details', 'error');
  }
}

// Render Request Modal
function renderRequestModal(request, logs) {
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Request Number</span>
        <span class="detail-value"><strong>${request.request_number}</strong></span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Status</span>
        ${renderStatusBadge(request.status)}
      </div>
      <div class="detail-item">
        <span class="detail-label">Student Name</span>
        <span class="detail-value">${request.full_name}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Student Number</span>
        <span class="detail-value">${request.student_number}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Course</span>
        <span class="detail-value">${request.course}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Year & Section</span>
        <span class="detail-value">${request.year_level} ${request.section || ''}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Campus</span>
        <span class="detail-value">${request.campus}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Certificate Type</span>
        <span class="detail-value">${formatCertificateType(request.certificate_type)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Contact Email</span>
        <span class="detail-value">${request.contact_email || 'N/A'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Contact Number</span>
        <span class="detail-value">${request.contact_number || 'N/A'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Date Submitted</span>
        <span class="detail-value">${formatDateTime(request.created_at)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Certificate Issued</span>
        <span class="detail-value">${request.certificate_issued_date ? formatDate(request.certificate_issued_date) : 'Not yet'}</span>
      </div>
      <div class="detail-item detail-full">
        <span class="detail-label">Reason for Request</span>
        <span class="detail-value reason">${request.reason}</span>
      </div>
      ${request.admin_remarks ? `
        <div class="detail-item detail-full">
          <span class="detail-label">Admin Remarks</span>
          <span class="detail-value">${request.admin_remarks}</span>
        </div>
      ` : ''}
    </div>

    ${logs && logs.length > 0 ? `
      <div class="activity-logs">
        <h3><i class="fa-solid fa-clock-rotate-left"></i> Activity Logs</h3>
        ${logs.map(log => `
          <div class="log-item">
            <div class="log-action">${log.action.toUpperCase()}</div>
            <div class="log-details">
              By: ${log.performed_by}
              ${log.remarks ? ` - ${log.remarks}` : ''}
            </div>
            <div class="log-time">${formatDateTime(log.created_at)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="modal-actions">
      ${request.status === 'pending' ? `
        <button class="btn btn-primary" onclick="generateCertificate(${request.id}); document.getElementById('requestModal').classList.remove('show');">
          <i class="fa-solid fa-file-circle-plus"></i> Generate Certificate
        </button>
      ` : ''}
      ${request.status === 'generated' ? `
        <button class="btn btn-primary" onclick="previewCertificate(${request.id}); document.getElementById('requestModal').classList.remove('show');">
          <i class="fa-solid fa-print"></i> Print Certificate
        </button>
      ` : ''}
      ${request.status === 'printed' ? `
        <button class="btn btn-success" onclick="releaseRequest(${request.id}); document.getElementById('requestModal').classList.remove('show');">
          <i class="fa-solid fa-check-double"></i> Mark as Released
        </button>
      ` : ''}
      <button class="btn btn-danger" onclick="deleteRequest(${request.id}); document.getElementById('requestModal').classList.remove('show');">
        <i class="fa-solid fa-trash"></i> Delete Request
      </button>
    </div>
  `;
}

// Generate Certificate
async function generateCertificate(id) {
  if (!confirm('Generate certificate for this request?')) return;

  try {
    const response = await fetch(`/api/certificate-requests/admin/generate/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: ADMIN_ID, adminName: ADMIN_NAME })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Certificate generated successfully', 'success');
      loadStatistics();
      loadRequests();
    } else {
      showToast(data.message || 'Failed to generate certificate', 'error');
    }
  } catch (error) {
    console.error('Error generating certificate:', error);
    showToast('Failed to generate certificate', 'error');
  }
}

// Preview Certificate
async function previewCertificate(id) {
  try {
    const response = await fetch(`/api/certificate-requests/admin/request/${id}`);
    const data = await response.json();

    if (data.success) {
      currentRequestId = id;
      renderCertificatePreview(data.request);
      document.getElementById('certificatePreviewModal').classList.add('show');
    }
  } catch (error) {
    console.error('Error loading certificate preview:', error);
    showToast('Failed to load certificate preview', 'error');
  }
}

// Render Certificate Preview
function renderCertificatePreview(request) {
  const certContent = document.getElementById('certificateContent');
  const certType = request.certificate_type === 'no_id' ? 'Certificate of No ID' : 'ID Fill-Out Certificate';

  certContent.innerHTML = `
    <div class="cert-header">
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
        <img src="/public/assets/images/PUPLogo.webp" alt="PUP Logo" style="width: 80px; height: 80px;">
        <div>
          <div class="cert-title">Polytechnic University of the Philippines</div>
          <div class="cert-subtitle">Parañaque Campus</div>
        </div>
      </div>
    </div>

    <div class="cert-body">
      <div class="cert-type-title">${certType}</div>
      
      <div class="cert-to-whom">To Whom It May Concern:</div>
      
      <p style="text-align: justify; margin: 20px 40px; line-height: 1.8;">
        This is to certify that <strong style="text-decoration: underline;">${request.full_name}</strong>, 
        Student Number <strong>${request.student_number}</strong>, 
        enrolled in <strong>${request.course}</strong>, 
        Year Level <strong>${request.year_level}</strong> 
        ${request.section ? `, Section <strong>${request.section}</strong>` : ''} 
        at the Polytechnic University of the Philippines - Parañaque Campus.
      </p>

      ${request.certificate_type === 'no_id' ? `
        <p style="text-align: justify; margin: 20px 40px; line-height: 1.8;">
          This certification is being issued upon the student's request for the purpose of:
        </p>
        <p style="text-align: justify; margin: 20px 60px; line-height: 1.8; font-style: italic;">
          "${request.reason}"
        </p>
        <p style="text-align: justify; margin: 20px 40px; line-height: 1.8;">
          The student has confirmed that they currently do not have possession of their official student ID card.
        </p>
      ` : `
        <p style="text-align: justify; margin: 20px 40px; line-height: 1.8;">
          This certification is being issued for ID-related purposes as requested by the student for:
        </p>
        <p style="text-align: justify; margin: 20px 60px; line-height: 1.8; font-style: italic;">
          "${request.reason}"
        </p>
      `}

      <p style="text-align: justify; margin: 20px 40px; line-height: 1.8;">
        Issued this <strong>${formatDate(new Date())}</strong> 
        at the Polytechnic University of the Philippines, Parañaque Campus.
      </p>
    </div>

    <div class="cert-footer">
      <div class="cert-signature-block">
        <div class="cert-signature-line"></div>
        <div class="cert-signature-name">Administrator Name</div>
        <div class="cert-signature-title">Office Administrator</div>
      </div>
      
      <div class="cert-signature-block">
        <div class="cert-signature-line"></div>
        <div class="cert-signature-name">Campus Director</div>
        <div class="cert-signature-title">PUP Parañaque Campus</div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #999;">
      Reference No: ${request.request_number}
    </div>
  `;
}

// Print Certificate
function printCertificate() {
  window.print();
}

// Mark as Printed
async function markAsPrinted() {
  if (!currentRequestId) return;

  try {
    const response = await fetch(`/api/certificate-requests/admin/print/${currentRequestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: ADMIN_ID, adminName: ADMIN_NAME })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Certificate marked as printed', 'success');
      document.getElementById('certificatePreviewModal').classList.remove('show');
      loadStatistics();
      loadRequests();
      currentRequestId = null;
    } else {
      showToast(data.message || 'Failed to mark as printed', 'error');
    }
  } catch (error) {
    console.error('Error marking as printed:', error);
    showToast('Failed to mark as printed', 'error');
  }
}

// Release Request
async function releaseRequest(id) {
  const remarks = prompt('Enter release remarks (optional):');
  if (remarks === null) return; // User cancelled

  try {
    const response = await fetch(`/api/certificate-requests/admin/release/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        adminId: ADMIN_ID, 
        adminName: ADMIN_NAME,
        remarks: remarks || 'Certificate released to student'
      })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Certificate marked as released', 'success');
      loadStatistics();
      loadRequests();
    } else {
      showToast(data.message || 'Failed to mark as released', 'error');
    }
  } catch (error) {
    console.error('Error releasing request:', error);
    showToast('Failed to mark as released', 'error');
  }
}

// Delete Request
async function deleteRequest(id) {
  if (!confirm('Are you sure you want to delete this certificate request? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/certificate-requests/admin/delete/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showToast('Certificate request deleted successfully', 'success');
      loadStatistics();
      loadRequests();
    } else {
      showToast(data.message || 'Failed to delete request', 'error');
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    showToast('Failed to delete request', 'error');
  }
}

// Utility Functions
function formatCertificateType(type) {
  return type === 'no_id' ? 'Certificate of No ID' : 'ID Fill-Out Certificate';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderStatusBadge(status) {
  const icons = {
    pending: 'clock',
    generated: 'file-circle-check',
    printed: 'print',
    released: 'check-double'
  };

  return `<span class="status-badge ${status}">
    <i class="fa-solid fa-${icons[status]}"></i> ${status}
  </span>`;
}

function showToast(message, type = 'info') {
  // Implement toast notification
  // You can use your existing toast system or create a simple one
  alert(message); // Replace with actual toast implementation
}