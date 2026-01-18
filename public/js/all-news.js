// All News Page JavaScript
const newsGrid = document.getElementById('allNewsGrid');
const searchInput = document.getElementById('newsSearch');
const filterButtons = document.querySelectorAll('.filter-btn');
const paginationContainer = document.getElementById('pagination');

let allNews = [];
let filteredNews = [];
let currentPage = 1;
const itemsPerPage = 9;

// Extract text preview from HTML content
function extractTextPreview(htmlContent, maxLength = 150) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Show full article in modal
function showFullNewsArticle(article) {
  let modal = document.getElementById('newsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'newsModal';
    modal.className = 'news-modal';
    document.body.appendChild(modal);
  }

  let featuredImageHtml = '';
  if (article.thumbnail_path) {
    featuredImageHtml = `
      <div class="news-full-image">
        <img src="http://localhost:3000${article.thumbnail_path}" alt="${article.title}">
      </div>
    `;
  }

  const date = new Date(article.created_at);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  modal.innerHTML = `
    <div class="news-modal-content">
      <span class="news-close">&times;</span>
      
      <div class="news-full-header">
        <h1 class="news-full-title">${article.title}</h1>
        <div class="news-full-meta">
          <span><i class="fa fa-calendar"></i> ${formattedDate}</span>
          <span><i class="fa fa-building"></i> PUP Parañaque</span>
        </div>
      </div>
      
      ${featuredImageHtml}
      
      <div class="news-full-body">
        ${article.content}
      </div>
    </div>
  `;

  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  const closeBtn = modal.querySelector('.news-close');
  closeBtn.onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  };
}

// Create news card
function createNewsCard(article) {
  const newsCard = document.createElement('div');
  newsCard.className = 'news-card';
  newsCard.dataset.id = article.id;

  let featuredImageHtml = '';
  if (article.thumbnail_path) {
    featuredImageHtml = `
      <div class="news-image">
        <img src="http://localhost:3000${article.thumbnail_path}" alt="${article.title}">
      </div>
    `;
  } else {
    featuredImageHtml = `
      <div class="news-no-image">
        <i class="fa fa-newspaper"></i>
      </div>
    `;
  }

  const excerpt = extractTextPreview(article.content);
  const date = new Date(article.created_at);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  newsCard.innerHTML = `
    ${featuredImageHtml}
    <div class="news-content">
      <h2 class="news-title">${article.title}</h2>
      <p class="news-excerpt">${excerpt}</p>
      <div class="news-footer">
        <span class="news-date">
          <i class="fa fa-calendar"></i>
          ${formattedDate}
        </span>
        <span class="news-read-more">
          Read article <i class="fa fa-arrow-right"></i>
        </span>
      </div>
    </div>
  `;

  newsCard.addEventListener('click', () => {
    showFullNewsArticle(article);
  });

  return newsCard;
}

// Render news grid with pagination
function renderNews() {
  newsGrid.innerHTML = '';

  if (filteredNews.length === 0) {
    newsGrid.innerHTML = `
      <div class="news-empty">
        <i class="fa fa-newspaper"></i>
        <h3>No News Found</h3>
        <p>Try adjusting your search or filter criteria.</p>
      </div>
    `;
    paginationContainer.innerHTML = '';
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageNews = filteredNews.slice(startIndex, endIndex);

  pageNews.forEach(article => {
    newsGrid.appendChild(createNewsCard(article));
  });

  renderPagination();
}

// Render pagination controls
function renderPagination() {
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let paginationHTML = `
    <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="fa fa-chevron-left"></i>
    </button>
  `;

  // Show page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationHTML += `<button onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="page-info">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">
        ${i}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="page-info">...</span>`;
    }
    paginationHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  paginationHTML += `
    <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
      <i class="fa fa-chevron-right"></i>
    </button>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderNews();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Filter news
function filterNews(filterType) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  switch(filterType) {
    case 'all':
      filteredNews = [...allNews];
      break;
    case 'recent':
      filteredNews = allNews.filter(article => {
        const articleDate = new Date(article.created_at);
        return articleDate >= oneWeekAgo;
      });
      break;
    case 'events':
      filteredNews = allNews.filter(article => 
        article.title.toLowerCase().includes('event') || 
        article.content.toLowerCase().includes('event')
      );
      break;
    case 'announcements':
      filteredNews = allNews.filter(article => 
        article.title.toLowerCase().includes('announcement') || 
        article.content.toLowerCase().includes('announcement')
      );
      break;
    default:
      filteredNews = [...allNews];
  }

  currentPage = 1;
  renderNews();
}

// Search news
function searchNews(query) {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    filteredNews = [...allNews];
  } else {
    filteredNews = allNews.filter(article => {
      const title = article.title.toLowerCase();
      const content = extractTextPreview(article.content, 500).toLowerCase();
      return title.includes(searchTerm) || content.includes(searchTerm);
    });
  }

  currentPage = 1;
  renderNews();
}

// Load all news
async function loadAllNews() {
  newsGrid.innerHTML = `
    <div class="news-loading">
      <i class="fa fa-spinner fa-spin"></i>
      <p>Loading news articles...</p>
    </div>
  `;
  
  try {
    const res = await fetch('http://localhost:3000/api/news/posts');
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      allNews = data.posts;
      filteredNews = [...allNews];
      renderNews();
    } else {
      newsGrid.innerHTML = `
        <div class="news-empty">
          <i class="fa fa-newspaper"></i>
          <h3>No News Yet</h3>
          <p>Check back soon for the latest updates from PUP Parañaque Campus.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading news:', err);
    newsGrid.innerHTML = `
      <div class="news-error">
        <i class="fa fa-exclamation-triangle"></i>
        <h3>Error Loading News</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
  searchNews(e.target.value);
});

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterNews(btn.dataset.filter);
  });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('newsModal');
    if (modal && modal.style.display === 'block') {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }
});

// Make changePage globally accessible
window.changePage = changePage;

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAllNews);
} else {
  loadAllNews();
}