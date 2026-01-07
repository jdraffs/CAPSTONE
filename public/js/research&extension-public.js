// research&extension-public.js - Medium-style Article Display for Public
const postsContainer = document.getElementById('nstpPostsContainer');

// Get file icon based on MIME type
function getFileIcon(mimeType) {
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('word')) return 'fa-file-word';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
  if (mimeType.includes('image')) return 'fa-file-image';
  if (mimeType.includes('text')) return 'fa-file-alt';
  return 'fa-file';
}

// Check if file is an image
function isImageFile(mimeType) {
  return mimeType && mimeType.includes('image/');
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Extract text preview from HTML content
function extractTextPreview(htmlContent, maxLength = 150) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Get attachment badge class
function getAttachmentBadgeClass(mimeType) {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ppt';
  return '';
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

  // Get featured image
  let featuredImageHtml = '';
  let attachmentsHtml = '';
  
  if (post.files && post.files.length > 0) {
    const images = post.files.filter(f => isImageFile(f.file_type));
    const documents = post.files.filter(f => !isImageFile(f.file_type));
    
    // Featured image
    if (images.length > 0) {
      featuredImageHtml = `
        <div class="article-full-image">
          <img src="http://localhost:3000${images[0].file_path}" alt="${post.title}">
        </div>
      `;
    }
    
    // Document attachments
    if (documents.length > 0) {
      attachmentsHtml = `
        <div class="article-full-attachments">
          <h3>Attachments</h3>
          <div class="attachment-list">
      `;
      
      documents.forEach(file => {
        const icon = getFileIcon(file.file_type);
        attachmentsHtml += `
          <a href="http://localhost:3000${file.file_path}" target="_blank" download="${file.file_name}" class="attachment-item">
            <i class="fa ${icon} attachment-icon"></i>
            <div class="attachment-info">
              <div class="attachment-name">${file.file_name}</div>
              <div class="attachment-size">${formatFileSize(file.file_size)}</div>
            </div>
            <i class="fa fa-download attachment-download"></i>
          </a>
        `;
      });
      
      attachmentsHtml += `
          </div>
        </div>
      `;
    }
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
      
      ${attachmentsHtml}
    </div>
  `;

  modal.style.display = 'block';

  // Close modal handlers
  const closeBtn = modal.querySelector('.article-close');
  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };

  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden';
  
  // Restore body scroll when modal closes
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('article-close')) {
      document.body.style.overflow = 'auto';
    }
  });
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

        // Get featured image and documents
        let featuredImageHtml = '';
        let attachmentBadges = '';
        
        if (post.files && post.files.length > 0) {
          const images = post.files.filter(f => isImageFile(f.file_type));
          const documents = post.files.filter(f => !isImageFile(f.file_type));
          
          // Featured image
          if (images.length > 0) {
            featuredImageHtml = `
              <div class="article-featured-image">
                <img src="http://localhost:3000${images[0].file_path}" alt="${post.title}">
              </div>
            `;
          } else {
            featuredImageHtml = `
              <div class="article-no-image">
                <i class="fa fa-book"></i>
              </div>
            `;
          }
          
          // Document badges
          if (documents.length > 0) {
            attachmentBadges = '<div class="article-attachments">';
            documents.forEach(file => {
              const icon = getFileIcon(file.file_type);
              const badgeClass = getAttachmentBadgeClass(file.file_type);
              attachmentBadges += `
                <span class="attachment-badge ${badgeClass}">
                  <i class="fa ${icon}"></i>
                  ${file.file_name.length > 20 ? file.file_name.substring(0, 20) + '...' : file.file_name}
                </span>
              `;
            });
            attachmentBadges += '</div>';
          }
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
            ${attachmentBadges}
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