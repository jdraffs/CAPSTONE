// ojt.js - Fixed file list display
const openBtn = document.getElementById('openPostModal');
const modal = document.getElementById('postModal');
const cancelBtn = document.getElementById('cancelPost');
const submitBtn = document.getElementById('submitPost');
const feed = document.getElementById('postFeed');
const postTitle = document.getElementById('postTitle');
const postText = document.getElementById('postText');
const fileUpload = document.getElementById('fileUpload');
const fileListContainer = document.getElementById('fileList');
const toolbarButtons = document.querySelectorAll('.post-toolbar button');
const fontSizeSelect = document.getElementById('fontSize');
const API_BASE = 'http://localhost:3000/api/ojt';
const trashModal = document.getElementById('trashModal');
const openTrashBtn = document.getElementById('openTrashBtn');
const closeTrashBtn = document.getElementById('closeTrashBtn');
const emptyTrashBtn = document.getElementById('emptyTrashBtn');
const trashItems = document.getElementById('trashItems');

let editingPostId = null;
let selectedFiles = [];
let existingFiles = [];

openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  postTitle.focus();
  submitBtn.textContent = 'Post';
  editingPostId = null;
  selectedFiles = [];
  existingFiles = [];
  updateFileList();
});

cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  clearForm();
});

function clearForm() {
  postTitle.value = '';
  postText.innerHTML = '';
  fileUpload.value = '';
  selectedFiles = [];
  existingFiles = [];
  updateFileList();
  editingPostId = null;
}

// ✅ FIXED: File upload handler with proper debugging
fileUpload.addEventListener('change', (e) => {
  console.log('File input changed!'); // Debug log
  console.log('Files selected:', e.target.files); // Debug log
  
  const newFiles = Array.from(e.target.files);
  console.log('New files array:', newFiles); // Debug log
  
  const totalFiles = selectedFiles.length + existingFiles.length + newFiles.length;
  
  if (totalFiles > 3) {
    alertSystem.warning('You can only upload up to 3 files per post.');
    fileUpload.value = '';
    return;
  }
  
  selectedFiles = [...selectedFiles, ...newFiles];
  console.log('Selected files after update:', selectedFiles); // Debug log
  
  fileUpload.value = ''; // Reset input
  updateFileList(); // Update the display
});

function sortFilesByType(files) {
  return files.sort((a, b) => {
    // Handle both database files and browser File objects
    const aIsImage = isImageFile(a.file_type || a.type);
    const bIsImage = isImageFile(b.file_type || b.type);
    
    if (aIsImage && !bIsImage) return -1;
    if (!aIsImage && bIsImage) return 1;
    return 0;
  });
}

