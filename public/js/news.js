// /public/js/news.js - Homepage news display (shows first 3 articles)
const newsGrid = document.getElementById('news-grid');

// Extract text preview from HTML content
function extractTextPreview(htmlContent, maxLength = 150) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Show full article in modal
function showFullNewsArticle(article) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('newsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'newsModal';
    modal.className = 'news-modal';
    document.body.appendChild(modal);
  }

  // Get thumbnail image
  let featuredImageHtml = '';
  if (article.thumbnail_path) {
    featuredImageHtml = `
      <div class="news-full-image">
        <img src="http://localhost:3000${article.thumbnail_path}" alt="${article.title}">
      </div>
    `;
  }

  // Format date
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

  // Close modal handlers
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

  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden';
}

// Load and display news articles
async function loadNews() {
  if (!newsGrid) return;
  
  newsGrid.innerHTML = '<div class="news-loading"><i class="fa fa-spinner fa-spin"></i></div>';
  
  try {
    const res = await fetch('http://localhost:3000/api/news/posts');
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      newsGrid.innerHTML = '';
      
      // Show only first 3 news articles on homepage
      const displayPosts = data.posts.slice(0, 3);
      
      displayPosts.forEach(article => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        newsCard.dataset.id = article.id;

        // Get thumbnail image
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

        // Extract preview text
        const excerpt = extractTextPreview(article.content);

        // Format date
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

        // Click handler to show full article
        newsCard.addEventListener('click', () => {
          showFullNewsArticle(article);
        });

        newsGrid.appendChild(newsCard);
      });

      // Update "View All News" button link
      const viewAllBtn = document.querySelector('.view-more .button');
      if (viewAllBtn) {
        viewAllBtn.href = '/public/html/News/all-news.html';
      }
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

// Load news when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNews);
} else {
  loadNews();
}