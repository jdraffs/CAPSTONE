// public/js/navbar.js - Updated with search functionality

const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const navbar = document.querySelector(".navbar");
const dropdown = document.querySelector(".dropdown-content");

// hamburger menu
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navMenu.classList.toggle("active");
  navbar.classList.toggle("active");
  search.style.visibility("invisible");
})

// Close menu when clicking nav links
document.querySelectorAll(".nav-item").forEach(n => n.addEventListener("click", () => {
  hamburger.classList.remove("active");
  navMenu.classList.remove("active");
}));

// Navbar scroll effect
window.addEventListener('scroll', function() {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

// Initialize search on all pages
document.addEventListener('DOMContentLoaded', () => {
  const searchForms = document.querySelectorAll('.search');
  
  searchForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const searchInput = form.querySelector('.searchbox');
      const query = searchInput.value.trim();
      
      if (query.length < 2) {
        alert('Please enter at least 2 characters to search');
        return;
      }
      
      // Redirect to search results page
      window.location.href = `/public/html/search-results.html?q=${encodeURIComponent(query)}`;
    });
  });
  
  // Add real-time search suggestions (optional)
  const searchInputs = document.querySelectorAll('.searchbox');
  searchInputs.forEach(input => {
    let searchTimeout;
    
    input.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length >= 2) {
        // Debounce search suggestions
        searchTimeout = setTimeout(() => {
          // You can add autocomplete suggestions here if desired
          // For now, we'll just enable the search
        }, 300);
      }
    });
    
    // Allow Enter key to search
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const form = input.closest('.search');
        if (form) {
          form.dispatchEvent(new Event('submit'));
        }
      }
    });
  });
});

window.addEventListener('scroll', handleScroll);
function handleScroll() {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.classList.add('scrolled'); // Add null check
  }
}

// Quick search function that can be called from anywhere
function quickSearch(query) {
  if (!query || query.trim().length < 2) {
    alert('Please enter at least 2 characters to search');
    return;
  }
  window.location.href = `/public/html/search-results.html?q=${encodeURIComponent(query.trim())}`;
}

// Make quickSearch available globally
window.quickSearch = quickSearch;