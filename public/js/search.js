// public/js/search.js

let allResults = {};
let currentFilter = 'all';

// Initialize search functionality
document.addEventListener('DOMContentLoaded', () => {
  // Get search query from URL
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');

  const mainSearchInput = document.getElementById('mainSearchInput');
  const mainSearchForm = document.getElementById('mainSearchForm');
  const navSearchForm = document.getElementById('navSearchForm');

  // Set initial search value
  if (query && mainSearchInput) {
    mainSearchInput.value = query;
    performSearch(query);
  }

  // Main search form submit
  if (mainSearchForm) {
    mainSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const searchQuery = mainSearchInput.value.trim();
      if (searchQuery) {
        performSearch(searchQuery);
        // Update URL without reload
        window.history.pushState({}, '', `?q=${encodeURIComponent(searchQuery)}`);
      }
    });
  }

  // Nav search form submit
  if (navSearchForm) {
    navSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const searchInput = document.getElementById('navSearchInput');
      const searchQuery = searchInput.value.trim();
      if (searchQuery) {
        window.location.href = `/public/html/search-results.html?q=${encodeURIComponent(searchQuery)}`;
      }
    });
  }

  // Filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      displayResults();
    });
  });
});

// Perform search
async function performSearch(query) {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const searchResults = document.getElementById('searchResults');
  const searchQueryText = document.getElementById('searchQueryText');
  const resultsCount = document.getElementById('resultsCount');

  // Show loading
  loadingState.style.display = 'block';
  emptyState.style.display = 'none';
  searchResults.innerHTML = '';

  // Update query text
  if (searchQueryText) {
    searchQueryText.innerHTML = `Searching for: <strong>"${query}"</strong>`;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    loadingState.style.display = 'none';

    if (data.success) {
      allResults = data.results;
      
      // Update results count
      if (resultsCount) {
        resultsCount.textContent = `(${data.totalResults} results found)`;
      }

      if (data.totalResults === 0) {
        emptyState.style.display = 'block';
      } else {
        displayResults();
      }
    } else {
      showError(data.message || 'Search failed');
    }
  } catch (error) {
    console.error('Search error:', error);
    loadingState.style.display = 'none';
    showError('Failed to connect to search service');
  }
}

// Display results based on current filter
function displayResults() {
  const searchResults = document.getElementById('searchResults');
  searchResults.innerHTML = '';

  const sections = [
    { key: 'pages', title: 'Pages', icon: 'fa-file' },
    { key: 'news', title: 'News & Updates', icon: 'fa-newspaper' },
    { key: 'scholarships', title: 'Scholarships', icon: 'fa-graduation-cap' },
    { key: 'careers', title: 'Career Opportunities', icon: 'fa-briefcase' },
    { key: 'nstp', title: 'NSTP Announcements', icon: 'fa-users' },
    { key: 'ojt', title: 'OJT Announcements', icon: 'fa-building' },
    { key: 'researchExtension', title: 'Research & Extension', icon: 'fa-flask' }
  ];

  sections.forEach(section => {
    if (currentFilter === 'all' || currentFilter === section.key) {
      const items = allResults[section.key] || [];
      if (items.length > 0) {
        searchResults.innerHTML += createSectionHTML(section, items);
      }
    }
  });

  if (searchResults.innerHTML === '') {
    document.getElementById('emptyState').style.display = 'block';
  }
}

// Create section HTML
function createSectionHTML(section, items) {
  let html = `
    <div class="result-section">
      <h2 class="result-section-title">
        <i class="fa ${section.icon}"></i>
        ${section.title}
      </h2>
  `;

  items.forEach(item => {
    html += createResultItemHTML(item, section.key);
  });

  html += '</div>';
  return html;
}

// Create individual result item HTML
function createResultItemHTML(item, type) {
  const title = item.title || item.name || 'Untitled';
  const excerpt = item.excerpt || item.description || '';
  const meta = item.meta || formatDate(item.created_at);
  const url = item.url || '#';

  return `
    <div class="result-item" onclick="window.location.href='${url}'">
      <span class="result-type ${type}">${type}</span>
      <h3 class="result-title">${escapeHtml(title)}</h3>
      ${meta ? `<p class="result-meta">${escapeHtml(meta)}</p>` : ''}
      ${excerpt ? `<p class="result-excerpt">${escapeHtml(excerpt)}</p>` : ''}
      <a href="${url}" class="result-url" onclick="event.stopPropagation()">
        View Details <i class="fa fa-arrow-right"></i>
      </a>
    </div>
  `;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show error message
function showError(message) {
  const searchResults = document.getElementById('searchResults');
  searchResults.innerHTML = `
    <div class="error-state" style="text-align: center; padding: 60px 20px;">
      <i class="fa fa-exclamation-circle" style="font-size: 64px; color: #d13438; margin-bottom: 20px;"></i>
      <h2 style="font-size: 24px; margin-bottom: 12px; color: #323130;">Search Error</h2>
      <p style="font-size: 16px; color: #605e5c;">${message}</p>
    </div>
  `;
}