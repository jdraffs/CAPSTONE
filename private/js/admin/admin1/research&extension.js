// research&extension.js - Updated with View Full Article feature
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
const API_BASE = 'http://localhost:3000/api/researchextension';
const trashModal = document.getElementById('trashModal');
const openTrashBtn = document.getElementById('openTrashBtn');
const closeTrashBtn = document.getElementById('closeTrashBtn');
const emptyTrashBtn = document.getElementById('emptyTrashBtn');
const trashItems = document.getElementById('trashItems');

let editingPostId = null;
let thumbnailFile = null;
let existingThumbnailId = null;

// Open modal for new post
openBtn.addEventListener('click', () => {
  // Prevent scrollbar jump
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = scrollbarWidth + 'px';
  document.body.style.overflow = 'hidden';
  
  modal.style.display = 'flex';
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
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
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

thumbnailUploadArea.addEventListener('click', (e) => {
  if (e.target.closest('.thumbnail-change-btn') || e.target.closest('.thumbnail-remove-btn')) {
    return;
  }
  thumbnailInput.click();
});

thumbnailInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  
  if (!file) return;
  
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    alertSystem.warning('Please select a valid image file (JPG, PNG, WEBP, or GIF)');
    thumbnailInput.value = '';
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alertSystem.warning('Image size must be less than 5MB');
    thumbnailInput.value = '';
    return;
  }
  
  thumbnailFile = file;
  previewThumbnail(file);
  updateSubmitButton();
});

function previewThumbnail(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    thumbnailImage.src = e.target.result;
    thumbnailPlaceholder.style.display = 'none';
    thumbnailPreview.style.display = 'block';
  };
  
  reader.readAsDataURL(file);
}

changeThumbnailBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  thumbnailInput.click();
});

removeThumbnailBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetThumbnail();
  updateSubmitButton();
});

function resetThumbnail() {
  thumbnailFile = null;
  existingThumbnailId = null;
  thumbnailInput.value = '';
  thumbnailImage.src = '';
  thumbnailPlaceholder.style.display = 'flex';
  thumbnailPreview.style.display = 'none';
}

function updateSubmitButton() {
  const hasTitle = postTitle.value.trim().length > 0;
  const hasContent = postText.innerHTML.trim().length > 0;
  const hasThumbnail = thumbnailFile !== null || existingThumbnailId !== null;
  
  submitBtn.disabled = !(hasTitle && hasContent && hasThumbnail);
}

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
    alertSystem.warning('Please add both a title and content for your article.');
    return;
  }
  
  if (!thumbnailFile && !existingThumbnailId) {
    alertSystem.warning('Please add a thumbnail image for your article.');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('adminid', 'adminave');

  if (thumbnailFile) {
    formData.append('thumbnail', thumbnailFile);
  }
  
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
      alertSystem.error(data.message || 'Something went wrong while saving your article.');
    }
  } catch (err) {
    console.error('Error submitting article:', err);
    alertSystem.error('Error submitting article. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingPostId ? 'Update Article' : 'Publish Article';
  }
});

// ========================================
// VIEW FULL ARTICLE MODAL
// ========================================

function showFullArticle(post) {
  let articleModal = document.getElementById('articleViewModal');
  if (!articleModal) {
    articleModal = document.createElement('div');
    articleModal.id = 'articleViewModal';
    articleModal.className = 'article-view-modal';
    document.body.appendChild(articleModal);
  }

  let featuredImageHtml = '';
  if (post.thumbnail_path) {
    featuredImageHtml = `
      <div class="article-full-image">
        <img src="http://localhost:3000${post.thumbnail_path}" alt="${post.title}">
      </div>
    `;
  }

  const date = new Date(post.created_at);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  articleModal.innerHTML = `
    <div class="article-view-modal-content">
      <span class="article-view-close">&times;</span>
      
      <div class="article-full-header">
        <h1 class="article-full-title">${post.title}</h1>
        <div class="article-full-meta">
          <span><i class="fa fa-calendar"></i> ${formattedDate}</span>
          <span><i class="fa fa-user"></i> Admin</span>
        </div>
      </div>
      
      ${featuredImageHtml}
      
      <div class="article-full-body">
        ${post.content}
      </div>
    </div>
  `;

  // Prevent scrollbar jump by calculating scrollbar width
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = scrollbarWidth + 'px';
  document.body.style.overflow = 'hidden';
  
  articleModal.style.display = 'block';

  const closeBtn = articleModal.querySelector('.article-view-close');
  closeBtn.onclick = () => {
    closeArticleModal();
  };

  articleModal.onclick = (e) => {
    if (e.target === articleModal) {
      closeArticleModal();
    }
  };
}

function closeArticleModal() {
  const articleModal = document.getElementById('articleViewModal');
  if (articleModal) {
    articleModal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

// Close article view modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const articleModal = document.getElementById('articleViewModal');
    if (articleModal && articleModal.style.display === 'block') {
      closeArticleModal();
    }
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

        const preview = extractTextPreview(post.content, 150);

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
            <button class="post-delete"><i class="fa-solid fa-trash"></i> Move to Trash</button>
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

        // Click on post card to view full article
        postElem.addEventListener('click', (e) => {
          // Don't trigger if clicking on menu button or dropdown
          if (e.target.closest('.researchextension-actions')) {
            return;
          }
          showFullArticle(post);
        });

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
          
          if (post.thumbnail_id && post.thumbnail_path) {
            existingThumbnailId = post.thumbnail_id;
            thumbnailImage.src = `http://localhost:3000${post.thumbnail_path}`;
            thumbnailPlaceholder.style.display = 'none';
            thumbnailPreview.style.display = 'block';
          }
          
          submitBtn.textContent = 'Update Article';
          
          // Prevent scrollbar jump
          const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
          document.body.style.paddingRight = scrollbarWidth + 'px';
          document.body.style.overflow = 'hidden';
          
          modal.style.display = 'flex';
          updateSubmitButton();
        });

        // Trash handler