// ✅ FIXED: Updated file list display with better styling and debugging
function updateFileList() {
  console.log('Updating file list...');
  console.log('Existing files:', existingFiles);
  console.log('Selected files:', selectedFiles);
  
  fileListContainer.innerHTML = '';
  
  // ✅ FIX: Don't spread File objects - keep them as-is and add metadata separately
  const allFiles = [];
  
  // Add existing files (from database)
  existingFiles.forEach((file, index) => {
    allFiles.push({
      fileData: file,
      isExisting: true,
      originalIndex: index
    });
  });
  
  // Add selected files (browser File objects)
  selectedFiles.forEach((file, index) => {
    allFiles.push({
      fileData: file,
      isExisting: false,
      originalIndex: index
    });
  });
  
  console.log('All files combined:', allFiles);
  
  // Sort by file type (images first)
  const sortedFiles = allFiles.sort((a, b) => {
    const aType = a.isExisting ? a.fileData.file_type : a.fileData.type;
    const bType = b.isExisting ? b.fileData.file_type : b.fileData.type;
    
    const aIsImage = aType && aType.includes('image/');
    const bIsImage = bType && bType.includes('image/');
    
    if (aIsImage && !bIsImage) return -1;
    if (!aIsImage && bIsImage) return 1;
    return 0;
  });
  
  sortedFiles.forEach((item) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    let fileName, fileSize, fileType;
    
    if (item.isExisting) {
      // Database file (from existing post)
      fileName = item.fileData.file_name || 'Unknown file';
      fileSize = item.fileData.file_size || 0;
      fileType = item.fileData.file_type || '';
    } else {
      // Browser File object (newly selected)
      // Access properties directly from the File object
      fileName = item.fileData.name || 'Unknown file';
      fileSize = item.fileData.size || 0;
      fileType = item.fileData.type || '';
    }
    
    console.log('File item:', { fileName, fileSize, fileType, isExisting: item.isExisting });
    
    fileItem.innerHTML = `
      <i class="fa ${getFileIcon(fileType)}" style="color: #666; font-size: 18px;"></i>
      <span class="file-name" style="flex: 1;">${fileName}</span>
      <span class="file-size" style="color: #999; font-size: 12px; margin-right: 10px;">${formatFileSize(fileSize)}</span>
      <button type="button" class="remove-file-btn" ${item.isExisting ? `data-existing-index="${item.originalIndex}"` : `data-new-index="${item.originalIndex}"`}>
        <i class="fa fa-times" style="color: #ff4d4d;"></i>
      </button>
    `;
    fileListContainer.appendChild(fileItem);
  });
  
  console.log('File list updated. Items in container:', fileListContainer.children.length);
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const existingIndex = btn.dataset.existingIndex;
      const newIndex = btn.dataset.newIndex;
      
      console.log('Removing file - existing index:', existingIndex, 'new index:', newIndex);
      
      if (existingIndex !== undefined) {
        existingFiles.splice(parseInt(existingIndex), 1);
      } else if (newIndex !== undefined) {
        selectedFiles.splice(parseInt(newIndex), 1);
      }
      
      updateFileList();
    });
  });
}

function getFileIcon(mimeType) {
  if (!mimeType) return 'fa-file';
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('word')) return 'fa-file-word';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
  if (mimeType.includes('image')) return 'fa-file-image';
  if (mimeType.includes('text')) return 'fa-file-alt';
  return 'fa-file';
}

