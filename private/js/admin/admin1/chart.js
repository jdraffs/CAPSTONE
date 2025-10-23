// === CHARTS ===
document.addEventListener('DOMContentLoaded', () => {
  // Research Uploads
  const researchChartEl = document.getElementById('researchChart');
  if (researchChartEl) {
    new Chart(researchChartEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Uploads',
          data: [12, 19, 3, 5, 9, 7],
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Number of Uploads' } }
        }
      }
    });
  }

  // User Activity
  const userChartEl = document.getElementById('userActivityChart');
  if (userChartEl) {
    new Chart(userChartEl.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
          label: 'Active Users',
          data: [50, 60, 45, 70, 80, 65],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Users' } }
        }
      }
    });
  }

  // Site Visitors
  const siteVisitorsEl = document.getElementById('siteVisitorsChart');
  if (siteVisitorsEl) {
    new Chart(siteVisitorsEl.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Visitors',
          data: [120, 200, 150, 300],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Number of Visitors' } }
        }
      }
    });
  }

  // Most Viewed Research
  const mostViewedEl = document.getElementById('mostViewedResearchChart');
  if (mostViewedEl) {
    new Chart(mostViewedEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['AI in Education', 'Climate Change Impact', 'Digital Literacy', 'Renewable Energy Study', 'Mental Health Awareness'],
        datasets: [{
          label: 'Views',
          data: [234, 189, 145, 300, 275],
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        scales: {
          x: { beginAtZero: true, title: { display: true, text: 'Views' } }
        }
      }
    });
  }
});