postElem.querySelector('.post-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          // ✅ NEW: Beautiful confirm dialog
          const shouldDelete = await alertSystem.confirm(
            'Are you sure you want to move this article to trash?',
            'Move to Trash'
          );
          
          if (shouldDelete) {
            try {
              const response = await fetch(`http://localhost:3000/api/researchextension/trash/${post.id}`, { 
                method: 'PUT' 
              });
              const result = await response.json();
              
              if (result.success) {
                alertSystem.success('Article moved to trash successfully!');
                loadPosts();
              } else {
                alertSystem.error('Failed to move article to trash', 'Error');
              }
            } catch (err) {
              console.error('Error deleting article:', err);
              alertSystem.error('Error moving article to trash. Please try again.', 'Network Error');
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
// Open trash modal
openTrashBtn?.addEventListener('click', async () => {
  trashModal.style.display = 'flex';
  await loadTrash();
});

// Close trash modal
closeTrashBtn?.addEventListener('click', () => {
  trashModal.style.display = 'none';
});

// Close trash modal on outside click - UPDATE THIS SECTION
// Find the existing window.addEventListener('click') and update it to:
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
  if (e.target === trashModal) {
    trashModal.style.display = 'none';
  }
});

// Load trash items
async function loadTrash() {
  trashItems.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
  
  try {
    const res = await fetch(`${API_BASE}/trash`);
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      renderTrashItems(data.posts);
      emptyTrashBtn.disabled = false;
    } else {
      trashItems.innerHTML = `
        <div class="trash-empty">
          <i class="fa fa-trash"></i>
          <h3>Trash is empty</h3>
          <p>Deleted articles will appear here</p>
        </div>
      `;
      emptyTrashBtn.disabled = true;
    }
  } catch (err) {
    console.error('Error loading trash:', err);
    trashItems.innerHTML = `
      <div class="error-message">
        <i class="fa fa-exclamation-triangle"></i>
        <h3>Error loading trash</h3>
        <p>Please try again</p>
      </div>
    `;
    emptyTrashBtn.disabled = true;
  }
}

// Render trash items
function renderTrashItems(posts) {
  trashItems.innerHTML = '';
  
  posts.forEach(post => {
    const deletedDate = new Date(post.deleted_at);
    const formattedDate = deletedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const trashItem = document.createElement('div');
    trashItem.className = 'trash-item';
    trashItem.innerHTML = `
      <div class="trash-item-content">
        <div class="trash-item-title">${post.title || 'Untitled'}</div>
        <div class="trash-item-meta">
          <span><i class="fa fa-calendar"></i> Deleted: ${formattedDate}</span>
          ${post.thumbnail_path ? '<span><i class="fa fa-image"></i> Has thumbnail</span>' : ''}
        </div>
      </div>
      <div class="trash-item-actions">
        <button class="restore-btn" data-id="${post.id}">
          <i class="fa fa-undo"></i> Restore
        </button>
        <button class="delete-permanent-btn" data-id="${post.id}">
          <i class="fa fa-trash-alt"></i> Delete Permanently
        </button>
      </div>
    `;

    trashItem.querySelector('.restore-btn').addEventListener('click', async () => {
      if (confirm('Restore this article?')) {
        await restorePost(post.id);
      }
    });

    trashItem.querySelector('.delete-permanent-btn').addEventListener('click', async () => {
      if (confirm('Permanently delete this article? This action cannot be undone.')) {
        await deletePermanently(post.id);
      }
    });

    trashItems.appendChild(trashItem);
  });
}

// Restore post from trash
async function restorePost(id) {
  try {
    const res = await fetch(`${API_BASE}/restore/${id}`, {
      method: 'PUT'
    });
    const data = await res.json();

    if (data.success) {
      alertSystem.success('Article restored successfully');
      await loadTrash();
      loadPosts();
    } else {
      alertSystem.error('Failed to restore article');
    }
  } catch (err) {
    console.error('Error restoring article:', err);
    alertSystem.error('Error restoring article');
  }
}

// Delete post permanently
async function deletePermanently(id) {
  try {
    const res = await fetch(`${API_BASE}/delete/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.success) {
      alertSystem.success('Article permanently deleted');
      await loadTrash();
    } else {
      alertSystem.error('Failed to delete article');
    }
  } catch (err) {
    console.error('Error deleting article:', err);
    alertSystem.error('Error deleting article');
  }
}

// Empty trash
emptyTrashBtn?.addEventListener('click', async () => {
  if (confirm('Empty trash? All articles will be permanently deleted. This action cannot be undone.')) {
    try {
      const res = await fetch(`${API_BASE}/empty-trash`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        alertSystem.success(data.message);
        await loadTrash();
      } else {
        alertSystem.error('Failed to empty trash');
      }
    } catch (err) {
      console.error('Error emptying trash:', err);
      alertSystem.error('Error emptying trash');
    }
  }
});

function extractTextPreview(htmlContent, maxLength = 200) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

window.addEventListener('DOMContentLoaded', loadPosts);