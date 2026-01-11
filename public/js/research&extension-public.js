// research&extension-public.js - Complete public-facing article display
const postsContainer = document.getElementById('nstpPostsContainer');

// Extract text preview from HTML content
function extractTextPreview(htmlContent, maxLength = 150) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Show full article in modal
function showFullArticle(post) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('articleModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'articleModal';
    modal.className = 'article-modal';
    document.body.appendChild(modal);
  }

  // Get thumbnail image
  let featuredImageHtml = '';
  if (post.thumbnail_path) {
    featuredImageHtml = `
      <div class="article-full-image">
        <img src="http://localhost:3000${post.thumbnail_path}" alt="${post.title}">
      </div>
    `;
  }

  // Format date
  const date = new Date(post.created_at);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  modal.innerHTML = `
    <div class="article-modal-content">
      <span class="article-close">&times;</span>
      
      <div class="article-full-header">
        <h1 class="article-full-title">${post.title}</h1>
        <div class="article-full-meta">
          <span><i class="fa fa-calendar"></i> ${formattedDate}</span>
          <span><i class="fa fa-building"></i> PUP Parañaque</span>
        </div>
      </div>
      
      ${featuredImageHtml}
      
      <div class="article-full-body">
        ${post.content}
      </div>
    </div>
  `;

  modal.style.display = 'block';

  // Close modal handlers
  const closeBtn = modal.querySelector('.article-close');
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

// Load and display articles
async function loadArticles() {
  postsContainer.innerHTML = '<div class="posts-empty"><i class="fa fa-spinner fa-spin"></i></div>';
  
  try {
    const res = await fetch('http://localhost:3000/api/researchextension/posts');
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      postsContainer.innerHTML = '';
      
      data.posts.forEach(post => {
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card';
        articleCard.dataset.id = post.id;

        // Get thumbnail image
        let featuredImageHtml = '';
        if (post.thumbnail_path) {
          featuredImageHtml = `
            <div class="article-featured-image">
              <img src="http://localhost:3000${post.thumbnail_path}" alt="${post.title}">
            </div>
          `;
        } else {
          featuredImageHtml = `
            <div class="article-no-image">
              <i class="fa fa-book"></i>
            </div>
          `;
        }

        // Extract preview text
        const excerpt = extractTextPreview(post.content);

        // Format date
        const date = new Date(post.created_at);
        const formattedDate = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });

        articleCard.innerHTML = `
          ${featuredImageHtml}
          <div class="article-content">
            <h2 class="article-title">${post.title}</h2>
            <p class="article-excerpt">${excerpt}</p>
            <div class="article-meta">
              <span class="article-date">
                <i class="fa fa-calendar"></i>
                ${formattedDate}
              </span>
              <span class="article-read-more">
                Read article <i class="fa fa-arrow-right"></i>
              </span>
            </div>
          </div>
        `;

        // Click handler to show full article
        articleCard.addEventListener('click', () => {
          showFullArticle(post);
        });

        postsContainer.appendChild(articleCard);
      });
    } else {
      postsContainer.innerHTML = `
        <div class="posts-empty">
          <i class="fa fa-newspaper"></i>
          <h2>No Articles Yet</h2>
          <p>Check back soon for Research & Extension articles from PUP Parañaque Campus.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading articles:', err);
    postsContainer.innerHTML = `
      <div class="posts-empty">
        <i class="fa fa-exclamation-triangle"></i>
        <h2>Error Loading Articles</h2>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

// Load articles on page load
window.addEventListener('DOMContentLoaded', loadArticles);

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('articleModal');
    if (modal && modal.style.display === 'block') {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }
});