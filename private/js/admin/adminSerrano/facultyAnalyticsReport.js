// facultyAnalyticsReport.js - Analytics & AI Reports
// Chart rendering and AI insights generation

// ============================================
// GLOBAL STATE & CONFIGURATION
// ============================================

const STATE = {
  facultyData: [],
  currentTab: 'analytics',
  charts: {}
};

const API_BASE = 'http://localhost:3000/api';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('📊 Faculty Analytics & Reports Loading...');
  
  // Check authentication
  const adminid = localStorage.getItem('adminid');
  if (!adminid) {
    window.location.href = '/private/html/AdminLogin/login.html';
    return;
  }
  
  // Initialize profile dropdown
  if (typeof initializeProfileDropdown === 'function') {
    initializeProfileDropdown();
  }
  
  // Setup tabs
  initializeTabs();
  
  // Load faculty data
  await loadFacultyData();
  
  // Render analytics
  renderAllCharts();
  
  // Setup report generation
  setupReportGeneration();
  
  console.log('✅ Analytics & Reports initialized successfully');
});

// ============================================
// TAB NAVIGATION
// ============================================

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const targetTab = document.getElementById(`${tabName}-tab`);
  if (targetTab) {
    targetTab.classList.add('active');
    STATE.currentTab = tabName;
    
    if (tabName === 'analytics') {
      renderAllCharts();
    }
  }
}

// ============================================
// FACULTY DATA MANAGEMENT
// ============================================

async function loadFacultyData() {
  try {
    const response = await fetch(`${API_BASE}/faculty`);
    if (response.ok) {
      STATE.facultyData = await response.json();
    } else {
      const stored = localStorage.getItem('facultyData');
      STATE.facultyData = stored ? JSON.parse(stored) : [];
    }
    
    console.log(`✅ Loaded ${STATE.facultyData.length} faculty records`);
  } catch (error) {
    console.error('❌ Error loading faculty data:', error);
    const stored = localStorage.getItem('facultyData');
    STATE.facultyData = stored ? JSON.parse(stored) : [];
  }
}

function getActiveFaculty() {
  return STATE.facultyData.filter(f => f.is_active);
}

// ============================================
// CHART RENDERING
// ============================================

