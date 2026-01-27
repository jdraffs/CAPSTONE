// feedbackView.js - Secondary SuperAdmin Feedback View (READ-ONLY)

document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  
  let allFeedback = [];
  let filteredFeedback = [];
  let currentAdminId = localStorage.getItem('adminid');

  // Initialize
  await initializeFeedbackView();

  async function initializeFeedbackView() {
    showLoading();
    try {
      await fetchFeedback();
      updateStatistics();
      renderRatingDistribution();
      renderFeedbackList();
      attachEventListeners();
    } catch (error) {
      console.error('Error initializing feedback view:', error);
      showToast('Failed to load feedback data', 'error');
    }
  }

  // ============ API CALLS ============
  
  async function fetchFeedback() {
    try {
      const response = await fetch(`${API_URL}/feedback`);
      if (!response.ok) throw new Error('Failed to fetch feedback');
      
      const data = await response.json();
      allFeedback = data.feedback || [];
      filteredFeedback = [...allFeedback];
      
      console.log('✅ Feedback loaded:', allFeedback.length);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      // Use mock data if API fails
      allFeedback = getMockFeedback();
      filteredFeedback = [...allFeedback];
    }
  }

  // ============ STATISTICS ============
  
  function updateStatistics() {
    const total = allFeedback.length;
    
    // Calculate average rating
    const avgRating = total > 0 
      ? (allFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / total).toFixed(1)
      : 0.0;
    
    // Calculate satisfaction rate (4-5 stars)
    const satisfied = allFeedback.filter(f => f.rating >= 4).length;
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
  }

  // ============ RATING DISTRIBUTION ============
  
  function renderRatingDistribution() {
    const distribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };
    
    allFeedback.forEach(f => {
      if (f.rating >= 1 && f.rating <= 5) {
        distribution[f.rating]++;
      }
    });
    
    const total = allFeedback.length || 1;
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
  
  function renderFeedbackList(feedback = null) {
    const list = document.getElementById('feedbackList');
    const items = feedback || filteredFeedback;
    
    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No Feedback Found</h3>
          <p>No feedback matches your current filters</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = items.map(fb => `
      <div class="feedback-card" data-id="${fb.id}">
        <div class="feedback-header">
          <div class="student-info">
            <div class="student-avatar">
              ${fb.student_name ? fb.student_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div class="student-details">
              <h4>${fb.student_name || 'Anonymous'}</h4>
              <p>${fb.student_number || 'N/A'}</p>
            </div>
          </div>
          <div class="feedback-meta">
            <div class="rating-stars">
              ${renderStars(fb.rating)}
            </div>
            <span class="feedback-date">${formatDate(fb.created_at)}</span>
          </div>
        </div>
        
        <div class="feedback-body">
          <div class="service-badge">
            <i class="fas fa-building"></i>
            ${fb.service_type || 'General'}
          </div>
          <p class="feedback-text">${fb.feedback_text || 'No comment provided'}</p>
          ${fb.suggestions ? `
            <div class="suggestions">
              <strong><i class="fas fa-lightbulb"></i> Suggestions:</strong>
              <p>${fb.suggestions}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="feedback-footer">
          <div class="feedback-tags">
            ${getRatingBadge(fb.rating)}
            <span class="view-only-badge">
              <i class="fas fa-eye"></i> View Only
            </span>
          </div>
          <button class="btn-view-details" onclick="viewFeedbackDetails(${fb.id})">
            <i class="fas fa-info-circle"></i>
            View Details
          </button>
        </div>
      </div>
    `).join('');
  }

  // ============ FILTERS & SEARCH ============
  
  function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const ratingFilter = document.getElementById('ratingFilter').value;
    const serviceFilter = document.getElementById('serviceFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    filteredFeedback = allFeedback.filter(fb => {
      // Search filter
      const matchesSearch = !searchTerm || 
        (fb.student_name && fb.student_name.toLowerCase().includes(searchTerm)) ||
        (fb.student_number && fb.student_number.toLowerCase().includes(searchTerm)) ||
        (fb.feedback_text && fb.feedback_text.toLowerCase().includes(searchTerm)) ||
        (fb.suggestions && fb.suggestions.toLowerCase().includes(searchTerm));
      
      // Rating filter
      const matchesRating = ratingFilter === 'all' || 
        fb.rating === parseInt(ratingFilter);
      
      // Service filter
      const matchesService = serviceFilter === 'all' || 
        (fb.service_type && fb.service_type.toLowerCase() === serviceFilter.toLowerCase());
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
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
      
      return matchesSearch && matchesRating && matchesService && matchesDate;
    });
    
    // Apply sorting
    filteredFeedback.sort((a, b) => {
      switch(sortBy) {
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
    
    renderFeedbackList();
  }

  // ============ FEEDBACK DETAILS MODAL ============
  
  window.viewFeedbackDetails = function(feedbackId) {
    const feedback = allFeedback.find(f => f.id === feedbackId);
    if (!feedback) return;
    
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
      <div class="feedback-details">
        <div class="detail-section">
          <h4><i class="fas fa-user"></i> Student Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Name</label>
              <p>${feedback.student_name || 'Anonymous'}</p>
            </div>
            <div class="detail-item">
              <label>Student Number</label>
              <p>${feedback.student_number || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Email</label>
              <p>${feedback.student_email || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Contact</label>
              <p>${feedback.student_contact || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-star"></i> Rating & Service</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Rating</label>
              <div class="rating-display">
                ${renderStars(feedback.rating)}
                <span class="rating-text">${feedback.rating} / 5</span>
              </div>
            </div>
            <div class="detail-item">
              <label>Service Type</label>
              <p class="service-tag">
                <i class="fas fa-building"></i>
                ${feedback.service_type || 'General'}
              </p>
            </div>
            <div class="detail-item">
              <label>Submitted</label>
              <p>${formatFullDate(feedback.created_at)}</p>
            </div>
            <div class="detail-item">
              <label>Sentiment</label>
              <p>${getRatingBadge(feedback.rating)}</p>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-comment"></i> Feedback</h4>
          <div class="feedback-content">
            <p>${feedback.feedback_text || 'No comment provided'}</p>
          </div>
        </div>
        
        ${feedback.suggestions ? `
          <div class="detail-section">
            <h4><i class="fas fa-lightbulb"></i> Suggestions</h4>
            <div class="feedback-content">
              <p>${feedback.suggestions}</p>
            </div>
          </div>
        ` : ''}
        
        <div class="read-only-notice-modal">
          <i class="fas fa-info-circle"></i>
          <p><strong>View-Only Mode:</strong> You cannot respond to or modify this feedback. Only the Campus Director can take action.</p>
        </div>
      </div>
    `;
    
    document.getElementById('feedbackModal').classList.add('active');
  };

  // ============ EVENT LISTENERS ============
  
  function attachEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      showToast('Refreshing feedback...', 'info');
      await fetchFeedback();
      updateStatistics();
      renderRatingDistribution();
      applyFilters();
      showToast('Feedback refreshed', 'success');
    });
    
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('ratingFilter').addEventListener('change', applyFilters);
    document.getElementById('serviceFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);
  }

  function closeModal() {
    document.getElementById('feedbackModal').classList.remove('active');
  }

  // ============ UTILITY FUNCTIONS ============
  
  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
      stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
      stars += '<i class="fas fa-star-half-alt"></i>';
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
  }

  function getRatingBadge(rating) {
    if (rating >= 4.5) return '<span class="sentiment-badge excellent">Excellent</span>';
    if (rating >= 3.5) return '<span class="sentiment-badge good">Good</span>';
    if (rating >= 2.5) return '<span class="sentiment-badge average">Average</span>';
    if (rating >= 1.5) return '<span class="sentiment-badge poor">Poor</span>';
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showLoading() {
    document.getElementById('feedbackList').innerHTML = `
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading feedback...</p>
      </div>
    `;
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

  function getMockFeedback() {
    return [
      {
        id: 1,
        student_name: 'Juan Dela Cruz',
        student_number: '2021-00001-MN-0',
        student_email: 'juan.delacruz@pupqc.edu.ph',
        student_contact: '09171234567',
        service_type: 'Enrollment',
        rating: 5,
        feedback_text: 'The enrollment process was smooth and efficient. Staff were very helpful!',
        suggestions: 'Maybe add more payment options.',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        student_name: 'Maria Santos',
        student_number: '2021-00002-MN-0',
        student_email: 'maria.santos@pupqc.edu.ph',
        student_contact: '09187654321',
        service_type: 'Cashier',
        rating: 4,
        feedback_text: 'Payment process was quick. Waiting time could be improved.',
        suggestions: 'Add more cashier windows during peak hours.',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        student_name: 'Pedro Reyes',
        student_number: '2020-00015-MN-0',
        student_email: 'pedro.reyes@pupqc.edu.ph',
        student_contact: '09191231234',
        service_type: 'Registrar',
        rating: 3,
        feedback_text: 'Service was okay but had to wait for a long time.',
        suggestions: 'Implement an online queuing system.',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
});