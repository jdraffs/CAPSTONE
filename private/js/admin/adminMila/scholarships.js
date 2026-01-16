// scholarships.js - Admin Scholarship Management
const openBtn = document.getElementById('openPostModal');
const modal = document.getElementById('postModal');
const cancelBtn = document.getElementById('cancelPost');
const submitBtn = document.getElementById('submitPost');
const feed = document.getElementById('postFeed');
const modalTitle = document.getElementById('modalTitle');

// Form fields
const scholarshipTitle = document.getElementById('scholarshipTitle');
const provider = document.getElementById('provider');
const amount = document.getElementById('amount');
const slots = document.getElementById('slots');
const openDate = document.getElementById('openDate');
const deadline = document.getElementById('deadline');
const status = document.getElementById('status');
const description = document.getElementById('description');
const eligibility = document.getElementById('eligibility');
const benefits = document.getElementById('benefits');
const contactInfo = document.getElementById('contactInfo');

const fileUpload = document.getElementById('fileUpload');
const fileListContainer = document.getElementById('fileList');

let editingScholarshipId = null;
let selectedFiles = [];
let existingFiles = [];
let currentFilter = 'all';

// Filter tabs
const filterTabs = document.querySelectorAll('.filter-tab');
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.status;
    loadScholarships();
  });
});

// Modal handlers
openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  scholarshipTitle.focus();
  submitBtn.textContent = 'Create Scholarship';
  modalTitle.textContent = 'Create Scholarship Opportunity';
  editingScholarshipId = null;
  selectedFiles = [];
  existingFiles = [];
  updateFileList();
});

cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  clearForm();
});

window.addEventListener('click', e => {
  if (e.target === modal) {
    modal.style.display = 'none';
    clearForm();
  }
});

function clearForm() {
  scholarshipTitle.value = '';
  provider.value = '';
  amount.value = '';
  slots.value = '';
  openDate.value = '';
  deadline.value = '';
  status.value = 'upcoming';
  description.value = '';
  eligibility.value = '';
  benefits.value = '';
  contactInfo.value = '';
  fileUpload.value = '';
  selectedFiles = [];
  existingFiles = [];
  updateFileList();
  editingScholarshipId = null;
}

// File handling
fileUpload.addEventListener('change', (e) => {
  const newFiles = Array.from(e.target.files);
  const totalFiles = selectedFiles.length + existingFiles.length + newFiles.length;
  
  if (totalFiles > 3) {
    alert('You can only upload up to 3 files per scholarship.');
    fileUpload.value = '';
    return;
  }
  
  selectedFiles = [...selectedFiles, ...newFiles];
  fileUpload.value = '';
  updateFileList();
});

function updateFileList() {
  fileListContainer.innerHTML = '';
  
  const allFiles = [
    ...existingFiles.map((file, index) => ({ ...file, isExisting: true, originalIndex: index })),
    ...selectedFiles.map((file, index) => ({ ...file, isExisting: false, originalIndex: index }))
  ];
  
  allFiles.forEach((file) => {
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
  if (mimeType.includes('image')) return 'fa-file-image';
  return 'fa-file';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Submit scholarship
submitBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  // Validation
  if (!scholarshipTitle.value.trim() || !provider.value.trim() || !amount.value.trim() ||
      !openDate.value || !deadline.value || !description.value.trim() || 
      !eligibility.value.trim() || !benefits.value.trim()) {
    alert('Please fill in all required fields.');
    return;
  }

  const formData = new FormData();
  formData.append('title', scholarshipTitle.value.trim());
  formData.append('provider', provider.value.trim());
  formData.append('amount', amount.value.trim());
  formData.append('slots', slots.value || null);
  formData.append('open_date', openDate.value);
  formData.append('deadline', deadline.value);
  formData.append('status', status.value);
  formData.append('description', description.value.trim());
  formData.append('eligibility', eligibility.value.trim());
  formData.append('benefits', benefits.value.trim());
  formData.append('contact_info', contactInfo.value.trim());
  formData.append('adminid', 'adminmila');

  selectedFiles.forEach(file => {
    formData.append('files', file);
  });
  
  if (editingScholarshipId) {
    const keepFileIds = existingFiles.map(f => f.id);
    formData.append('keepFiles', JSON.stringify(keepFileIds));
  }

  let url = '';
  let method = '';

  if (editingScholarshipId) {
    url = `http://localhost:3000/api/scholarships/update/${editingScholarshipId}`;
    method = 'PUT';
  } else {
    url = 'http://localhost:3000/api/scholarships/create';
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
      loadScholarships();
    } else {
      alert('Something went wrong while saving the scholarship.');
    }
  } catch (err) {
    console.error('Error submitting scholarship:', err);
    alert('Error submitting scholarship. Please try again.');
  }
});

