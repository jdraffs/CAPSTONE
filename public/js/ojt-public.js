// ojt-public.js - Fetch and display OJT posts from backend
const postsContainer = document.getElementById('ojtPostsContainer');

// Utility function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Utility function to get file icon based on MIME type
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

// Sort files so images appear first
function sortFilesByType(files) {
  return files.sort((a, b) => {
    const aIsImage = isImageFile(a.file_type);
    const bIsImage = isImageFile(b.file_type);
    
    if (aIsImage && !bIsImage) return -1;
    if (!aIsImage && bIsImage) return 1;
    return 0;
  });
}

// Format date to readable format
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleDateString('en-US', options);
}

// Create HTML for a single post
function createPostHTML(post) {
  const formattedDate = formatDate(post.created_at);
  
  // Process files if they exist
  let filesHtml = '';
  if (post.files && post.files.length > 0) {
    const sortedFiles = sortFilesByType([...post.files]);
    
    filesHtml = '<div class="post-files">';
    
    sortedFiles.forEach(file => {
      const icon = getFileIcon(file.file_type);
      
      if (isImageFile(file.file_type)) {
        // Image file
        filesHtml += `
          <div class="post-file-item image">
            <img src="http://localhost:3000${file.file_path}" alt="${file.file_name}" loading="lazy">
            <div class="download-icon">
              <i class="fa fa-download"></i>
            </div>
            <div class="image-overlay">
              <a href="http://localhost:3000${file.file_path}" target="_blank" download="${file.file_name}">
                ${file.file_name}
              </a>
              <span class="file-size">${formatFileSize(file.file_size)}</span>
            </div>
          </div>
        `;
      } else {
        // Document file
        filesHtml += `
          <div class="post-file-item document">
            <i class="fa ${icon} file-icon"></i>
            <div class="file-details">
              <a href="http://localhost:3000${file.file_path}" target="_blank" download="${file.file_name}">
                ${file.file_name}
              </a>
              <span class="file-size">${formatFileSize(file.file_size)}</span>
            </div>
          </div>
        `;
      }
    });
    
    filesHtml += '</div>';
  }

  // Create the complete post HTML
  return `
    <article class="ojt-public-post">
      <div class="post-header">
        <div class="post-author-info">
          <div class="author-avatar">
            <i class="fas fa-briefcase"></i>
          </div>
          <div class="author-details">
            <h3 class="author-name">OJT Office</h3>
            <p class="post-timestamp">${formattedDate}</p>
          </div>
        </div>
      </div>

      <div class="post-body">
        <h2 class="post-title">${post.title || 'Untitled Post'}</h2>
        <div class="post-content">
          ${post.content || ''}
        </div>
        ${filesHtml}
      </div>

      <div class="post-footer">
        <div class="post-interactions">
          <button class="interaction-btn like-btn" disabled>
            <i class="far fa-thumbs-up"></i>
            <span>Like</span>
          </button>
          <button class="interaction-btn comment-btn" disabled>
            <i class="far fa-comment"></i>
            <span>Comment</span>
          </button>
        </div>

        <div class="comment-section">
          <div class="comment-input-wrapper">
            <div class="comment-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <input 
              type="text" 
              class="comment-input" 
              placeholder="Comments are currently disabled" 
              disabled
            />
          </div>
          <p class="comment-notice">
            <i class="fas fa-info-circle"></i> 
            Interaction features coming soon
          </p>
        </div>
      </div>
    </article>
  `;
}

// Display loading state
function showLoading() {
  postsContainer.innerHTML = `
    <div class="loading-container" style="text-align: center; padding: 60px 20px; color: #605e5c;">
      <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #822020; margin-bottom: 20px;"></i>
      <p style="font-size: 16px;">Loading OJT announcements...</p>
    </div>
  `;
}

// Display empty state
function showEmptyState() {
  postsContainer.innerHTML = `
    <div class="empty-state" style="text-align: center; padding: 80px 20px; color: #605e5c;">
      <i class="fas fa-inbox" style="font-size: 64px; color: #d2d0ce; margin-bottom: 20px;"></i>
      <h2 style="font-size: 24px; margin-bottom: 12px; color: #323130;">No Announcements Yet</h2>
      <p style="font-size: 16px; max-width: 500px; margin: 0 auto;">
        Check back later for updates from the OJT Office regarding partner companies, deployment schedules, and requirements.
      </p>
    </div>
  `;
}

// Display error state
function showError(message) {
  postsContainer.innerHTML = `
    <div class="error-state" style="text-align: center; padding: 60px 20px;">
      <i class="fas fa-exclamation-circle" style="font-size: 64px; color: #d13438; margin-bottom: 20px;"></i>
      <h2 style="font-size: 24px; margin-bottom: 12px; color: #323130;">Unable to Load Announcements</h2>
      <p style="font-size: 16px; color: #605e5c; margin-bottom: 20px;">
        ${message || 'Please check your connection and try again.'}
      </p>
      <button 
        onclick="loadOJTPosts()" 
        style="
          padding: 10px 24px; 
          background: #822020; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          font-size: 14px; 
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        "
        onmouseover="this.style.background='#a02828'"
        onmouseout="this.style.background='#822020'"
      >
        <i class="fas fa-redo"></i> Retry
      </button>
    </div>
  `;
}

// Main function to load and display OJT posts
async function loadOJTPosts() {
  showLoading();

  try {
    const response = await fetch('http://localhost:3000/api/ojt/posts');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.posts && data.posts.length > 0) {
      // Clear container and add all posts
      postsContainer.innerHTML = '';
      
      data.posts.forEach(post => {
        const postHTML = createPostHTML(post);
        postsContainer.innerHTML += postHTML;
      });
    } else {
      // No posts available
      showEmptyState();
    }
  } catch (error) {
    console.error('Error loading OJT posts:', error);
    showError('There was a problem connecting to the server.');
  }
}

// Load posts when page loads
window.addEventListener('DOMContentLoaded', loadOJTPosts);

// Optional: Auto-refresh posts every 5 minutes (300000 ms)
// Uncomment the line below if you want auto-refresh
// setInterval(loadOJTPosts, 300000);