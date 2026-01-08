// research&extension.js - Updated with single thumbnail support
const openBtn = document.getElementById('openPostModal');
const modal = document.getElementById('postModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelPost');
const submitBtn = document.getElementById('submitPost');
const feed = document.getElementById('postFeed');
const postTitle = document.getElementById('postTitle');
const postText = document.getElementById('postText');
const thumbnailInput = document.getElementById('thumbnailInput');
const thumbnailUploadArea = document.getElementById('thumbnailUploadArea');
const thumbnailPlaceholder = document.getElementById('thumbnailPlaceholder');
const thumbnailPreview = document.getElementById('thumbnailPreview');
const thumbnailImage = document.getElementById('thumbnailImage');
const changeThumbnailBtn = document.getElementById('changeThumbnailBtn');
const removeThumbnailBtn = document.getElementById('removeThumbnailBtn');
const toolbarButtons = document.querySelectorAll('.post-toolbar button[data-command]');
const fontSizeSelect = document.getElementById('fontSize');

let editingPostId = null;
let thumbnailFile = null;
let existingThumbnailId = null;

// Open modal for new post
openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  postTitle.focus();
  submitBtn.textContent = 'Publish Article';
  editingPostId = null;
  resetThumbnail();
  updateSubmitButton();
});

// Close modal handlers
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  clearForm();
}

// Close modal on outside click
window.addEventListener('click', e => {
  if (e.target === modal) {
    closeModal();
  }
});

// Clear form
function clearForm() {
  postTitle.value = '';
  postText.innerHTML = '';
  resetThumbnail();
  editingPostId = null;
  existingThumbnailId = null;
}

// ========================================
// THUMBNAIL HANDLING
// ========================================

// Click on upload area to trigger file input
thumbnailUploadArea.addEventListener('click', (e) => {
  if (e.target.closest('.thumbnail-change-btn') || e.target.closest('.thumbnail-remove-btn')) {
    return; // Don't trigger if clicking action buttons
  }
  thumbnailInput.click();
});

// Handle thumbnail selection
thumbnailInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  
  if (!file) return;
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    alert('Please select a valid image file (JPG, PNG, WEBP, or GIF)');
    thumbnailInput.value = '';
    return;
  }
  
  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size must be less than 5MB');
    thumbnailInput.value = '';
    return;
  }
  
  thumbnailFile = file;
  previewThumbnail(file);
  updateSubmitButton();
});

// Preview thumbnail image
function previewThumbnail(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    thumbnailImage.src = e.target.result;
    thumbnailPlaceholder.style.display = 'none';
    thumbnailPreview.style.display = 'block';
  };
  
  reader.readAsDataURL(file);
}

// Change thumbnail button
changeThumbnailBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  thumbnailInput.click();
});

// Remove thumbnail button
removeThumbnailBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetThumbnail();
  updateSubmitButton();
});

// Reset thumbnail to initial state
function resetThumbnail() {
  thumbnailFile = null;
  existingThumbnailId = null;
  thumbnailInput.value = '';
  thumbnailImage.src = '';
  thumbnailPlaceholder.style.display = 'flex';
  thumbnailPreview.style.display = 'none';
}

// Update submit button state
function updateSubmitButton() {
  const hasTitle = postTitle.value.trim().length > 0;
  const hasContent = postText.innerHTML.trim().length > 0;
  const hasThumbnail = thumbnailFile !== null || existingThumbnailId !== null;
  
  submitBtn.disabled = !(hasTitle && hasContent && hasThumbnail);
}

// Monitor form changes
postTitle.addEventListener('input', updateSubmitButton);
postText.addEventListener('input', updateSubmitButton);

// ========================================
// RICH TEXT EDITING TOOLBAR
// ========================================

toolbarButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const command = button.getAttribute('data-command');
    if (command === 'highlight') {
      document.execCommand('backColor', false, 'yellow');
    } else {
      document.execCommand(command, false, null);
    }
    postText.focus();
  });
});

fontSizeSelect.addEventListener('change', () => {
  document.execCommand('fontSize', false, fontSizeSelect.value);
  postText.focus();
});

// ========================================
// SUBMIT POST (CREATE OR UPDATE)
// ========================================

submitBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const title = postTitle.value.trim();
  const content = postText.innerHTML.trim();
  
  if (!title || !content) {
    alert('Please add both a title and content for your article.');
    return;
  }
  
  if (!thumbnailFile && !existingThumbnailId) {
    alert('Please add a thumbnail image for your article.');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('adminid', 'adminave');

  // Only append thumbnail if a new one was selected
  if (thumbnailFile) {
    formData.append('thumbnail', thumbnailFile);
  }
  
  // If editing and keeping existing thumbnail
  if (editingPostId && existingThumbnailId && !thumbnailFile) {
    formData.append('keepThumbnail', existingThumbnailId);
  }

  let url = '';
  let method = '';

  if (editingPostId) {
    url = `http://localhost:3000/api/researchextension/update/${editingPostId}`;
    method = 'PUT';
  } else {
    url = 'http://localhost:3000/api/researchextension/create';
    method = 'POST';
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = editingPostId ? 'Updating...' : 'Publishing...';

  try {
    const res = await fetch(url, {
      method,
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      closeModal();
      loadPosts();
    } else {
      alert(data.message || 'Something went wrong while saving your article.');
    }
  } catch (err) {
    console.error('Error submitting article:', err);
    alert('Error submitting article. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingPostId ? 'Update Article' : 'Publish Article';
  }
});

// ========================================
// LOAD AND DISPLAY POSTS
// ========================================

async function loadPosts() {
  feed.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  
  try {
    const res = await fetch('http://localhost:3000/api/researchextension/posts');
    const data = await res.json();

    feed.innerHTML = '';

    if (data.success && data.posts.length > 0) {
      data.posts.forEach(post => {
        const postElem = document.createElement('div');
        postElem.classList.add('researchextension-post');
        postElem.dataset.id = post.id;

        // Extract text preview from HTML content
        const preview = extractTextPreview(post.content, 150);

        // Format date
        const postDate = new Date(post.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

        postElem.innerHTML = `
          <div class="researchextension-actions">
            <button class="post-menu-btn">
              <i class="fa-solid fa-ellipsis-v"></i>
            </button>
            <div class="post-menu-dropdown" style="display: none;">
              <button class="post-edit"><i class="fa-solid fa-pen"></i> Edit Article</button>
              <button class="post-delete"><i class="fa-solid fa-trash"></i> Delete Article</button>
            </div>
          </div>
          <div class="post-thumbnail">
            <img src="http://localhost:3000${post.thumbnail_path}" alt="${post.title}">
          </div>
          <div class="post-content-area">
            <h1>${post.title}</h1>
            <div class="post-content">${preview}</div>
            <div class="post-meta">
              <div class="post-meta-item">
                <i class="fa fa-calendar"></i>
                <span>${postDate}</span>
              </div>
              <div class="post-meta-item">
                <i class="fa fa-user"></i>
                <span>Admin</span>
              </div>
            </div>
          </div>
        `;

        // Menu dropdown handlers
        const menuBtn = postElem.querySelector('.post-menu-btn');
        const dropdown = postElem.querySelector('.post-menu-dropdown');
        
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.post-menu-dropdown').forEach(d => {
            if (d !== dropdown) d.style.display = 'none';
          });
          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', () => {
          dropdown.style.display = 'none';
        });

        // Edit handler
        postElem.querySelector('.post-edit').addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          editingPostId = post.id;
          postTitle.value = post.title;
          postText.innerHTML = post.content;
          
          // Load existing thumbnail
          if (post.thumbnail_id && post.thumbnail_path) {
            existingThumbnailId = post.thumbnail_id;
            thumbnailImage.src = `http://localhost:3000${post.thumbnail_path}`;
            thumbnailPlaceholder.style.display = 'none';
            thumbnailPreview.style.display = 'block';
          }
          
          submitBtn.textContent = 'Update Article';
          modal.style.display = 'flex';
          document.body.style.overflow = 'hidden';
          updateSubmitButton();
        });

        // Delete handler
        postElem.querySelector('.post-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          if (confirm('Are you sure you want to delete this article and its thumbnail?')) {
            try {
              const response = await fetch(`http://localhost:3000/api/researchextension/delete/${post.id}`, { 
                method: 'DELETE' 
              });
              const result = await response.json();
              
              if (result.success) {
                loadPosts();
              } else {
                alert('Failed to delete article');
              }
            } catch (err) {
              console.error('Error deleting article:', err);
              alert('Error deleting article');
            }
          }
        });

        feed.appendChild(postElem);
      });
    } else {
      feed.innerHTML = `
        <div class="post-placeholder">
          <i class="fa-solid fa-newspaper"></i>
          <h2>No articles yet</h2>
          <p>Start writing your first Research & Extension article to share knowledge with the community.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading articles:', err);
    feed.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h3>Error loading articles</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

// Extract text preview from HTML content
function extractTextPreview(htmlContent, maxLength = 200) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Load posts on page load
window.addEventListener('DOMContentLoaded', loadPosts);