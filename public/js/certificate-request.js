// certificate-request.js - Public Form

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeForm();
  initializeTracking();
  initializeCharacterCounter();
});

// Tab Switching
function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Remove active class from all tabs and contents
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      btn.classList.add('active');
      document.getElementById(`${targetTab}Tab`).classList.add('active');
    });
  });
}

// Form Initialization
function initializeForm() {
  const form = document.getElementById('certificateRequestForm');
  
  if (!form) {
    console.error('Certificate request form not found');
    return;
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(form);
  });

  // Form validation enhancements
  const studentNumber = document.getElementById('studentNumber');
  if (studentNumber) {
    studentNumber.addEventListener('input', (e) => {
      // Allow numbers, letters, and hyphens (for format like 2022-00004-PQ-0)
      e.target.value = e.target.value.replace(/[^0-9A-Za-z-]/g, '').toUpperCase();
    });
  }

  const contactNumber = document.getElementById('contactNumber');
  if (contactNumber) {
    contactNumber.addEventListener('input', (e) => {
      // Allow only numbers
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  }
}

// Character Counter
function initializeCharacterCounter() {
  const reasonTextarea = document.getElementById('reason');
  const charCount = document.querySelector('.char-count');
  
  if (!reasonTextarea || !charCount) return;
  
  const maxLength = 500;
  reasonTextarea.setAttribute('maxlength', maxLength);

  reasonTextarea.addEventListener('input', (e) => {
    const currentLength = e.target.value.length;
    charCount.textContent = `${currentLength}/${maxLength}`;

    if (currentLength >= maxLength) {
      charCount.style.color = '#dc3545';
    } else {
      charCount.style.color = '#999';
    }
  });
}

// Handle Form Submit
async function handleFormSubmit(form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return;
  
  const originalBtnText = submitBtn.innerHTML;
  
  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

  try {
    // Gather form data
    const formData = {
      fullName: document.getElementById('fullName').value.trim(),
      studentNumber: document.getElementById('studentNumber').value.trim(),
      course: document.getElementById('course').value,
      yearLevel: document.getElementById('yearLevel').value,
      section: document.getElementById('section').value.trim() || null,
      campus: 'PUP Parañaque',
      certificateType: document.getElementById('certificateType').value,
      reason: document.getElementById('reason').value.trim(),
      contactEmail: document.getElementById('contactEmail').value.trim() || null,
      contactNumber: document.getElementById('contactNumber').value.trim() || null
    };

    // Validate required fields
    if (!formData.fullName || !formData.studentNumber || !formData.course || 
        !formData.yearLevel || !formData.certificateType || !formData.reason) {
      throw new Error('Please fill in all required fields');
    }

    console.log('Submitting form data:', formData);

    // Submit to API
    const response = await fetch('/api/certificate-requests/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    console.log('Response status:', response.status);

    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit request');
    }

    if (data.success) {
      // Show success modal
      showSuccessModal(data.requestNumber);
      
      // Reset form
      form.reset();
      const charCount = document.querySelector('.char-count');
      if (charCount) charCount.textContent = '0/500';
    } else {
      throw new Error(data.message || 'Failed to submit request');
    }

  } catch (error) {
    console.error('Form submission error:', error);
    showErrorMessage(error.message);
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Show Success Modal
function showSuccessModal(requestNumber) {
  const modal = document.getElementById('successModal');
  const displayNumber = document.getElementById('displayRequestNumber');
  
  if (modal && displayNumber) {
    displayNumber.textContent = requestNumber;
    modal.classList.add('show');
  }
}

// Close Success Modal
function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.classList.remove('show');
  }
  
  // Switch to tracking tab
  const trackTab = document.querySelector('.tab-btn[data-tab="track"]');
  if (trackTab) {
    trackTab.click();
  }
  
  // Pre-fill the tracking input
  const requestNumber = document.getElementById('requestNumber');
  const displayNumber = document.getElementById('displayRequestNumber');
  if (requestNumber && displayNumber) {
    requestNumber.value = displayNumber.textContent;
  }
}

// Initialize Tracking
function initializeTracking() {
  const trackForm = document.getElementById('trackStatusForm');
  
  if (!trackForm) {
    console.error('Track status form not found');
    return;
  }
  
  trackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleStatusTracking();
  });
}

