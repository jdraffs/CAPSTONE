// secondaryFeedbackView.js - Service Feedback for System Admin (READ-ONLY)

document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  
  let allFeedback = [];
  let filteredFeedback = [];
  let departments = [];
  let currentFilters = {
    search: '',
    rating: '',
    department: '',
    dateRange: '',
    userType: ''
  };

  const currentAdminId = localStorage.getItem('adminid');

  // Set the actual admin name in the sidebar
  async function setCurrentAdminName() {
    try {
      const response = await fetch(`${API_URL}/admin-accounts`);
      const data = await response.json();
      
      const currentUser = data.admins.find(a => a.adminid === currentAdminId);
      
      if (currentUser) {
        // Update admin name
        const nameElements = document.querySelectorAll('#currentAdminName');
        nameElements.forEach(el => {
          if (el) el.textContent = currentUser.adminid || currentAdminId;
        });
        
        // Update role subtitle to "System Administrator"
        const roleElements = document.querySelectorAll('.user-role');
        roleElements.forEach(el => {
          if (el) el.textContent = 'System Administrator';
        });
        
        console.log('✅ Admin name set:', currentUser.adminid);
      }
    } catch (error) {
      console.error('Error fetching admin name:', error);
      // Fallback to stored admin ID
      const nameElements = document.querySelectorAll('#currentAdminName');
      nameElements.forEach(el => {
        if (el) el.textContent = currentAdminId;
      });
    }
  }