// Load scholarships
async function loadScholarships() {
  feed.innerHTML = '<div class="loading">Loading scholarships...</div>';
  
  try {
    const res = await fetch('http://localhost:3000/api/scholarships/all');
    const data = await res.json();

    if (data.success && data.scholarships.length > 0) {
      let filteredScholarships = data.scholarships;
      
      if (currentFilter !== 'all') {
        filteredScholarships = data.scholarships.filter(s => s.status === currentFilter);
      }

      if (filteredScholarships.length === 0) {
        feed.innerHTML = `
          <div class="post-placeholder">
            <i class="fa-solid fa-filter"></i>
            <h2>No ${currentFilter} scholarships</h2>
            <p>Try selecting a different filter.</p>
          </div>
        `;
        return;
      }

      feed.innerHTML = '';
      filteredScholarships.forEach(scholarship => {
        const postElem = document.createElement('div');
        postElem.classList.add('scholarship-post');
        postElem.dataset.id = scholarship.id;

        let filesHtml = '';
        if (scholarship.files && scholarship.files.length > 0) {
          filesHtml = '<div class="post-files">';
          
          scholarship.files.forEach(file => {
            const icon = getFileIcon(file.file_type);
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
          });
          
          filesHtml += '</div>';
        }

        const openDateFormatted = new Date(scholarship.open_date).toLocaleDateString();
        const deadlineFormatted = new Date(scholarship.deadline).toLocaleDateString();

        postElem.innerHTML = `
          <div class="scholarship-actions">
            <button class="post-menu-btn">
              <i class="fa-solid fa-ellipsis-v"></i>
            </button>
            <div class="post-menu-dropdown" style="display: none;">
              <button class="post-edit"><i class="fa-solid fa-pen"></i> Edit</button>
              <button class="post-delete"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </div>
          
          <span class="scholarship-status ${scholarship.status}">${scholarship.status}</span>
          
          <div class="scholarship-header">
            <h1>${scholarship.title}</h1>
            <div class="scholarship-provider">
              <i class="fa-solid fa-building"></i>
              ${scholarship.provider}
            </div>
          </div>

          <div class="scholarship-info-grid">
            <div class="info-item">
              <i class="fa-solid fa-money-bill-wave"></i>
              <div>
                <div class="info-label">Amount</div>
                <div class="info-value">${scholarship.amount}</div>
              </div>
            </div>
            ${scholarship.slots ? `
            <div class="info-item">
              <i class="fa-solid fa-users"></i>
              <div>
                <div class="info-label">Available Slots</div>
                <div class="info-value">${scholarship.slots}</div>
              </div>
            </div>
            ` : ''}
            <div class="info-item">
              <i class="fa-solid fa-calendar-check"></i>
              <div>
                <div class="info-label">Opening Date</div>
                <div class="info-value">${openDateFormatted}</div>
              </div>
            </div>
            <div class="info-item">
              <i class="fa-solid fa-calendar-times"></i>
              <div>
                <div class="info-label">Deadline</div>
                <div class="info-value">${deadlineFormatted}</div>
              </div>
            </div>
          </div>

          <div class="scholarship-section">
            <h3><i class="fa-solid fa-align-left"></i> Description</h3>
            <p>${scholarship.description}</p>
          </div>

          <div class="scholarship-section">
            <h3><i class="fa-solid fa-clipboard-check"></i> Eligibility Requirements</h3>
            <p>${scholarship.eligibility}</p>
          </div>

          <div class="scholarship-section">
            <h3><i class="fa-solid fa-gift"></i> Benefits & Coverage</h3>
            <p>${scholarship.benefits}</p>
          </div>

          ${scholarship.contact_info ? `
          <div class="scholarship-section">
            <h3><i class="fa-solid fa-address-book"></i> Contact Information</h3>
            <p>${scholarship.contact_info}</p>
          </div>
          ` : ''}

          ${filesHtml}

          <div class="post-divider"><span>Posted on ${new Date(scholarship.created_at).toLocaleDateString()}</span></div>
        `;

        // Dropdown menu
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

        // Edit button
        postElem.querySelector('.post-edit').addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          editingScholarshipId = scholarship.id;
          scholarshipTitle.value = scholarship.title;
          provider.value = scholarship.provider;
          amount.value = scholarship.amount;
          slots.value = scholarship.slots || '';
          openDate.value = scholarship.open_date;
          deadline.value = scholarship.deadline;
          status.value = scholarship.status;
          description.value = scholarship.description;
          eligibility.value = scholarship.eligibility;
          benefits.value = scholarship.benefits;
          contactInfo.value = scholarship.contact_info || '';
          existingFiles = scholarship.files || [];
          selectedFiles = [];
          updateFileList();
          submitBtn.textContent = 'Update Scholarship';
          modalTitle.textContent = 'Edit Scholarship Opportunity';
          modal.style.display = 'flex';
        });

        // Delete button
        postElem.querySelector('.post-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
          
          if (confirm('Are you sure you want to delete this scholarship and all its files?')) {
            try {
              const response = await fetch(`http://localhost:3000/api/scholarships/delete/${scholarship.id}`, { 
                method: 'DELETE' 
              });
              const result = await response.json();
              
              if (result.success) {
                loadScholarships();
              } else {
                alert('Failed to delete scholarship');
              }
            } catch (err) {
              console.error('Error deleting scholarship:', err);
              alert('Error deleting scholarship');
            }
          }
        });

        feed.appendChild(postElem);
      });
    } else {
      feed.innerHTML = `
        <div class="post-placeholder">
          <i class="fa-solid fa-graduation-cap"></i>
          <h2>No scholarships yet</h2>
          <p>Create scholarship opportunities to inform students.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading scholarships:', err);
    feed.innerHTML = `
      <div class="post-placeholder">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h2>Error loading scholarships</h2>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

window.addEventListener('DOMContentLoaded', loadScholarships);