function isImageFile(mimeType) {
  return mimeType && mimeType.includes('image/');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

toolbarButtons.forEach(button => {
  button.addEventListener('click', () => {
    const command = button.getAttribute('data-command');
    if (command === 'highlight') {
      document.execCommand('backColor', false, 'yellow');
    } else {
      document.execCommand(command, false, null);
    }
  });
});

fontSizeSelect.addEventListener('change', () => {
  document.execCommand('fontSize', false, fontSizeSelect.value);
});

submitBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const title = postTitle.value.trim();
  const content = postText.innerHTML.trim();
  
  if (!title && !content && selectedFiles.length === 0 && existingFiles.length === 0) {
    alertSystem.warning('Please add a title, content, or files before posting.');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('adminid', 'adminave');

  selectedFiles.forEach(file => {
    formData.append('files', file);
  });
  
  if (editingPostId) {
    const keepFileIds = existingFiles.map(f => f.id);
    formData.append('keepFiles', JSON.stringify(keepFileIds));
  }

  let url = '';
  let method = '';

  if (editingPostId) {
    url = `http://localhost:3000/api/ojt/update/${editingPostId}`;
    method = 'PUT';
  } else {
    url = 'http://localhost:3000/api/ojt/create';
    method = 'POST';
  }

  try {
    const res = await fetch(url, {
      method,
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      clearForm();
      modal.style.display = 'none';
      loadPosts();
    } else {
      alertSystem.error('Something went wrong while saving your OJT post.');
    }
  } catch (err) {
    console.error('Error submitting OJT post:', err);
    alertSystem.error('Error submitting post. Please try again.');
  }
});

window.addEventListener('click', e => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

async function loadPosts() {
  feed.innerHTML = '';
  
  try {
    const res = await fetch('http://localhost:3000/api/ojt/posts');
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      data.posts.forEach(post => {
        const postElem = document.createElement('div');
        postElem.classList.add('ojt-post');
        postElem.dataset.id = post.id;

        let filesHtml = '';
        if (post.files && post.files.length > 0) {
          const sortedFiles = sortFilesByType([...post.files]);
          
          filesHtml = '<div class="post-files">';
          
          sortedFiles.forEach(file => {
            const icon = getFileIcon(file.file_type);
            
            if (isImageFile(file.file_type)) {
              filesHtml += `
                <div class="post-file-item image">
                  <img src="http://localhost:3000${file.file_path}" alt="${file.file_name}">
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

        postElem.innerHTML = `
          <div class="ojt-actions">
            <button class="post-menu-btn">
              <i class="fa-solid fa-ellipsis-v"></i>
            </button>
            <div class="post-menu-dropdown" style="display: none;">
              <button class="post-edit"><i class="fa-solid fa-pen"></i> Edit</button>
              <button class="post-delete"><i class="fa-solid fa-trash"></i>Add to trash</button>
            </div>
          </div>
          <h1>${post.title}</h1>
          <div class="ojt-content">${post.content}</div>
          ${filesHtml}
          <div class="ojt-divider"><span>${new Date(post.created_at).toLocaleString()}</span></div>
        `;

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

        postElem.querySelector('.post-edit').addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          editingPostId = post.id;
          postTitle.value = post.title;
          postText.innerHTML = post.content;
          existingFiles = post.files || [];
          selectedFiles = [];
          updateFileList();
          submitBtn.textContent = 'Update';
          modal.style.display = 'flex';
        });

        postElem.querySelector('.post-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          if (confirm('Move this post to trash?')) {
            try {
              const response = await fetch(`${API_BASE}/trash/${post.id}`, { 
                method: 'PUT'  // Changed from DELETE to PUT
              });
              const result = await response.json();
              
              if (result.success) {
                loadPosts(); // Reload the feed
              } else {
                alertSystem.error('Failed to move post to trash');
              }
            } catch (err) {
              console.error('Error moving post to trash:', err);
              alertSystem.error('Error moving post to trash');
            }
          }
        });

        feed.appendChild(postElem);
      });
    } else {
      feed.innerHTML = `
        <div class="post-placeholder">
          <i class="fa-solid fa-briefcase"></i>
          <h2>No OJT posts yet</h2>
          <p>Share OJT updates and files here to keep everyone informed.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading OJT posts:', err);
    feed.innerHTML = `
      <div class="post-placeholder">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h2>Error loading posts</h2>
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

// Close trash modal on outside click
window.addEventListener('click', (e) => {
  if (e.target === trashModal) {
    trashModal.style.display = 'none';
  }
});

// Load trash items
async function loadTrash() {
  trashItems.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  
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
          <p>Deleted items will appear here</p>
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

    const fileCount = post.files ? post.files.length : 0;

    const trashItem = document.createElement('div');
    trashItem.className = 'trash-item';
    trashItem.innerHTML = `
      <div class="trash-item-content">
        <div class="trash-item-title">${post.title || 'Untitled'}</div>
        <div class="trash-item-meta">
          <span><i class="fa fa-calendar"></i> Deleted: ${formattedDate}</span>
          ${fileCount > 0 ? `<span><i class="fa fa-paperclip"></i> ${fileCount} file(s)</span>` : ''}
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

    // Restore button handler
    trashItem.querySelector('.restore-btn').addEventListener('click', async () => {
      if (confirm('Restore this post?')) {
        await restorePost(post.id);
      }
    });

    // Delete permanently button handler
    trashItem.querySelector('.delete-permanent-btn').addEventListener('click', async () => {
      if (confirm('Permanently delete this post? This action cannot be undone.')) {
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
      alertSystem.success('Post restored successfully');
      await loadTrash();
      loadPosts(); // Reload main feed
    } else {
      alertSystem.error('Failed to restore post');
    }
  } catch (err) {
    console.error('Error restoring post:', err);
    alertSystem.error('Error restoring post');
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
      alertSystem.success('Post permanently deleted');
      await loadTrash();
    } else {
      alertSystem.error('Failed to delete post');
    }
  } catch (err) {
    console.error('Error deleting post:', err);
    alertSystem.error('Error deleting post');
  }
}

// Empty trash
emptyTrashBtn?.addEventListener('click', async () => {
  if (confirm('Empty trash? All items will be permanently deleted. This action cannot be undone.')) {
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

window.addEventListener('DOMContentLoaded', loadPosts);