function renderAllCharts() {
  const activeFaculty = getActiveFaculty();
  
  if (activeFaculty.length === 0) {
    showEmptyState();
    return;
  }
  
  // Destroy existing charts
  Object.values(STATE.charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  STATE.charts = {};
  
  // Render all charts
  renderEmploymentChart(activeFaculty);
  renderDegreeChart(activeFaculty);
  renderProgramChart(activeFaculty);
  renderQualificationsChart(activeFaculty);
  renderAgeChart(activeFaculty);
  renderPDSChart(activeFaculty);
}

function showEmptyState() {
  const grid = document.querySelector('.analytics-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-chart-bar"></i>
        <h4>No Data Available</h4>
        <p>Add faculty members to view analytics</p>
      </div>
    `;
  }
}

function renderEmploymentChart(faculty) {
  const ctx = document.getElementById('employmentChart');
  if (!ctx) return;
  
  const regular = faculty.filter(f => f.employment_type === 'Regular').length;
  const partTime = faculty.filter(f => f.employment_type === 'Part-Time').length;
  
  STATE.charts.employment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Regular', 'Part-Time'],
      datasets: [{
        data: [regular, partTime],
        backgroundColor: ['#4facfe', '#f5576c'],
        borderWidth: 3,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function renderDegreeChart(faculty) {
  const ctx = document.getElementById('degreeChart');
  if (!ctx) return;
  
  const bachelor = faculty.filter(f => f.highest_degree === 'Bachelor').length;
  const master = faculty.filter(f => f.highest_degree === 'Master').length;
  const doctorate = faculty.filter(f => f.highest_degree === 'Doctorate').length;
  
  STATE.charts.degree = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Bachelor', 'Master', 'Doctorate'],
      datasets: [{
        data: [bachelor, master, doctorate],
        backgroundColor: ['#fce7f3', '#e0e7ff', '#dbeafe'],
        borderWidth: 3,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderProgramChart(faculty) {
  const ctx = document.getElementById('programChart');
  if (!ctx) return;
  
  const programs = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
  const counts = programs.map(p => faculty.filter(f => f.program === p).length);
  
  STATE.charts.program = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: programs,
      datasets: [{
        label: 'Faculty Count',
        data: counts,
        backgroundColor: ['#667eea', '#f5576c', '#4facfe', '#fbc02d'],
        borderWidth: 0,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderQualificationsChart(faculty) {
  const ctx = document.getElementById('qualificationsChart');
  if (!ctx) return;
  
  const programs = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
  
  const doctoralData = programs.map(p => 
    faculty.filter(f => f.program === p && f.highest_degree === 'Doctorate').length
  );
  
  const masterData = programs.map(p => 
    faculty.filter(f => f.program === p && f.highest_degree === 'Master').length
  );
  
  const bachelorData = programs.map(p => 
    faculty.filter(f => f.program === p && f.highest_degree === 'Bachelor').length
  );
  
  STATE.charts.qualifications = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: programs,
      datasets: [
        {
          label: 'Doctorate',
          data: doctoralData,
          backgroundColor: '#dbeafe'
        },
        {
          label: 'Master',
          data: masterData,
          backgroundColor: '#e0e7ff'
        },
        {
          label: 'Bachelor',
          data: bachelorData,
          backgroundColor: '#fce7f3'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderAgeChart(faculty) {
  const ctx = document.getElementById('ageChart');
  if (!ctx) return;
  
  // Filter faculty with birthdate
  const withAge = faculty.filter(f => f.birthdate);
  
  // Group by age ranges
  const ranges = {
    '20-30': 0,
    '31-40': 0,
    '41-50': 0,
    '51-60': 0,
    '60+': 0
  };
  
  withAge.forEach(f => {
    const age = calculateAge(f.birthdate);
    if (age <= 30) ranges['20-30']++;
    else if (age <= 40) ranges['31-40']++;
    else if (age <= 50) ranges['41-50']++;
    else if (age <= 60) ranges['51-60']++;
    else ranges['60+']++;
  });
  
  STATE.charts.age = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(ranges),
      datasets: [{
        label: 'Faculty Count',
        data: Object.values(ranges),
        backgroundColor: '#667eea',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderPDSChart(faculty) {
  const ctx = document.getElementById('pdsChart');
  if (!ctx) return;
  
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const status = {
    'Up to Date': 0,
    'Outdated (1+ year)': 0,
    'Severely Outdated (2+ years)': 0,
    'Never Updated': 0
  };
  
  faculty.forEach(f => {
    if (!f.last_pds_update) {
      status['Never Updated']++;
    } else {
      const pdsDate = new Date(f.last_pds_update);
      if (pdsDate < twoYearsAgo) {
        status['Severely Outdated (2+ years)']++;
      } else if (pdsDate < oneYearAgo) {
        status['Outdated (1+ year)']++;
      } else {
        status['Up to Date']++;
      }
    }
  });
  
  STATE.charts.pds = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(status),
      datasets: [{
        data: Object.values(status),
        backgroundColor: ['#48bb78', '#f59e0b', '#f56565', '#94a3b8'],
        borderWidth: 3,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// ============================================
// AI REPORT GENERATION
// ============================================

function setupReportGeneration() {
  const generateBtn = document.getElementById('generateReportBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateAIReport);
  }
}

function generateAIReport() {
  const activeFaculty = getActiveFaculty();
  
  if (activeFaculty.length === 0) {
    showToast('No faculty data available to generate report', 'error');
    return;
  }
  
  const reportContainer = document.getElementById('reportContainer');
  reportContainer.innerHTML = `
    <div class="report-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Generating comprehensive AI insights report...</p>
      <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 10px;">Analyzing ${activeFaculty.length} faculty records...</p>
    </div>
  `;
  
  // Simulate AI processing
  setTimeout(() => {
    const report = generateComprehensiveReport(activeFaculty);
    displayAIReport(report);
  }, 2000);
}

function generateComprehensiveReport(faculty) {
  // This function uses the exact same logic from the original adminSerrano.js
  // (Copying the comprehensive report generation functions)
  
  const total = faculty.length;
  const regular = faculty.filter(f => f.employment_type === 'Regular').length;
  const partTime = faculty.filter(f => f.employment_type === 'Part-Time').length;
  const regularPercent = ((regular / total) * 100).toFixed(1);
  const partTimePercent = ((partTime / total) * 100).toFixed(1);
  
  const doctoral = faculty.filter(f => f.highest_degree === 'Doctorate').length;
  const masters = faculty.filter(f => f.highest_degree === 'Master').length;
  const bachelor = faculty.filter(f => f.highest_degree === 'Bachelor').length;
  const doctoralPercent = ((doctoral / total) * 100).toFixed(1);
  const mastersPercent = ((masters / total) * 100).toFixed(1);
  const bachelorPercent = ((bachelor / total) * 100).toFixed(1);
  
  const programs = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
  const programStats = programs.map(program => {
    const count = faculty.filter(f => f.program === program).length;
    const withDoctorate = faculty.filter(f => f.program === program && f.highest_degree === 'Doctorate').length;
    const withMasters = faculty.filter(f => f.program === program && f.highest_degree === 'Master').length;
    
    return {
      program,
      count,
      withDoctorate,
      withMasters,
      percent: ((count / total) * 100).toFixed(1),
      advancedPercent: count > 0 ? (((withDoctorate + withMasters) / count) * 100).toFixed(1) : '0.0'
    };
  });
  
  // Generate all report sections (using functions from original code)
  return {
    executiveSummary: `The Polytechnic University of the Philippines - Parañaque Campus employs ${total} active faculty members. The employment structure consists of ${regular} regular faculty (${regularPercent}%) and ${partTime} part-time instructors (${partTimePercent}%). Academic qualifications include ${doctoral} doctorate holders (${doctoralPercent}%), ${masters} master's degree holders (${mastersPercent}%), and ${bachelor} bachelor's degree holders (${bachelorPercent}%).`,
    
    statistics: {
      total, regular, partTime, regularPercent, partTimePercent,
      doctoral, masters, bachelor, doctoralPercent, mastersPercent, bachelorPercent
    },
    
    programStats: programStats,
    
    keyInsights: generateInsights(total, doctoral, masters, programStats),
    
    recommendations: generateRecommendations(total, doctoral, masters, programStats)
  };
}

function generateInsights(total, doctoral, masters, programStats) {
  const insights = [];
  const advancedPercent = ((doctoral + masters) / total) * 100;
  
  if (advancedPercent >= 70) {
    insights.push({
      type: 'positive',
      text: `Strong Academic Profile: ${advancedPercent.toFixed(1)}% of faculty hold advanced degrees, exceeding accreditation standards.`
    });
  } else if (advancedPercent < 50) {
    insights.push({
      type: 'priority',
      text: `Qualification Enhancement Needed: Only ${advancedPercent.toFixed(1)}% hold advanced degrees. Faculty development programs recommended.`
    });
  }
  
  if (doctoral === 0) {
    insights.push({
      type: 'critical',
      text: 'No Doctoral Faculty: Urgent need to recruit or develop doctoral-qualified faculty for research and accreditation.'
    });
  }
  
  programStats.forEach(prog => {
    if (parseFloat(prog.advancedPercent) < 40 && prog.count > 0) {
      insights.push({
        type: 'concern',
        text: `${prog.program} has low advanced degree rate: ${prog.advancedPercent}%. Targeted faculty development recommended.`
      });
    }
  });
  
  return insights;
}

function generateRecommendations(total, doctoral, masters, programStats) {
  const recommendations = [];
  
  if (doctoral < 5) {
    recommendations.push({
      priority: 'High',
      category: 'Doctoral Faculty Recruitment',
      recommendation: 'Implement aggressive recruitment strategy for doctoral-qualified faculty with competitive packages.',
      expectedImpact: 'Strengthen research capabilities and institutional credibility.'
    });
  }
  
  const advancedPercent = ((doctoral + masters) / total) * 100;
  if (advancedPercent < 60) {
    recommendations.push({
      priority: 'High',
      category: 'Faculty Development',
      recommendation: 'Establish scholarship program for master\'s and doctoral studies with financial support.',
      expectedImpact: 'Meet accreditation standards and enhance academic quality.'
    });
  }
  
  recommendations.push({
    priority: 'Medium',
    category: 'Continuous Improvement',
    recommendation: 'Develop three-year qualification enhancement roadmap aligned with CHED standards.',
    expectedImpact: 'Systematic progress toward accreditation and competitive standing.'
  });
  
  return recommendations;
}

function displayAIReport(report) {
  const container = document.getElementById('reportContainer');
  
  const insightIcons = {
    'positive': 'fa-check-circle',
    'concern': 'fa-exclamation-triangle',
    'priority': 'fa-flag',
    'critical': 'fa-exclamation-circle'
  };
  
  container.innerHTML = `
    <div class="report-section">
      <h3><i class="fas fa-file-alt"></i> Executive Summary</h3>
      <div class="report-content">
        <p>${report.executiveSummary}</p>
      </div>
    </div>
    
    <div class="report-section">
      <h3><i class="fas fa-chart-bar"></i> Statistical Overview</h3>
      <div class="report-stats">
        <div class="stat-box">
          <h4>Total Faculty</h4>
          <p>${report.statistics.total}</p>
        </div>
        <div class="stat-box">
          <h4>Regular Faculty</h4>
          <p>${report.statistics.regular} (${report.statistics.regularPercent}%)</p>
        </div>
        <div class="stat-box">
          <h4>Doctoral Holders</h4>
          <p>${report.statistics.doctoral} (${report.statistics.doctoralPercent}%)</p>
        </div>
        <div class="stat-box">
          <h4>Master's Holders</h4>
          <p>${report.statistics.masters} (${report.statistics.mastersPercent}%)</p>
        </div>
      </div>
    </div>
    
    <div class="report-section">
      <h3><i class="fas fa-building-columns"></i> Program Distribution</h3>
      <div class="report-stats">
        ${report.programStats.map(p => `
          <div class="stat-box">
            <h4>${p.program}</h4>
            <p>${p.count} faculty (${p.percent}%)</p>
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">
              ${p.advancedPercent}% advanced degrees
            </p>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="report-section">
      <h3><i class="fas fa-lightbulb"></i> Key Insights</h3>
      <ul class="insights-list">
        ${report.keyInsights.map(insight => `
          <li class="${insight.type}">
            <i class="fas ${insightIcons[insight.type]}"></i>
            ${insight.text}
          </li>
        `).join('')}
      </ul>
    </div>
    
    <div class="report-section">
      <h3><i class="fas fa-tasks"></i> Strategic Recommendations</h3>
      <div class="recommendations-list">
        ${report.recommendations.map(rec => `
          <div class="recommendation-card">
            <div class="rec-header">
              <span class="priority-badge badge-${rec.priority.toLowerCase()}">${rec.priority} Priority</span>
              <strong>${rec.category}</strong>
            </div>
            <p class="rec-recommendation">${rec.recommendation}</p>
            <p class="rec-impact"><strong>Expected Impact:</strong> ${rec.expectedImpact}</p>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="report-footer">
      <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
      <p><em>AI-powered insights for academic planning and strategic decision-making.</em></p>
    </div>
  `;
  
  showToast('AI report generated successfully', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateAge(birthdate) {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

function showToast(message, type = 'info') {
  if (typeof toast === 'function') {
    toast(message, type);
    return;
  }
  console.log(`[${type.toUpperCase()}] ${message}`);
}

console.log('✅ facultyAnalyticsReport.js loaded successfully');