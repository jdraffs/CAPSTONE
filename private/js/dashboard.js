
  // Select all nav items
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', function () {
      // Remove 'active' class from all nav-items
      navItems.forEach(nav => nav.classList.remove('active'));

      // Add 'active' class to the clicked nav-item
      this.classList.add('active');
    });
  });
  function logout() {
    window.location.href = '/public/index.html'; // adjust path if needed
}


//count
document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll(".card-number");

  counters.forEach(counter => {
    const updateCount = () => {
      const target = +counter.getAttribute("data-count");
      const current = +counter.innerText;
      const increment = Math.ceil(target / 100); // Speed of count

      if (current < target) {
        counter.innerText = Math.min(current + increment, target);
        setTimeout(updateCount, 20); // Speed control
      } else {
        counter.innerText = target;
      }
    };

    updateCount();
  });
});
//date
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    };

    const formatted = now.toLocaleString('en-US', options);
    document.getElementById('datetime').textContent = formatted;
}

setInterval(updateDateTime, 1000); // Update every second
updateDateTime(); // Initial call

//charts
// Sample data for research uploads per month
// const researchCtx = document.getElementById('researchChart').getContext('2d');
// const researchChart = new Chart(researchCtx, {
//     type: 'bar',
//     data: {
//         labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
//         datasets: [{
//             label: 'Uploads',
//             data: [12, 19, 3, 5, 9, 7],
//             backgroundColor: 'rgba(54, 162, 235, 0.7)',
//             borderColor: 'rgba(54, 162, 235, 1)',
//             borderWidth: 1,
//             borderRadius: 4
//         }]
//     },
//     options: {
//         responsive: true,
//         scales: {
//             y: {
//                 beginAtZero: true,
//                 title: { display: true, text: 'Number of Uploads' }
//             }
//         }
//     }
// });

// // Sample data for user activity trend
// const userCtx = document.getElementById('userActivityChart').getContext('2d');
// const userActivityChart = new Chart(userCtx, {
//     type: 'line',
//     data: {
//         labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
//         datasets: [{
//             label: 'Active Users',
//             data: [50, 60, 45, 70, 80, 65],
//             backgroundColor: 'rgba(255, 99, 132, 0.2)',
//             borderColor: 'rgba(255, 99, 132, 1)',
//             tension: 0.3,
//             fill: true,
//             pointRadius: 5,
//             borderWidth: 2
//         }]
//     },
//     options: {
//         responsive: true,
//         scales: {
//             y: {
//                 beginAtZero: true,
//                 title: { display: true, text: 'Users' }
//             }
//         }
//     }
// });

// Site Visitors Chart (Line Chart)
const siteVisitorsCanvas = document.getElementById('siteVisitorsChart');
if (siteVisitorsCanvas) {
    const siteVisitorsCtx = siteVisitorsCanvas.getContext('2d');
    new Chart(siteVisitorsCtx, {
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
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Number of Visitors' }
                }
            }
        }
    });
}

// Most Viewed Research Outputs (Horizontal Bar Chart)
const mostViewedCanvas = document.getElementById('mostViewedContentChart');
if (mostViewedCanvas) {
    const mostViewedCtx = mostViewedCanvas.getContext('2d');
    new Chart(mostViewedCtx, {
        type: 'bar',
        data: {
            labels: ['OJT', 'Research & Extension', 'NSTP', 'Announcements & Memos'],
            datasets: [{
                label: 'Views',
                data: [234, 189, 145, 300],
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
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Views' }
                }
            }
        }
    });
}



document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();

    // Remove active from all nav-items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    this.closest('.nav-item').classList.add('active');

    // Hide all content pages
    document.querySelectorAll('.content-page').forEach(page => {
      page.classList.remove('active', 'fade-up');
    });

    // Show the selected page with fade-up animation
    const pageName = this.getAttribute('data-page');
    if (pageName) {
      const pageDiv = document.getElementById(pageName + '-page');
      if (pageDiv) {
        pageDiv.classList.add('active');
        // Trigger reflow to restart animation
        void pageDiv.offsetWidth;
        pageDiv.classList.add('fade-up');
      }
    }
  });
});

document.getElementById('mobileMenuToggle').onclick = function() {
  document.querySelector('.sidebar').classList.toggle('open');
};

