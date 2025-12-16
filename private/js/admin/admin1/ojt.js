// ojt.js - Enhanced with multi-file upload support
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

fileUpload.addEventListener('change', (e) => {
  const newFiles = Array.from(e.target.files);
  const totalFiles = selectedFiles.length + existingFiles.length + newFiles.length;
  
  if (totalFiles > 3) {
    alert('You can only upload up to 3 files per post.');
    fileUpload.value = '';
    return;
  }
  
  selectedFiles = [...selectedFiles, ...newFiles];
  fileUpload.value = '';
  updateFileList();
});

function updateFileList() {
  fileListContainer.innerHTML = '';
  
  existingFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <i class="fa ${getFileIcon(file.file_type)}"></i>
      <span class="file-name">${file.file_name}</span>
      <span class="file-size">${formatFileSize(file.file_size)}</span>
      <button type="button" class="remove-file-btn" data-existing-index="${index}">
        <i class="fa fa-times"></i>
      </button>
    `;
    fileListContainer.appendChild(fileItem);
  });
  
  selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <i class="fa ${getFileIcon(file.type)}"></i>
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
      <button type="button" class="remove-file-btn" data-new-index="${index}">
        <i class="fa fa-times"></i>
      </button>
    `;
    fileListContainer.appendChild(fileItem);
  });
  
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

function getFileIcon(mimeType) {
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('word')) return 'fa-file-word';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
  if (mimeType.includes('image')) return 'fa-file-image';
  if (mimeType.includes('text')) return 'fa-file-alt';
  return 'fa-file';
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
    alert('Please add a title, content, or files before posting.');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('adminid', 'adminave');

  selectedFiles.forEach(file => {
    formData.append('files', file);
  });
  
  if (editingPostId && existingFiles.length > 0) {
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
      alert('Something went wrong while saving your OJT post.');
    }
  } catch (err) {
    console.error('Error submitting OJT post:', err);
    alert('Error submitting post. Please try again.');
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
          filesHtml = '<div class="post-files">';
          post.files.forEach(file => {
            const icon = getFileIcon(file.file_type);
            filesHtml += `
              <div class="post-file-item">
                <i class="fa ${icon}"></i>
                <a href="http://localhost:3000${file.file_path}" target="_blank" download="${file.file_name}">
                  ${file.file_name}
                </a>
                <span class="file-size">(${formatFileSize(file.file_size)})</span>
              </div>
            `;
          });
          filesHtml += '</div>';
        }

        postElem.innerHTML = `
          <div class="ojt-actions">
            <button class="ojt-edit"><i class="fa-solid fa-pen"></i></button>
            <button class="ojt-delete"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <h1>${post.title}</h1>
          <div class="ojt-content">${post.content}</div>
          ${filesHtml}
          <div class="ojt-divider"><span>${new Date(post.created_at).toLocaleString()}</span></div>
        `;

        postElem.querySelector('.ojt-edit').addEventListener('click', () => {
          editingPostId = post.id;
          postTitle.value = post.title;
          postText.innerHTML = post.content;
          existingFiles = post.files || [];
          selectedFiles = [];
          updateFileList();
          submitBtn.textContent = 'Update';
          modal.style.display = 'flex';
        });

        postElem.querySelector('.ojt-delete').addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete this OJT post and all its files?')) {
            try {
              const response = await fetch(`http://localhost:3000/api/ojt/delete/${post.id}`, { 
                method: 'DELETE' 
              });
              const result = await response.json();
              
              if (result.success) {
                loadPosts();
              } else {
                alert('Failed to delete post');
              }
            } catch (err) {
              console.error('Error deleting post:', err);
              alert('Error deleting post');
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

window.addEventListener('DOMContentLoaded', loadPosts);