// Handle Status Tracking
async function handleStatusTracking() {
  const requestNumberInput = document.getElementById('requestNumber');
  const statusResult = document.getElementById('statusResult');
  const submitBtn = document.querySelector('#trackStatusForm button[type="submit"]');
  
  if (!requestNumberInput || !statusResult || !submitBtn) return;
  
  const requestNumber = requestNumberInput.value.trim();
  const originalBtnText = submitBtn.innerHTML;

  if (!requestNumber) {
    showErrorMessage('Please enter a request number');
    return;
  }

  // Show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';
  statusResult.style.display = 'none';

  try {
    console.log('Tracking request:', requestNumber);

    const response = await fetch(`/api/certificate-requests/status/${requestNumber}`);
    console.log('Tracking response status:', response.status);

    const data = await response.json();
    console.log('Tracking response data:', data);

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Request not found');
    }

    // Display status
    renderStatusResult(data.request, data.activityLogs);
    statusResult.style.display = 'block';

  } catch (error) {
    console.error('Status tracking error:', error);
    showErrorMessage(error.message);
    statusResult.style.display = 'none';
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Render Status Result
function renderStatusResult(request, logs) {
  const statusResult = document.getElementById('statusResult');
  if (!statusResult) return;

  statusResult.innerHTML = `
    <div class="status-header">
      <h3>Request Details</h3>
      ${renderStatusBadge(request.status)}
    </div>

    <div class="status-detail-grid">
      <div class="status-detail-item">
        <span class="status-label">Request Number</span>
        <span class="status-value"><strong>${request.request_number}</strong></span>
      </div>

      <div class="status-detail-item">
        <span class="status-label">Date Submitted</span>
        <span class="status-value">${formatDate(request.created_at)}</span>
      </div>

      <div class="status-detail-item">
        <span class="status-label">Student Name</span>
        <span class="status-value">${request.full_name}</span>
      </div>

      <div class="status-detail-item">
        <span class="status-label">Student Number</span>
        <span class="status-value">${request.student_number}</span>
      </div>

      <div class="status-detail-item">
        <span class="status-label">Certificate Type</span>
        <span class="status-value">${formatCertificateType(request.certificate_type)}</span>
      </div>

      <div class="status-detail-item">
        <span class="status-label">Current Status</span>
        <span class="status-value">${formatStatus(request.status)}</span>
      </div>

      ${request.generated_at ? `
        <div class="status-detail-item">
          <span class="status-label">Certificate Generated</span>
          <span class="status-value">${formatDate(request.generated_at)}</span>
        </div>
      ` : ''}

      ${request.printed_at ? `
        <div class="status-detail-item">
          <span class="status-label">Printed On</span>
          <span class="status-value">${formatDate(request.printed_at)}</span>
        </div>
      ` : ''}

      ${request.released_at ? `
        <div class="status-detail-item">
          <span class="status-label">Released On</span>
          <span class="status-value">${formatDate(request.released_at)}</span>
        </div>
      ` : ''}

      <div class="status-detail-item status-detail-full">
        <span class="status-label">Reason for Request</span>
        <span class="status-value reason">${request.reason}</span>
      </div>

      ${request.admin_remarks ? `
        <div class="status-detail-item status-detail-full">
          <span class="status-label">Admin Remarks</span>
          <span class="status-value">${request.admin_remarks}</span>
        </div>
      ` : ''}
    </div>

    ${logs && logs.length > 0 ? `
      <div class="status-timeline">
        <h4>Activity Timeline</h4>
        ${logs.map(log => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-action">${log.action.toUpperCase()}</div>
              <div class="timeline-details">
                ${log.performed_by}${log.remarks ? ` - ${log.remarks}` : ''}
              </div>
              <div class="timeline-time">${formatDateTime(log.created_at)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
      ${getStatusMessage(request.status)}
    </div>
  `;
}

// Get Status Message
function getStatusMessage(status) {
  const messages = {
    pending: '<p style="color: #856404;"><i class="fa-solid fa-clock"></i> Your request is being processed. Please check back later.</p>',
    generated: '<p style="color: #0c5460;"><i class="fa-solid fa-file-circle-check"></i> Your certificate has been generated and is ready for printing.</p>',
    printed: '<p style="color: #004085;"><i class="fa-solid fa-print"></i> Your certificate has been printed and is being prepared for release.</p>',
    released: '<p style="color: #155724;"><i class="fa-solid fa-check-double"></i> Your certificate is ready for pickup. Please visit the office.</p>'
  };

  return messages[status] || '';
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

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function showErrorMessage(message) {
  // Remove any existing error messages
  const existingErrors = document.querySelectorAll('.error-message');
  existingErrors.forEach(err => err.remove());

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <i class="fa-solid fa-circle-exclamation"></i>
    <div>${message}</div>
  `;

  // Insert at the top of the active tab
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    const firstChild = activeTab.firstElementChild;
    activeTab.insertBefore(errorDiv, firstChild);

    // Remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// Make closeSuccessModal global
window.closeSuccessModal = closeSuccessModal;

// Debug: Log that script is loaded
console.log('Certificate request script loaded successfully');