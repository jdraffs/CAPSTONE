// research&extension.js - Medium-style Article Editor for Admin
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

let editingPostId = null;
let selectedFiles = [];
let existingFiles = [];

// Open modal for new post
openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  postTitle.focus();
  submitBtn.textContent = 'Publish';
  editingPostId = null;
  selectedFiles = [];
  existingFiles = [];
  updateFileList();
});

// Close modal
cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  clearForm();
});

// Clear form
function clearForm() {
  postTitle.value = '';
  postText.innerHTML = '';
  fileUpload.value = '';
  selectedFiles = [];
  existingFiles = [];
  updateFileList();
  editingPostId = null;
}

// Handle file uploads
fileUpload.addEventListener('change', (e) => {
  const newFiles = Array.from(e.target.files);
  const totalFiles = selectedFiles.length + existingFiles.length + newFiles.length;
  
  if (totalFiles > 3) {
    alert('You can only upload up to 3 files per article.');
    fileUpload.value = '';
    return;
  }
  
  selectedFiles = [...selectedFiles, ...newFiles];
  fileUpload.value = '';
  updateFileList();
});

// Sort files: images first, then documents
function sortFilesByType(files) {
  return files.sort((a, b) => {
    const aIsImage = isImageFile(a.file_type || a.type);
    const bIsImage = isImageFile(b.file_type || b.type);
    
    if (aIsImage && !bIsImage) return -1;
    if (!aIsImage && bIsImage) return 1;
    return 0;
  });
}

// Update file list display
function updateFileList() {
  fileListContainer.innerHTML = '';
  
  const allFiles = [
    ...existingFiles.map((file, index) => ({ ...file, isExisting: true, originalIndex: index })),
    ...selectedFiles.map((file, index) => ({ ...file, isExisting: false, originalIndex: index }))
  ];
  
  const sortedFiles = sortFilesByType(allFiles);
  
  sortedFiles.forEach((file) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    const fileName = file.file_name || file.name;
    const fileSize = file.file_size || file.size;
    const fileType = file.file_type || file.type;
    
    fileItem.innerHTML = `
      <i class="fa ${getFileIcon(fileType)}"></i>
      <span class="file-name">${fileName}</span>
      <span class="file-size">${formatFileSize(fileSize)}</span>
      <button type="button" class="remove-file-btn" ${file.isExisting ? `data-existing-index="${file.originalIndex}"` : `data-new-index="${file.originalIndex}"`}>
        <i class="fa fa-times"></i>
      </button>
    `;
    fileListContainer.appendChild(fileItem);
  });
  
  // Add remove handlers
  document.querySelectorAll('.remove-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const existingIndex = btn.dataset.existingIndex;
      const newIndex = btn.dataset.newIndex;
      
      if (existingIndex !== undefined) {
        existingFiles.splice(parseInt(existingIndex), 1);
      } else if (newIndex !== undefined) {
        selectedFiles.splice(parseInt(newIndex), 1);
      }
      
      updateFileList();
    });
  });
}

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

// Rich text editing toolbar
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

// Font size selector
fontSizeSelect.addEventListener('change', () => {
  document.execCommand('fontSize', false, fontSizeSelect.value);
});

// Submit post (create or update)
submitBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const title = postTitle.value.trim();
  const content = postText.innerHTML.trim();
  
  if (!title || !content) {
    alert('Please add both a title and content for your article.');
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
    url = `http://localhost:3000/api/researchextension/update/${editingPostId}`;
    method = 'PUT';
  } else {
    url = 'http://localhost:3000/api/researchextension/create';
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
      alert('Something went wrong while saving your article.');
    }
  } catch (err) {
    console.error('Error submitting article:', err);
    alert('Error submitting article. Please try again.');
  }
});

// Close modal on outside click
window.addEventListener('click', e => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Extract text preview from HTML content
function extractTextPreview(htmlContent, maxLength = 200) {
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Load and display posts
async function loadPosts() {
  feed.innerHTML = '';
  
  try {
    const res = await fetch('http://localhost:3000/api/researchextension/posts');
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      data.posts.forEach(post => {
        const postElem = document.createElement('div');
        postElem.classList.add('researchextension-post');
        postElem.dataset.id = post.id;

        // Get featured image (first image file) if available
        let featuredImageHtml = '';
        let documentFilesHtml = '';
        
        if (post.files && post.files.length > 0) {
          const sortedFiles = sortFilesByType([...post.files]);
          const images = sortedFiles.filter(f => isImageFile(f.file_type));
          const documents = sortedFiles.filter(f => !isImageFile(f.file_type));
          
          // Featured image
          if (images.length > 0) {
            const firstImage = images[0];
            featuredImageHtml = `
              <div class="post-featured-image">
                <img src="http://localhost:3000${firstImage.file_path}" alt="${post.title}">
              </div>
            `;
          }
          
          // Document files
          if (documents.length > 0) {
            documentFilesHtml = '<div class="post-files">';
            documents.forEach(file => {
              const icon = getFileIcon(file.file_type);
              documentFilesHtml += `
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
            });
            documentFilesHtml += '</div>';
          }
        }

        // Extract preview text
        const preview = extractTextPreview(post.content);

        postElem.innerHTML = `
          <div class="researchextension-actions">
            <button class="post-menu-btn">
              <i class="fa-solid fa-ellipsis-v"></i>
            </button>
            <div class="post-menu-dropdown" style="display: none;">
              <button class="post-edit"><i class="fa-solid fa-pen"></i> Edit</button>
              <button class="post-delete"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </div>
          ${featuredImageHtml}
          <h1>${post.title}</h1>
          <div class="post-content">${preview}</div>
          ${documentFilesHtml}
          <div class="post-divider">
            <span><i class="fa fa-clock"></i> ${new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
          existingFiles = post.files || [];
          selectedFiles = [];
          updateFileList();
          submitBtn.textContent = 'Update Article';
          modal.style.display = 'flex';
        });

        // Delete handler
        postElem.querySelector('.post-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          if (confirm('Are you sure you want to delete this article and all its attachments?')) {
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
      <div class="post-placeholder">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h2>Error loading articles</h2>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

// Load posts on page load
window.addEventListener('DOMContentLoaded', loadPosts);