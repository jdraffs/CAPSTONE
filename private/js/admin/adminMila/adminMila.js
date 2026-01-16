// adminMila.js - Dashboard statistics and functionality

async function loadDashboardStats() {
  try {
    // Load Scholarship Stats
    const scholarshipRes = await fetch('http://localhost:3000/api/scholarships/all');
    const scholarshipData = await scholarshipRes.json();

    if (scholarshipData.success) {
      const scholarships = scholarshipData.scholarships;
      
      const total = scholarships.length;
      const open = scholarships.filter(s => s.status === 'open').length;

      document.getElementById('totalScholarships').textContent = total;
      document.getElementById('openScholarships').textContent = open;
    }

    // Load Career Directory Stats
    const careerRes = await fetch('http://localhost:3000/api/career/dashboard/stats');
    const careerData = await careerRes.json();

    if (careerData.success) {
      const stats = careerData.stats;
      
      document.getElementById('activeOrganizations').textContent = stats.active_organizations || 0;
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

// Load stats when page loads
window.addEventListener('DOMContentLoaded', loadDashboardStats);