// certificates.js - Admin Dashboard

// Get admin data from localStorage
function getAdminData() {
  const adminData = localStorage.getItem('adminData');
  if (adminData) {
    try {
      return JSON.parse(adminData);
    } catch (e) {
      console.error('Error parsing admin data:', e);
    }
  }
  
  // Fallback: try to get from old storage method
  const adminid = localStorage.getItem('adminid');
  return {
    id: null, // Will be fetched from server if needed
    adminid: adminid || 'Unknown',
    roleName: 'Administrator'
  };
}

const ADMIN_DATA = getAdminData();
const ADMIN_ID = ADMIN_DATA.id;
const ADMIN_NAME = ADMIN_DATA.adminid;

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

  // Custom alert OK button
  document.getElementById('alertOkBtn').addEventListener('click', () => {
    document.getElementById('customAlertModal').classList.remove('show');
  });

  // Close prompt modal
  document.getElementById('closePromptModal').addEventListener('click', () => {
    document.getElementById('customPromptModal').classList.remove('show');
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
    case 'released':
      return `<span class="status-badge released" style="padding: 8px 14px;">
        <i class="fa-solid fa-check-circle"></i> Completed
      </span>`;
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
      ${request.status === 'generated' || request.status === 'printed' || request.status === 'released' ? `
        <button class="btn btn-primary" onclick="previewCertificate(${request.id}); document.getElementById('requestModal').classList.remove('show');">
          <i class="fa-solid fa-eye"></i> View Certificate
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
  const confirmed = await showCustomConfirm(
    'Generate certificate for this request?',
    'Generate Certificate'
  );
  
  if (!confirmed) return;

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
      
      // Update button visibility based on status
      const markAsPrintedBtn = document.getElementById('markAsPrintedBtn');
      if (data.request.status === 'generated') {
        markAsPrintedBtn.style.display = 'inline-flex';
      } else {
        markAsPrintedBtn.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error loading certificate preview:', error);
    showToast('Failed to load certificate preview', 'error');
  }
}

// Render Certificate Preview
function renderCertificatePreview(request) {
  const certContent = document.getElementById('certificateContent');
  const currentDate = formatDate(new Date());
  const courseName = getFullCourseName(request.course);
  
  if (request.certificate_type === 'no_id') {
    // Certificate of No ID format
    certContent.innerHTML = `
      <div class="cert-header">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <img src="/public/assets/images/PUPLogo.webp" alt="PUP Logo" style="width: 80px; height: 80px;">
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 14px; font-weight: normal;">Republic of the Philippines</div>
            <div style="font-size: 16px; font-weight: bold; margin: 5px 0;">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</div>
            <div style="font-size: 13px; font-weight: normal;">Office of the Vice President for Campuses</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">PARAÑAQUE CITY CAMPUS</div>
          </div>
          <img src="/public/assets/images/bagong-pilipinas-logo.png" alt="Bagong Pilipinas" style="width: 80px; height: 80px;" onerror="this.style.display='none'">
        </div>
      </div>

      <div style="text-align: right; margin: 20px 40px 40px; font-size: 14px;">
        ${currentDate}
      </div>

      <div class="cert-body" style="text-align: center;">
        <div style="font-size: 22px; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">
          CERTIFICATION OF NO ID
        </div>
        
        <div style="text-align: justify; margin: 30px 60px; line-height: 2; font-size: 15px;">
          <p style="text-indent: 50px; margin-bottom: 20px;">
            This is to certify that the school ID of <strong>${request.full_name}</strong>, 
            a <strong>${courseName}</strong> student, this first semester of Academic Year 2025-2026 
            is not yet released.
          </p>
          
          <p style="text-indent: 50px;">
            This certification is issued upon the request of the school, <strong>${request.full_name}</strong>, 
            or any legal purpose this may serve.
          </p>
        </div>
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <div style="display: inline-block; text-align: center;">
          <div style="width: 250px; border-top: 2px solid #000; margin: 0 auto 5px;"></div>
          <div style="font-weight: bold; font-size: 14px;">MILA JOY J. MARTINEZ</div>
          <div style="font-size: 13px; color: #333;">Head, Student Affairs and Services</div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: left; margin-left: 40px; font-size: 12px; font-style: italic;">
        Not Valid without School Seal
      </div>

      <div class="cert-footer" style="margin-top: 40px; border-top: 2px solid #000; padding-top: 15px;">
        <div style="font-size: 11px; text-align: center; line-height: 1.6;">
          PUP Parañaque Campus, Col. E de Leon St. Wawa, Brgy. Sto. Nino, Parañaque city<br/>
          Direct line: (02) 8553 8623 | Website: www.pup.edu.ph | Email: paranaque@pup.edu.ph<br/>
          Inquiries: <a href="https://bit.ly/PUPSINTA" style="color: #822020;">https://bit.ly/PUPSINTA</a>
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 13px; font-weight: bold;">
          THE COUNTRY'S 1<sup>st</sup> POLYTECHNICU
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #999;">
        Reference No: ${request.request_number}
      </div>
    `;
  } else if (request.certificate_type === 'recommendation_scholarship') {
    // Recommendation Letter for Scholarship
    certContent.innerHTML = `
      <div class="cert-header">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <img src="/public/assets/images/PUPLogo.webp" alt="PUP Logo" style="width: 80px; height: 80px;">
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 14px; font-weight: normal;">Republic of the Philippines</div>
            <div style="font-size: 16px; font-weight: bold; margin: 5px 0;">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</div>
            <div style="font-size: 13px; font-weight: normal;">Office of the Vice President for Campuses</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">PARAÑAQUE CITY CAMPUS</div>
          </div>
          <img src="/public/assets/images/bagong-pilipinas-logo.png" alt="Bagong Pilipinas" style="width: 80px; height: 80px;" onerror="this.style.display='none'">
        </div>
      </div>

      <div style="text-align: right; margin: 20px 40px 40px; font-size: 14px;">
        ${currentDate}
      </div>

      <div class="cert-body">
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 30px; text-align: center;">
          LETTER OF RECOMMENDATION
        </div>
        
        <div style="margin: 30px 40px; line-height: 1.8; font-size: 14px;">
          <p style="margin-bottom: 20px;">To Whom It May Concern:</p>
          
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            This is to certify that <strong>${request.full_name}</strong>, 
            Student Number <strong>${request.student_number}</strong>, 
            is a bonafide student of Polytechnic University of the Philippines - Parañaque Campus, 
            currently enrolled in <strong>${courseName}</strong>, 
            <strong>${request.year_level}</strong>.
          </p>
          
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            ${request.full_name} has demonstrated commendable academic performance and exemplary conduct 
            throughout their studies at our institution. Based on their academic record and character, 
            we recommend this student for scholarship consideration.
          </p>
          
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            Purpose: ${request.reason}
          </p>
          
          <p style="text-align: justify; text-indent: 40px;">
            This letter is issued upon the student's request for scholarship application purposes.
          </p>
        </div>
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <div style="display: inline-block; text-align: center;">
          <div style="width: 250px; border-top: 2px solid #000; margin: 0 auto 5px;"></div>
          <div style="font-weight: bold; font-size: 14px;">MILA JOY J. MARTINEZ</div>
          <div style="font-size: 13px; color: #333;">Head, Student Affairs and Services</div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: left; margin-left: 40px; font-size: 12px; font-style: italic;">
        Not Valid without School Seal
      </div>

      <div class="cert-footer" style="margin-top: 40px; border-top: 2px solid #000; padding-top: 15px;">
        <div style="font-size: 11px; text-align: center; line-height: 1.6;">
          PUP Parañaque Campus, Col. E de Leon St. Wawa, Brgy. Sto. Nino, Parañaque city<br/>
          Direct line: (02) 8553 8623 | Website: www.pup.edu.ph | Email: paranaque@pup.edu.ph<br/>
          Inquiries: <a href="https://bit.ly/PUPSINTA" style="color: #822020;">https://bit.ly/PUPSINTA</a>
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 13px; font-weight: bold;">
          THE COUNTRY'S 1<sup>st</sup> POLYTECHNICU
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #999;">
        Reference No: ${request.request_number}
      </div>
    `;
  } else if (request.certificate_type === 'recommendation_abroad') {
    // Recommendation Letter for Abroad
    certContent.innerHTML = `
      <div class="cert-header">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <img src="/public/assets/images/PUPLogo.webp" alt="PUP Logo" style="width: 80px; height: 80px;">
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 14px; font-weight: normal;">Republic of the Philippines</div>
            <div style="font-size: 16px; font-weight: bold; margin: 5px 0;">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</div>
            <div style="font-size: 13px; font-weight: normal;">Office of the Vice President for Campuses</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">PARAÑAQUE CITY CAMPUS</div>
          </div>
          <img src="/public/assets/images/bagong-pilipinas-logo.png" alt="Bagong Pilipinas" style="width: 80px; height: 80px;" onerror="this.style.display='none'">
        </div>
      </div>

      <div style="text-align: right; margin: 20px 40px 40px; font-size: 14px;">
        ${currentDate}
      </div>

      <div class="cert-body">
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 30px; text-align: center;">
          LETTER OF RECOMMENDATION
        </div>
        
        <div style="margin: 30px 40px; line-height: 1.8; font-size: 14px;">
          <p style="margin-bottom: 20px;">To Whom It May Concern:</p>
          
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            This letter serves to certify that <strong>${request.full_name}</strong>, 
            Student Number <strong>${request.student_number}</strong>, 
            is a bonafide student in good standing at Polytechnic University of the Philippines - Parañaque Campus, 
            pursuing a degree in <strong>${courseName}</strong>, 
            currently in <strong>${request.year_level}</strong>.
          </p>
          
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            Throughout their academic journey at our institution, ${request.full_name} has consistently 
            demonstrated strong academic performance, dedication to their studies, and exemplary character. 
            They have shown the maturity, responsibility, and adaptability that would serve them well in 
            an international educational or professional setting.
          </p>
          
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            Purpose: ${request.reason}
          </p>
          
          <p style="text-align: justify; text-indent: 40px;">
            This letter of recommendation is issued in support of the student's application for 
            international opportunities. We believe they would be an excellent representative of 
            our institution and country.
          </p>
        </div>
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <div style="display: inline-block; text-align: center;">
          <div style="width: 250px; border-top: 2px solid #000; margin: 0 auto 5px;"></div>
          <div style="font-weight: bold; font-size: 14px;">MILA JOY J. MARTINEZ</div>
          <div style="font-size: 13px; color: #333;">Head, Student Affairs and Services</div>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: left; margin-left: 40px; font-size: 12px; font-style: italic;">
        Not Valid without School Seal
      </div>

      <div class="cert-footer" style="margin-top: 40px; border-top: 2px solid #000; padding-top: 15px;">
        <div style="font-size: 11px; text-align: center; line-height: 1.6;">
          PUP Parañaque Campus, Col. E de Leon St. Wawa, Brgy. Sto. Nino, Parañaque city<br/>
          Direct line: (02) 8553 8623 | Website: www.pup.edu.ph | Email: paranaque@pup.edu.ph<br/>
          Inquiries: <a href="https://bit.ly/PUPSINTA" style="color: #822020;">https://bit.ly/PUPSINTA</a>
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 13px; font-weight: bold;">
          THE COUNTRY'S 1<sup>st</sup> POLYTECHNICU
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #999;">
        Reference No: ${request.request_number}
      </div>
    `;
  }
}

// Helper function to get full course name
function getFullCourseName(courseCode) {
  const courses = {
    'BSIT': 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY',
    'BSCE': 'BACHELOR OF SCIENCE IN COMPUTER ENGINEERING',
    'BSOA': 'BACHELOR OF SCIENCE IN OFFICE ADMINISTRATION',
    'BSHM': 'BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT'
  };
  return courses[courseCode] || courseCode;
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
  const remarks = await showCustomPrompt(
    'Enter any remarks about the certificate release (optional):',
    'Release Certificate',
    'Certificate released to student'
  );
  
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
  const confirmed = await showCustomConfirm(
    'Are you sure you want to delete this certificate request? This action cannot be undone.',
    'Delete Request'
  );
  
  if (!confirmed) return;

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
  const types = {
    'no_id': 'Certificate of No ID',
    'clearance': 'Clearance from Admin',
    'gres_form': 'GRES Form',
    'no_pending_obligation': 'Certificate of No Pending Obligation'
  };
  return types[type] || type;
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
  showCustomAlert(message, type);
}

// Custom Alert Function
function showCustomAlert(message, type = 'info') {
  const modal = document.getElementById('customAlertModal');
  const icon = document.getElementById('alertIcon');
  const title = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  
  // Set icon and title based on type
  const config = {
    success: {
      icon: '<i class="fa-solid fa-circle-check" style="color: #28a745;"></i>',
      title: 'Success!'
    },
    error: {
      icon: '<i class="fa-solid fa-circle-xmark" style="color: #dc3545;"></i>',
      title: 'Error'
    },
    warning: {
      icon: '<i class="fa-solid fa-triangle-exclamation" style="color: #ffc107;"></i>',
      title: 'Warning'
    },
    info: {
      icon: '<i class="fa-solid fa-circle-info" style="color: #17a2b8;"></i>',
      title: 'Information'
    }
  };
  
  const settings = config[type] || config.info;
  icon.innerHTML = settings.icon;
  title.textContent = settings.title;
  messageEl.textContent = message;
  
  modal.classList.add('show');
}

// Custom Confirm Function (returns Promise)
function showCustomConfirm(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customAlertModal');
    const icon = document.getElementById('alertIcon');
    const titleEl = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    const okBtn = document.getElementById('alertOkBtn');
    
    icon.innerHTML = '<i class="fa-solid fa-circle-question" style="color: #ffc107;"></i>';
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Change button to show Cancel and Confirm
    okBtn.outerHTML = `
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="alertCancelBtn" class="btn btn-secondary" style="min-width: 100px;">Cancel</button>
        <button id="alertConfirmBtn" class="btn btn-primary" style="min-width: 100px;">Confirm</button>
      </div>
    `;
    
    const cancelBtn = document.getElementById('alertCancelBtn');
    const confirmBtn = document.getElementById('alertConfirmBtn');
    
    const cleanup = () => {
      modal.classList.remove('show');
      // Restore original OK button
      document.querySelector('#customAlertModal .modal-body > div:last-child').outerHTML = 
        '<button id="alertOkBtn" class="btn btn-primary" style="min-width: 120px;">OK</button>';
      document.getElementById('alertOkBtn').addEventListener('click', () => {
        document.getElementById('customAlertModal').classList.remove('show');
      });
    };
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    modal.classList.add('show');
  });
}

// Custom Prompt Function (returns Promise with input value or null)
function showCustomPrompt(message, title = 'Input Required', defaultValue = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customPromptModal');
    const titleEl = document.getElementById('promptTitle');
    const messageEl = document.getElementById('promptMessage');
    const input = document.getElementById('promptInput');
    const cancelBtn = document.getElementById('promptCancelBtn');
    const submitBtn = document.getElementById('promptSubmitBtn');
    const closeBtn = document.getElementById('closePromptModal');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    input.value = defaultValue;
    
    const cleanup = () => {
      modal.classList.remove('show');
      input.value = '';
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(null);
    };
    
    const handleSubmit = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };
    
    // Remove old listeners and add new ones
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newSubmitBtn = submitBtn.cloneNode(true);
    const newCloseBtn = closeBtn.cloneNode(true);
    
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    newCancelBtn.addEventListener('click', handleCancel);
    newCloseBtn.addEventListener('click', handleCancel);
    newSubmitBtn.addEventListener('click', handleSubmit);
    
    // Allow Enter to submit
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });
    
    modal.classList.add('show');
    
    // Focus on input
    setTimeout(() => input.focus(), 100);
  });
}