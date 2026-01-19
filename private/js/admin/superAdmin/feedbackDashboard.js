// feedbackDashboard.js - UPDATED WITH STUDENT & VISITOR SUPPORT

document.addEventListener('DOMContentLoaded', async () => {
  const API_URL = 'http://localhost:3000/api';
  initializeProfileDropdown();
  
  let allFeedback = [];
  let departments = [];
  let filteredFeedback = [];
  let currentFilters = {
    department: '',
    rating: '',
    timeRange: '',
    startDate: '',
    endDate: '',
    userType: '' // NEW: Filter by user type
  };
  
  let pollingInterval = null;
  let lastFeedbackCount = 0;
  let isPollingEnabled = true;
  let isFirstLoad = true;

  await initializeDashboard();

  async function initializeDashboard() {
    try {
      await Promise.all([
        fetchDepartments(),
        fetchAllFeedback()
      ]);

      populateDepartmentFilters();
      updateDashboard();
      attachEventListeners();
      
      isFirstLoad = false;
      startRealtimePolling();
      
      console.log('✅ Feedback Dashboard initialized with Student & Visitor support');
    } catch (error) {
      console.error('❌ Error initializing dashboard:', error);
      showToast('Failed to load dashboard. Check console for details.', 'error');
    }
  }

  async function fetchDepartments() {
    try {
      departments = [
        { id: 1, name: 'Registrar' },
        { id: 2, name: 'Cashier' },
        { id: 3, name: 'Library' },
        { id: 4, name: 'Student Affairs' },
        { id: 5, name: 'Clinic' },
        { id: 6, name: 'Admission Office' }
      ];
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }

  async function fetchAllFeedback() {
    try {
      console.log('🔄 Fetching feedback from API...');
      
      // Build query params with user_type filter
      const queryParams = new URLSearchParams();
      if (currentFilters.userType) {
        queryParams.append('user_type', currentFilters.userType);
      }
      
      const response = await fetch(`${API_URL}/feedback/director/analytics?${queryParams}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Analytics data received:', data);
      
      const newFeedback = [];
      
      for (const dept of data.analytics) {
        if (dept.total_feedback > 0) {
          console.log(`📥 Fetching feedback for ${dept.department_name}...`);
          
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
              console.log(`✅ Got ${deptData.feedback.length} feedback items from ${dept.department_name}`);
              
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

      if (!isFirstLoad && allFeedback.length > 0 && newFeedback.length > allFeedback.length) {
        const newCount = newFeedback.length - allFeedback.length;
        console.log(`🆕 ${newCount} new feedback detected!`);
        showNewFeedbackNotification(newCount);
        playNotificationSound();
      }
      
      allFeedback = newFeedback;
      filteredFeedback = [...allFeedback];
      lastFeedbackCount = newFeedback.length;
      
    } catch (error) {
      console.error('❌ Error fetching feedback:', error);
      
      if (isFirstLoad && allFeedback.length === 0) {
        console.log('⚠️ Using mock data (API unavailable)');
        allFeedback = getMockFeedback();
        filteredFeedback = [...allFeedback];
        showToast('Using demo data - API connection failed', 'warning');
      }
    }
  }

  function startRealtimePolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    pollingInterval = setInterval(async () => {
      if (isPollingEnabled) {
        await checkForNewFeedback();
      }
    }, 5000);
    
    console.log('📡 Real-time polling started (every 5 seconds)');
  }
  
  function stopRealtimePolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      console.log('📡 Real-time polling stopped');
    }
  }
  
  async function checkForNewFeedback() {
    try {
      console.log('🔄 Polling for new feedback...');
      await fetchAllFeedback();
      applyFilters();
    } catch (error) {
      console.error('❌ Error polling for new feedback:', error);
    }
  }
  
  function showNewFeedbackNotification(count) {
    console.log(`🔔 Showing notification for ${count} new feedback`);
    showToast(
      `🎉 ${count} new feedback submission${count > 1 ? 's' : ''} received!`, 
      'success'
    );
  }
  
  function playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio notification not available');
    }
  }

  function updateDashboard() {
    updateSummaryCards();
    updateDepartmentPerformance();
    updateRatingDistribution();
    updateCriteriaBreakdown();
    updateTrendChart();
    updateRecentFeedback();
    updateCriticalAlerts();
  }

  function updateSummaryCards() {
    // Total Feedback
    document.getElementById('totalFeedback').textContent = filteredFeedback.length;

    // Average Rating
    const avgRating = filteredFeedback.length > 0 
      ? (filteredFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / filteredFeedback.length).toFixed(1)
      : '0.0';
    document.getElementById('averageRating').textContent = avgRating;

    // Recent Feedback (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = filteredFeedback.filter(f => 
      new Date(f.created_at) >= sevenDaysAgo
    ).length;
    document.getElementById('recentFeedback').textContent = recentCount;

    // Critical Alerts (rating <= 2)
    const criticalCount = filteredFeedback.filter(f => f.overall_rating <= 2).length;
    document.getElementById('criticalAlerts').textContent = criticalCount;
    
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
      notificationBadge.textContent = criticalCount;
      notificationBadge.style.display = criticalCount > 0 ? 'block' : 'none';
    }
  }

  function updateRecentFeedback() {
    const container = document.getElementById('recentFeedbackList');
    
    const recentFeedback = [...filteredFeedback]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    if (recentFeedback.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent feedback</p></div>';
      return;
    }

    container.innerHTML = recentFeedback.map(feedback => {
      const userBadge = getUserTypeBadge(feedback.user_type);
      const userIdentifier = feedback.user_type === 'student' 
        ? feedback.user_identifier || feedback.student_identifier
        : feedback.visitor_name || feedback.user_identifier;
      
      return `
        <div class="feedback-item ${feedback.overall_rating <= 2 ? 'critical' : ''}" onclick="viewFeedbackDetails(${feedback.feedback_id})">
          <div class="feedback-header">
            <span class="feedback-dept">${feedback.department_name}</span>
            <span class="feedback-rating">
              ${generateStars(feedback.overall_rating)}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 8px 0;">
            ${userBadge}
            <span style="font-size: 0.85rem; color: #4a5568;">${userIdentifier}</span>
          </div>
          <p class="feedback-comment">${feedback.comments || 'No comments provided'}</p>
          <div class="feedback-meta">
            <span class="feedback-date">
              <i class="far fa-clock"></i>
              ${formatTimeAgo(new Date(feedback.created_at))}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  function getUserTypeBadge(userType) {
    if (userType === 'student') {
      return '<span style="background: #667eea; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-user-graduate"></i> Student</span>';
    } else if (userType === 'visitor') {
      return '<span style="background: #48bb78; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-users"></i> Visitor</span>';
    }
    return '';
  }

  window.viewFeedbackDetails = async function(feedbackId) {
    const feedback = allFeedback.find(f => f.feedback_id === feedbackId);
    if (!feedback) return;

    const modalBody = document.getElementById('feedbackModalBody');
    
    const userBadge = getUserTypeBadge(feedback.user_type);
    const userIdentifier = feedback.user_type === 'student' 
      ? feedback.user_identifier || feedback.student_identifier
      : feedback.visitor_name || feedback.user_identifier;
    
    let userInfoSection = '';
    if (feedback.user_type === 'visitor') {
      userInfoSection = `
        <div class="detail-section">
          <h4><i class="fas fa-user"></i> Visitor Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Name</span>
              <span class="detail-value">${feedback.visitor_name || feedback.user_identifier}</span>
            </div>
            ${feedback.visitor_email ? `
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">${feedback.visitor_email}</span>
              </div>
            ` : ''}
            ${feedback.visitor_phone ? `
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${feedback.visitor_phone}</span>
              </div>
            ` : ''}
            ${feedback.service_type ? `
              <div class="detail-item">
                <span class="detail-label">Service Type</span>
                <span class="detail-value">${feedback.service_type}</span>
              </div>
            ` : ''}
            ${feedback.visit_date ? `
              <div class="detail-item">
                <span class="detail-label">Visit Date</span>
                <span class="detail-value">${new Date(feedback.visit_date).toLocaleDateString()}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    modalBody.innerHTML = `
      <div class="feedback-detail">
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Feedback Information</h4>
          <div style="margin-bottom: 15px;">${userBadge}</div>
          <div class="detail-grid">
            ${feedback.transaction_id ? `
              <div class="detail-item">
                <span class="detail-label">Transaction ID</span>
                <span class="detail-value">${feedback.transaction_id}</span>
              </div>
            ` : ''}
            <div class="detail-item">
              <span class="detail-label">Department</span>
              <span class="detail-value">${feedback.department_name}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">${feedback.user_type === 'student' ? 'Student' : 'Visitor'}</span>
              <span class="detail-value">${userIdentifier}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Date Submitted</span>
              <span class="detail-value">${new Date(feedback.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        ${userInfoSection}

        <div class="detail-section">
          <h4><i class="fas fa-star"></i> Overall Rating</h4>
          <div style="text-align: center; font-size: 2rem; color: #ffd700;">
            ${generateStars(feedback.overall_rating)}
            <p style="margin: 10px 0 0 0; font-size: 1.2rem; color: #2d3748;">${feedback.overall_rating}/5</p>
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-sliders-h"></i> Service Criteria Ratings</h4>
          <div class="ratings-grid">
            <div class="rating-item">
              <span class="rating-item-label">Processing Time</span>
              <span class="rating-item-value">${generateStars(feedback.processing_time)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Staff Assistance</span>
              <span class="rating-item-value">${generateStars(feedback.staff_assistance)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Clarity</span>
              <span class="rating-item-value">${generateStars(feedback.clarity)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Facility</span>
              <span class="rating-item-value">${generateStars(feedback.facility)}</span>
            </div>
          </div>
        </div>

        ${feedback.comments ? `
          <div class="detail-section">
            <h4><i class="fas fa-comment"></i> Comments</h4>
            <p style="line-height: 1.6; color: #4a5568;">${feedback.comments}</p>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('feedbackModal').classList.add('active');
  };

  function applyFilters() {
    filteredFeedback = allFeedback.filter(feedback => {
      if (currentFilters.department && feedback.department_name !== currentFilters.department) {
        return false;
      }

      if (currentFilters.rating && feedback.overall_rating !== parseInt(currentFilters.rating)) {
        return false;
      }
      
      if (currentFilters.userType && feedback.user_type !== currentFilters.userType) {
        return false;
      }

      if (currentFilters.timeRange) {
        const feedbackDate = new Date(feedback.created_at);
        const now = new Date();

        if (currentFilters.timeRange === 'today') {
          if (feedbackDate.toDateString() !== now.toDateString()) return false;
        } else if (currentFilters.timeRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (feedbackDate < weekAgo) return false;
        } else if (currentFilters.timeRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (feedbackDate < monthAgo) return false;
        } else if (currentFilters.timeRange === 'custom') {
          if (currentFilters.startDate && feedbackDate < new Date(currentFilters.startDate)) return false;
          if (currentFilters.endDate && feedbackDate > new Date(currentFilters.endDate)) return false;
        }
      }

      return true;
    });

    updateDashboard();
  }

  function attachEventListeners() {
    document.getElementById('refreshDashboard').addEventListener('click', handleRefresh);

    document.getElementById('departmentFilter').addEventListener('change', (e) => {
      currentFilters.department = e.target.value;
      applyFilters();
    });

    document.getElementById('ratingFilter').addEventListener('change', (e) => {
      currentFilters.rating = e.target.value;
      applyFilters();
    });
    
    // NEW: User type filter
    const userTypeFilter = document.getElementById('userTypeFilter');
    if (userTypeFilter) {
      userTypeFilter.addEventListener('change', (e) => {
        currentFilters.userType = e.target.value;
        applyFilters();
      });
    }

    document.getElementById('timeFilter').addEventListener('change', (e) => {
      currentFilters.timeRange = e.target.value;
      const dateRangeContainer = document.getElementById('dateRangeContainer');
      
      if (e.target.value === 'custom') {
        dateRangeContainer.style.display = 'flex';
      } else {
        dateRangeContainer.style.display = 'none';
        applyFilters();
      }
    });

    // Add more event listeners as needed...
  }

  function populateDepartmentFilters() {
    const filters = [
      document.getElementById('departmentFilter'),
      document.getElementById('modalDepartmentFilter')
    ];

    filters.forEach(filter => {
      if (filter) {
        departments.forEach(dept => {
          const option = document.createElement('option');
          option.value = dept.name;
          option.textContent = dept.name;
          filter.appendChild(option);
        });
      }
    });
  }

  // Utility functions
  function generateStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
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
      <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  async function handleRefresh() {
    const refreshBtn = document.getElementById('refreshDashboard');
    const icon = refreshBtn.querySelector('i');
    
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    try {
      await fetchAllFeedback();
      applyFilters();
      showToast('Dashboard refreshed successfully', 'success');
    } catch (error) {
      showToast('Failed to refresh dashboard', 'error');
    } finally {
      icon.classList.remove('fa-spin');
      refreshBtn.disabled = false;
    }
  }

  // Mock data with both student and visitor feedback
  function getMockFeedback() {
    return [
      {
        feedback_id: 1,
        transaction_id: 'TXN-2026-001234',
        user_identifier: '2021-55555-MN-0',
        student_identifier: '2021-55555-MN-0',
        department_name: 'Registrar',
        department_id: 1,
        user_type: 'student',
        overall_rating: 5,
        processing_time: 5,
        staff_assistance: 5,
        clarity: 4,
        facility: 4,
        comments: 'Excellent service! Very fast and efficient.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        feedback_id: 2,
        visitor_name: 'John Doe',
        visitor_email: 'john@example.com',
        user_identifier: 'John Doe',
        department_name: 'Admission Office',
        department_id: 6,
        user_type: 'visitor',
        service_type: 'Inquiry',
        visit_date: '2026-01-18',
        overall_rating: 4,
        processing_time: 4,
        staff_assistance: 5,
        clarity: 4,
        facility: 4,
        comments: 'Very helpful staff. Got all the information I needed.',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  function updateDepartmentPerformance() {
    const container = document.getElementById('departmentPerformance');
    
    const deptStats = {};
    
    departments.forEach(dept => {
      const deptFeedback = filteredFeedback.filter(f => 
        f.department_name === dept.name || f.department_id === dept.id
      );
      
      if (deptFeedback.length > 0) {
        const avgRating = deptFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / deptFeedback.length;
        const criticalCount = deptFeedback.filter(f => f.overall_rating <= 2).length;
        
        deptStats[dept.name] = {
          avgRating: avgRating.toFixed(1),
          totalFeedback: deptFeedback.length,
          criticalCount
        };
      }
    });

    if (Object.keys(deptStats).length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No department data available</p></div>';
      return;
    }

    container.innerHTML = Object.entries(deptStats)
      .sort(([, a], [, b]) => parseFloat(b.avgRating) - parseFloat(a.avgRating))
      .map(([name, stats]) => `
        <div class="department-item" onclick="filterByDepartment('${name}')">
          <div class="dept-header">
            <span class="dept-name">${name}</span>
            <span class="dept-rating">
              <i class="fas fa-star"></i> ${stats.avgRating}
            </span>
          </div>
          <div class="dept-stats">
            <span><i class="fas fa-comment"></i> ${stats.totalFeedback} feedback</span>
            ${stats.criticalCount > 0 ? `<span style="color: #f56565;"><i class="fas fa-exclamation-triangle"></i> ${stats.criticalCount} critical</span>` : ''}
          </div>
        </div>
      `).join('');
  }

  function updateRatingDistribution() {
    const container = document.getElementById('ratingDistribution');
    
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    filteredFeedback.forEach(f => {
      ratingCounts[f.overall_rating]++;
    });

    const total = filteredFeedback.length || 1;

    container.innerHTML = [5, 4, 3, 2, 1].map(rating => {
      const count = ratingCounts[rating];
      const percentage = ((count / total) * 100).toFixed(0);
      
      return `
        <div class="rating-bar-item">
          <div class="rating-label">
            <span class="stars">${'★'.repeat(rating)}</span>
          </div>
          <div class="rating-bar-container">
            <div class="rating-bar-fill star-${rating}" style="width: ${percentage}%">
              ${count > 0 ? `${count} (${percentage}%)` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateCriteriaBreakdown() {
    const container = document.getElementById('criteriaBreakdown');
    
    if (filteredFeedback.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No criteria data available</p></div>';
      return;
    }

    const criteria = [
      { key: 'processing_time', name: 'Processing Time', icon: 'fa-clock' },
      { key: 'staff_assistance', name: 'Staff Assistance', icon: 'fa-user-tie' },
      { key: 'clarity', name: 'Clarity of Instructions', icon: 'fa-clipboard-list' },
      { key: 'facility', name: 'Facility Condition', icon: 'fa-door-open' }
    ];

    container.innerHTML = criteria.map(criterion => {
      const avg = filteredFeedback.reduce((sum, f) => sum + (f[criterion.key] || 0), 0) / filteredFeedback.length;
      const score = avg.toFixed(1);
      const percentage = (avg / 5 * 100).toFixed(0);

      return `
        <div class="criteria-item">
          <div class="criteria-header">
            <span class="criteria-name">
              <i class="fas ${criterion.icon}"></i>
              ${criterion.name}
            </span>
            <span class="criteria-score">${score}/5</span>
          </div>
          <div class="criteria-bar">
            <div class="criteria-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function updateTrendChart() {
    const container = document.getElementById('trendChart');
    
    try {
      const response = await fetch(`${API_URL}/feedback/director/trends?months=6`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }
      
      const data = await response.json();
      
      if (data.trends.length === 0) {
        container.innerHTML = '<div class="trend-placeholder"><i class="fas fa-chart-line"></i><p>No trend data available yet</p></div>';
        return;
      }

      container.innerHTML = `
        <div style="padding: 20px;">
          <h4 style="margin: 0 0 20px 0; color: #2d3748;">Last 6 Months Performance</h4>
          ${data.trends.map(trend => `
            <div style="display: flex; padding: 10px; background: #f7fafc; gap: 10px; border-radius: 6px;">
              <span style="font-weight: 600; color: #4a5568; margin-top: 4px;">${formatMonth(trend.month)}</span>
              <span style="color: #667eea; font-weight: 700;">${trend.avg_rating} ★ (${trend.feedback_count} feedback)</span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      console.error('Error updating trend chart:', error);
      container.innerHTML = '<div class="trend-placeholder"><i class="fas fa-info-circle"></i><p>Trend data will appear after collecting feedback</p></div>';
    }
  }

  function updateRecentFeedback() {
    const container = document.getElementById('recentFeedbackList');
    
    const recentFeedback = [...filteredFeedback]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    if (recentFeedback.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent feedback</p></div>';
      return;
    }

    container.innerHTML = recentFeedback.map(feedback => `
      <div class="feedback-item ${feedback.overall_rating <= 2 ? 'critical' : ''}" onclick="viewFeedbackDetails(${feedback.feedback_id})">
        <div class="feedback-header">
          <span class="feedback-dept">${feedback.department_name}</span>
          <span class="feedback-rating">
            ${generateStars(feedback.overall_rating)}
          </span>
        </div>
        <p class="feedback-comment">${feedback.comments || 'No comments provided'}</p>
        <div class="feedback-meta">
          <span class="feedback-student">
            <i class="fas fa-user"></i>
            ${feedback.student_identifier}
          </span>
          <span class="feedback-date">
            <i class="far fa-clock"></i>
            ${formatTimeAgo(new Date(feedback.created_at))}
          </span>
        </div>
      </div>
    `).join('');
  }

  function updateCriticalAlerts() {
    const container = document.getElementById('criticalAlertsList');
    
    const criticalFeedback = filteredFeedback
      .filter(f => f.overall_rating <= 2)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    if (criticalFeedback.length === 0) {
      container.innerHTML = '<div class="empty-state" style="color: #48bb78;"><i class="fas fa-check-circle"></i><h4>All Good!</h4><p>No critical alerts at this time</p></div>';
      return;
    }

    container.innerHTML = criticalFeedback.map(feedback => `
      <div class="alert-item" onclick="viewFeedbackDetails(${feedback.feedback_id})">
        <div class="alert-header">
          <span class="alert-dept">${feedback.department_name}</span>
          <span class="alert-rating">${generateStars(feedback.overall_rating)}</span>
        </div>
        <p class="alert-message">${feedback.comments || 'No comments provided'}</p>
        <span class="alert-date">${formatTimeAgo(new Date(feedback.created_at))}</span>
      </div>
    `).join('');
  }

  // ============ FILTERING ============

  function applyFilters() {
    filteredFeedback = allFeedback.filter(feedback => {
      if (currentFilters.department && feedback.department_name !== currentFilters.department) {
        return false;
      }

      if (currentFilters.rating && feedback.overall_rating !== parseInt(currentFilters.rating)) {
        return false;
      }

      if (currentFilters.timeRange) {
        const feedbackDate = new Date(feedback.created_at);
        const now = new Date();

        if (currentFilters.timeRange === 'today') {
          if (feedbackDate.toDateString() !== now.toDateString()) return false;
        } else if (currentFilters.timeRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (feedbackDate < weekAgo) return false;
        } else if (currentFilters.timeRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (feedbackDate < monthAgo) return false;
        } else if (currentFilters.timeRange === 'custom') {
          if (currentFilters.startDate && feedbackDate < new Date(currentFilters.startDate)) return false;
          if (currentFilters.endDate && feedbackDate > new Date(currentFilters.endDate)) return false;
        }
      }

      return true;
    });

    updateDashboard();
  }

  function clearFilters() {
    currentFilters = {
      department: '',
      rating: '',
      timeRange: '',
      startDate: '',
      endDate: ''
    };

    document.getElementById('departmentFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    document.getElementById('timeFilter').value = '';
    document.getElementById('dateRangeContainer').style.display = 'none';

    filteredFeedback = [...allFeedback];
    updateDashboard();
    showToast('Filters cleared', 'info');
  }

  window.filterByDepartment = function(departmentName) {
    currentFilters.department = departmentName;
    document.getElementById('departmentFilter').value = departmentName;
    applyFilters();
    showToast(`Filtered by ${departmentName}`, 'info');
  };

  // ============ MODALS ============

  window.viewFeedbackDetails = async function(feedbackId) {
    const feedback = allFeedback.find(f => f.feedback_id === feedbackId);
    if (!feedback) return;

    const modalBody = document.getElementById('feedbackModalBody');
    
    modalBody.innerHTML = `
      <div class="feedback-detail">
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Transaction Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Transaction ID</span>
              <span class="detail-value">${feedback.transaction_id}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Department</span>
              <span class="detail-value">${feedback.department_name}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Student</span>
              <span class="detail-value">${feedback.student_identifier}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Date Submitted</span>
              <span class="detail-value">${new Date(feedback.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-star"></i> Overall Rating</h4>
          <div style="text-align: center; font-size: 2rem; color: #ffd700;">
            ${generateStars(feedback.overall_rating)}
            <p style="margin: 10px 0 0 0; font-size: 1.2rem; color: #2d3748;">${feedback.overall_rating}/5</p>
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-sliders-h"></i> Service Criteria Ratings</h4>
          <div class="ratings-grid">
            <div class="rating-item">
              <span class="rating-item-label">Processing Time</span>
              <span class="rating-item-value">${generateStars(feedback.processing_time)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Staff Assistance</span>
              <span class="rating-item-value">${generateStars(feedback.staff_assistance)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Clarity</span>
              <span class="rating-item-value">${generateStars(feedback.clarity)}</span>
            </div>
            <div class="rating-item">
              <span class="rating-item-label">Facility</span>
              <span class="rating-item-value">${generateStars(feedback.facility)}</span>
            </div>
          </div>
        </div>

        ${feedback.comments ? `
          <div class="detail-section">
            <h4><i class="fas fa-comment"></i> Comments</h4>
            <p style="line-height: 1.6; color: #4a5568;">${feedback.comments}</p>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('feedbackModal').classList.add('active');
  };

  function viewAllFeedback() {
    populateAllFeedbackModal();
    document.getElementById('allFeedbackModal').classList.add('active');
  }

  function populateAllFeedbackModal() {
    const container = document.getElementById('allFeedbackList');
    
    if (filteredFeedback.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No feedback available</p></div>';
      return;
    }

    const sortedFeedback = [...filteredFeedback].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    container.innerHTML = sortedFeedback.map(feedback => `
      <div class="feedback-item ${feedback.overall_rating <= 2 ? 'critical' : ''}" onclick="viewFeedbackDetails(${feedback.feedback_id})">
        <div class="feedback-header">
          <span class="feedback-dept">${feedback.department_name}</span>
          <span class="feedback-rating">${generateStars(feedback.overall_rating)}</span>
        </div>
        <p class="feedback-comment">${feedback.comments || 'No comments provided'}</p>
        <div class="feedback-meta">
          <span class="feedback-student"><i class="fas fa-user"></i> ${feedback.student_identifier}</span>
          <span class="feedback-date"><i class="far fa-clock"></i> ${formatTimeAgo(new Date(feedback.created_at))}</span>
        </div>
      </div>
    `).join('');
  }

  function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  // ============ EVENT LISTENERS ============

  function attachEventListeners() {
    document.getElementById('refreshDashboard').addEventListener('click', handleRefresh);

    document.getElementById('departmentFilter').addEventListener('change', (e) => {
      currentFilters.department = e.target.value;
      applyFilters();
    });

    document.getElementById('ratingFilter').addEventListener('change', (e) => {
      currentFilters.rating = e.target.value;
      applyFilters();
    });

    document.getElementById('timeFilter').addEventListener('change', (e) => {
      currentFilters.timeRange = e.target.value;
      const dateRangeContainer = document.getElementById('dateRangeContainer');
      
      if (e.target.value === 'custom') {
        dateRangeContainer.style.display = 'flex';
      } else {
        dateRangeContainer.style.display = 'none';
        applyFilters();
      }
    });

    document.getElementById('applyDateRange').addEventListener('click', () => {
      currentFilters.startDate = document.getElementById('startDate').value;
      currentFilters.endDate = document.getElementById('endDate').value;
      applyFilters();
    });

    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('viewAllFeedback').addEventListener('click', viewAllFeedback);
    document.getElementById('closeFeedbackModal').addEventListener('click', closeModals);
    document.getElementById('closeAllFeedbackModal').addEventListener('click', closeModals);
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', closeModals);
    });

    document.getElementById('modalSearchInput').addEventListener('input', filterModalFeedback);
    document.getElementById('modalDepartmentFilter').addEventListener('change', filterModalFeedback);
    document.getElementById('modalRatingFilter').addEventListener('change', filterModalFeedback);
  }

  function populateDepartmentFilters() {
    const filters = [
      document.getElementById('departmentFilter'),
      document.getElementById('modalDepartmentFilter')
    ];

    filters.forEach(filter => {
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.name;
        option.textContent = dept.name;
        filter.appendChild(option);
      });
    });
  }

  function filterModalFeedback() {
    const searchTerm = document.getElementById('modalSearchInput').value.toLowerCase();
    const deptFilter = document.getElementById('modalDepartmentFilter').value;
    const ratingFilter = document.getElementById('modalRatingFilter').value;

    const filtered = filteredFeedback.filter(feedback => {
      const matchesSearch = !searchTerm || 
        feedback.comments?.toLowerCase().includes(searchTerm) ||
        feedback.department_name.toLowerCase().includes(searchTerm) ||
        feedback.student_identifier.toLowerCase().includes(searchTerm);

      const matchesDept = !deptFilter || feedback.department_name === deptFilter;
      const matchesRating = !ratingFilter || feedback.overall_rating === parseInt(ratingFilter);

      return matchesSearch && matchesDept && matchesRating;
    });

    const container = document.getElementById('allFeedbackList');
    container.innerHTML = filtered.map(feedback => `
      <div class="feedback-item ${feedback.overall_rating <= 2 ? 'critical' : ''}" onclick="viewFeedbackDetails(${feedback.feedback_id})">
        <div class="feedback-header">
          <span class="feedback-dept">${feedback.department_name}</span>
          <span class="feedback-rating">${generateStars(feedback.overall_rating)}</span>
        </div>
        <p class="feedback-comment">${feedback.comments || 'No comments provided'}</p>
        <div class="feedback-meta">
          <span class="feedback-student"><i class="fas fa-user"></i> ${feedback.student_identifier}</span>
          <span class="feedback-date"><i class="far fa-clock"></i> ${formatTimeAgo(new Date(feedback.created_at))}</span>
        </div>
      </div>
    `).join('');
  }

  // ============ EXPORT FUNCTIONS ============

  function exportToCSV() {
    const csvContent = [
      ['Transaction ID', 'Department', 'Student', 'Overall Rating', 'Processing Time', 'Staff Assistance', 'Clarity', 'Facility', 'Comments', 'Date'].join(','),
      ...filteredFeedback.map(f => [
        f.transaction_id,
        f.department_name,
        f.student_identifier,
        f.overall_rating,
        f.processing_time,
        f.staff_assistance,
        f.clarity,
        f.facility,
        `"${(f.comments || '').replace(/"/g, '""')}"`,
        new Date(f.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('CSV exported successfully', 'success');
  }

  function exportToPDF() {
    showToast('PDF export feature coming soon', 'info');
  }

  // ============ UTILITY FUNCTIONS ============

  async function handleRefresh() {
    const refreshBtn = document.getElementById('refreshDashboard');
    const icon = refreshBtn.querySelector('i');
    
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    try {
      await fetchAllFeedback();
      applyFilters();
      showToast('Dashboard refreshed successfully', 'success');
    } catch (error) {
      showToast('Failed to refresh dashboard', 'error');
    } finally {
      icon.classList.remove('fa-spin');
      refreshBtn.disabled = false;
    }
  }

  function generateStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  }

  function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
      <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ============ MOCK DATA ============

  function getMockFeedback() {
    return [
      {
        feedback_id: 1,
        transaction_id: 'TXN-2026-001234',
        student_identifier: '2021-55555-MN-0',
        department_name: 'Registrar',
        department_id: 1,
        overall_rating: 5,
        processing_time: 5,
        staff_assistance: 5,
        clarity: 4,
        facility: 4,
        comments: 'Excellent service! Very fast and efficient.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        feedback_id: 2,
        transaction_id: 'TXN-2026-001235',
        student_identifier: 'Anonymous',
        department_name: 'Cashier',
        department_id: 2,
        overall_rating: 2,
        processing_time: 2,
        staff_assistance: 3,
        clarity: 2,
        facility: 3,
        comments: 'Long wait time. Staff could be more helpful.',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        feedback_id: 3,
        transaction_id: 'TXN-2026-001236',
        student_identifier: '2022-67890-MN-0',
        department_name: 'Library',
        department_id: 3,
        overall_rating: 4,
        processing_time: 4,
        staff_assistance: 4,
        clarity: 4,
        facility: 5,
        comments: 'Good experience overall. Staff was helpful.',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  // Expose for debugging
  window.feedbackDebug = {
    getPollingStatus: () => ({
      isEnabled: isPollingEnabled,
      intervalId: pollingInterval,
      feedbackCount: allFeedback.length
    }),
    forceRefresh: () => fetchAllFeedback(),
    togglePolling: () => {
      isPollingEnabled = !isPollingEnabled;
      console.log(`Polling ${isPollingEnabled ? 'enabled' : 'disabled'}`);
    }
  };
});