// Call this function early in your initialization
await setCurrentAdminName();
  // Initialize
  initializeProfileDropdown();
  await initializeFeedbackView();

  async function initializeFeedbackView() {
    showLoading();
    try {
      await Promise.all([
        fetchDepartments(),
        fetchAllFeedback()
      ]);
      
      populateDepartmentFilter();
      updateStatistics();
      renderRatingDistribution();
      renderFeedbackList();
      attachEventListeners();
      
      console.log('✅ Feedback View initialized (Read-Only Mode)');
    } catch (error) {
      console.error('Error initializing feedback view:', error);
      showToast('Failed to load feedback data', 'error');
    }
  }

  // ============ API CALLS ============
  
  async function fetchDepartments() {
    try {
      // Use the same departments as SuperAdmin
      departments = [
        { id: 1, name: 'Registrar' },
        { id: 2, name: 'Cashier' },
        { id: 3, name: 'Library' },
        { id: 4, name: 'Student Affairs' },
        { id: 5, name: 'Clinic' },
        { id: 6, name: 'Admission Office' }
      ];
      
      console.log('✅ Departments loaded:', departments.length);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }

  async function fetchAllFeedback() {
    try {
      console.log('🔄 Fetching feedback from API...');
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (currentFilters.userType) {
        queryParams.append('user_type', currentFilters.userType);
      }
      
      // Fetch analytics data (same as SuperAdmin)
      const response = await fetch(`${API_URL}/feedback/director/analytics?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Analytics data received:', data);
      
      const newFeedback = [];
      
      // Fetch feedback for each department
      for (const dept of data.analytics) {
        if (dept.total_feedback > 0) {
          try {
            const deptQueryParams = new URLSearchParams();
            if (currentFilters.userType) {
              deptQueryParams.append('user_type', currentFilters.userType);
            }
            
            const deptResponse = await fetch(
              `${API_URL}/feedback/department/${dept.department_id}?${deptQueryParams}`
            );
            
            if (deptResponse.ok) {
              const deptData = await deptResponse.json();
              
              deptData.feedback.forEach(f => {
                newFeedback.push({
                  ...f,
                  department_name: dept.department_name,
                  department_id: dept.department_id
                });
              });
            }
          } catch (deptError) {
            console.error(`Error fetching department ${dept.department_id}:`, deptError);
          }
        }
      }

      console.log(`✅ Total feedback loaded: ${newFeedback.length}`);
      
      allFeedback = newFeedback;
      filteredFeedback = [...allFeedback];
      
    } catch (error) {
      console.error('❌ Error fetching feedback:', error);
      showToast('Failed to load feedback from server', 'error');
      
      // Don't use mock data - show empty state instead
      allFeedback = [];
      filteredFeedback = [];
    }
  }

  function populateDepartmentFilter() {
    const select = document.getElementById('departmentFilter');
    if (!select) return;
    
    // Clear existing options except "All Departments"
    select.innerHTML = '<option value="">All Departments</option>';
    
    departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept.name;
      option.textContent = dept.name;
      select.appendChild(option);
    });
  }

  // ============ STATISTICS ============
  
  function updateStatistics() {
    const total = allFeedback.length;
    
    // Calculate average rating
    const avgRating = total > 0 
      ? (allFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / total).toFixed(1)
      : '0.0';
    
    // Calculate satisfaction rate (4-5 stars)
    const satisfied = allFeedback.filter(f => f.overall_rating >= 4).length;
    const satisfactionRate = total > 0 
      ? Math.round((satisfied / total) * 100)
      : 0;
    
    // Count recent feedback (this week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentCount = allFeedback.filter(f => 
      new Date(f.created_at) >= oneWeekAgo
    ).length;
    
    // Update UI
    document.getElementById('totalFeedback').textContent = total;
    document.getElementById('avgRating').textContent = avgRating;
    document.getElementById('satisfactionRate').textContent = `${satisfactionRate}%`;
    document.getElementById('recentFeedback').textContent = recentCount;
    
    // Update notification badge
    const criticalCount = allFeedback.filter(f => f.overall_rating <= 2).length;
    const notifBadge = document.getElementById('notificationBadge');
    if (notifBadge) {
      notifBadge.textContent = criticalCount;
      notifBadge.style.display = criticalCount > 0 ? 'block' : 'none';
    }
  }

  // ============ RATING DISTRIBUTION ============
  
  function renderRatingDistribution() {
    const distribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };
    
    filteredFeedback.forEach(f => {
      if (f.overall_rating >= 1 && f.overall_rating <= 5) {
        distribution[f.overall_rating]++;
      }
    });
    
    const total = filteredFeedback.length || 1;
    const container = document.getElementById('ratingBars');
    
    container.innerHTML = [5, 4, 3, 2, 1].map(rating => {
      const count = distribution[rating];
      const percentage = Math.round((count / total) * 100);
      
      return `
        <div class="rating-bar-row">
          <div class="rating-label">
            <div class="stars">
              ${renderStars(rating)}
            </div>
            <span class="rating-number">${rating}</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill rating-${rating}" style="width: ${percentage}%"></div>
          </div>
          <div class="rating-count">
            <span class="count">${count}</span>
            <span class="percentage">${percentage}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============ FEEDBACK LIST ============
  
  function renderFeedbackList() {
    const list = document.getElementById('feedbackList');
    
    if (filteredFeedback.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No Feedback Found</h3>
          <p>No feedback matches your current filters</p>
        </div>
      `;
      return;
    }
    
    // Sort by date descending
    const sortedFeedback = [...filteredFeedback].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    list.innerHTML = sortedFeedback.map(fb => {
      const userBadge = getUserTypeBadge(fb.user_type);
      const userIdentifier = fb.user_type === 'student' 
        ? fb.user_identifier || fb.student_number || 'Anonymous'
        : fb.visitor_name || fb.user_identifier || 'Visitor';
      
      return `
        <div class="feedback-card" data-id="${fb.feedback_id}">
          <div class="feedback-card-header">
            <div class="student-info">
              <div class="student-avatar">
                ${userIdentifier.charAt(0).toUpperCase()}
              </div>
              <div class="student-details">
                <h4>${userIdentifier}</h4>
                <p>${fb.department_name || 'General'}</p>
              </div>
            </div>
            <div class="feedback-meta">
              <div class="rating-stars">
                ${renderStars(fb.overall_rating)}
              </div>
              <span class="feedback-date">${formatDate(fb.created_at)}</span>
            </div>
          </div>
          
          <div class="feedback-body">
            ${userBadge}
            <p class="feedback-text">${fb.comments || 'No comment provided'}</p>
          </div>
          
          <div class="feedback-footer">
            <div class="feedback-tags">
              ${getRatingBadge(fb.overall_rating)}
              <span class="view-only-badge">
                <i class="fas fa-eye"></i> View Only
              </span>
            </div>
            <button class="btn-view-details" onclick="viewFeedbackDetails(${fb.feedback_id})">
              <i class="fas fa-info-circle"></i>
              View Details
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function getUserTypeBadge(userType) {
    if (userType === 'student') {
      return '<span class="service-badge" style="background: linear-gradient(135deg, #bee3f8 0%, #90cdf4 100%); color: #2c5282;"><i class="fas fa-user-graduate"></i> Student</span>';
    } else if (userType === 'visitor') {
      return '<span class="service-badge" style="background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%); color: #22543d;"><i class="fas fa-users"></i> Visitor</span>';
    }
    return '';
  }

  // ============ FILTERS & SEARCH ============
  
  function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const ratingFilter = document.getElementById('ratingFilter').value;
    const departmentFilter = document.getElementById('departmentFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const userTypeFilter = document.getElementById('userTypeFilter').value;
    
    filteredFeedback = allFeedback.filter(fb => {
      // Search filter
      const matchesSearch = !searchTerm || 
        (fb.user_identifier && fb.user_identifier.toLowerCase().includes(searchTerm)) ||
        (fb.visitor_name && fb.visitor_name.toLowerCase().includes(searchTerm)) ||
        (fb.student_number && fb.student_number.toLowerCase().includes(searchTerm)) ||
        (fb.comments && fb.comments.toLowerCase().includes(searchTerm)) ||
        (fb.department_name && fb.department_name.toLowerCase().includes(searchTerm));
      
      // Rating filter
      const matchesRating = !ratingFilter || 
        fb.overall_rating === parseInt(ratingFilter);
      
      // Department filter
      const matchesDepartment = !departmentFilter || 
        fb.department_name === departmentFilter;
      
      // User type filter
      const matchesUserType = !userTypeFilter ||
        fb.user_type === userTypeFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter) {
        const feedbackDate = new Date(fb.created_at);
        const now = new Date();
        
        if (dateFilter === 'today') {
          matchesDate = feedbackDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = feedbackDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = feedbackDate >= monthAgo;
        }
      }
      
      return matchesSearch && matchesRating && matchesDepartment && matchesUserType && matchesDate;
    });
    
    updateStatistics();
    renderRatingDistribution();
    renderFeedbackList();
  }

  // ============ FEEDBACK DETAILS MODAL ============
  
  window.viewFeedbackDetails = function(feedbackId) {
    const feedback = allFeedback.find(f => f.feedback_id === feedbackId);
    if (!feedback) return;
    
    const modalBody = document.getElementById('modalBody');
    const userBadge = getUserTypeBadge(feedback.user_type);
    const userIdentifier = feedback.user_type === 'student' 
      ? feedback.user_identifier || feedback.student_number || 'Anonymous'
      : feedback.visitor_name || feedback.user_identifier || 'Visitor';
    
    let userInfoSection = '';
    if (feedback.user_type === 'visitor') {
      userInfoSection = `
        <div class="detail-section">
          <h4><i class="fas fa-user"></i> Visitor Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Name</label>
              <p>${feedback.visitor_name || 'N/A'}</p>
            </div>
            ${feedback.visitor_email ? `
              <div class="detail-item">
                <label>Email</label>
                <p>${feedback.visitor_email}</p>
              </div>
            ` : ''}
            ${feedback.visitor_phone ? `
              <div class="detail-item">
                <label>Phone</label>
                <p>${feedback.visitor_phone}</p>
              </div>
            ` : ''}
            ${feedback.service_type ? `
              <div class="detail-item">
                <label>Service Type</label>
                <p>${feedback.service_type}</p>
              </div>
            ` : ''}
            ${feedback.visit_date ? `
              <div class="detail-item">
                <label>Visit Date</label>
                <p>${new Date(feedback.visit_date).toLocaleDateString()}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    modalBody.innerHTML = `
      <div class="feedback-details">
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Feedback Information</h4>
          <div style="margin-bottom: 15px;">${userBadge}</div>
          <div class="detail-grid">
            ${feedback.transaction_id ? `
              <div class="detail-item">
                <label>Transaction ID</label>
                <p>${feedback.transaction_id}</p>
              </div>
            ` : ''}
            <div class="detail-item">
              <label>Department</label>
              <p>${feedback.department_name}</p>
            </div>
            <div class="detail-item">
              <label>${feedback.user_type === 'student' ? 'Student' : 'Visitor'}</label>
              <p>${userIdentifier}</p>
            </div>
            <div class="detail-item">
              <label>Date Submitted</label>
              <p>${formatFullDate(feedback.created_at)}</p>
            </div>
          </div>
        </div>

        ${userInfoSection}

        <div class="detail-section">
          <h4><i class="fas fa-star"></i> Overall Rating</h4>
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 2rem; color: #ffd700; margin-bottom: 10px;">
              ${renderStars(feedback.overall_rating)}
            </div>
            <p style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #2d3748;">
              ${feedback.overall_rating}/5
            </p>
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-sliders-h"></i> Service Criteria Ratings</h4>
          <div class="ratings-grid">
            <div class="rating-item">
              <span class="rating-item-label">Processing Time</span>
              <span class="rating-item-value">${renderStars(feedback.processing_time)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Staff Assistance</span>
              <span class="rating-item-value">${renderStars(feedback.staff_assistance)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Clarity</span>
              <span class="rating-item-value">${renderStars(feedback.clarity)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Facility</span>
              <span class="rating-item-value">${renderStars(feedback.facility)}</span>
            </div>
          </div>
        </div>

        ${feedback.comments ? `
          <div class="detail-section">
            <h4><i class="fas fa-comment"></i> Comments</h4>
            <div class="feedback-content">
              <p>${feedback.comments}</p>
            </div>
          </div>
        ` : ''}
        
        <div class="read-only-notice-modal">
          <i class="fas fa-info-circle"></i>
          <p><strong>View-Only Mode:</strong> You cannot respond to or modify this feedback. Only the Super Administrator can take action.</p>
        </div>
      </div>
    `;
    
    document.getElementById('feedbackModal').classList.add('active');
  };

  // ============ EVENT LISTENERS ============
  
  function attachEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      showToast('Refreshing feedback...', 'info');
      await fetchAllFeedback();
      applyFilters();
      showToast('Feedback refreshed', 'success');
    });
    
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('ratingFilter').addEventListener('change', applyFilters);
    
    const deptFilter = document.getElementById('departmentFilter');
    if (deptFilter) {
      deptFilter.addEventListener('change', applyFilters);
    }
    
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    
    const userTypeFilter = document.getElementById('userTypeFilter');
    if (userTypeFilter) {
      userTypeFilter.addEventListener('change', applyFilters);
    }
    
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);
  }

  function closeModal() {
    document.getElementById('feedbackModal').classList.remove('active');
  }

  // ============ UTILITY FUNCTIONS ============
  
  function renderStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function getRatingBadge(rating) {
    if (rating >= 5) return '<span class="sentiment-badge excellent">Excellent</span>';
    if (rating >= 4) return '<span class="sentiment-badge good">Good</span>';
    if (rating >= 3) return '<span class="sentiment-badge average">Average</span>';
    if (rating >= 2) return '<span class="sentiment-badge poor">Poor</span>';
    return '<span class="sentiment-badge very-poor">Very Poor</span>';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  function formatFullDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showLoading() {
    const list = document.getElementById('feedbackList');
    if (list) {
      list.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <h3>Loading Feedback</h3>
          <p>Please wait while we fetch the latest feedback data...</p>
        </div>
      `;
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${icons[type]}"></i>
      </div>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  console.log('✅ Secondary Feedback View initialized');
});