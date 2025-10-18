const openBtn = document.getElementById('openPostModal');
const modal = document.getElementById('postModal');
const cancelBtn = document.getElementById('cancelPost');
const submitBtn = document.getElementById('submitPost');
const feed = document.getElementById('postFeed');
const postTitle = document.getElementById('postTitle');
const postText = document.getElementById('postText');
const fileUpload = document.getElementById('fileUpload');
const fileName = document.getElementById('fileName');
const toolbarButtons = document.querySelectorAll('.post-toolbar button');
const fontSizeSelect = document.getElementById('fontSize');

let editingPostId = null; // track if editing a post

openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  postTitle.focus();
  submitBtn.textContent = 'Post';
  editingPostId = null;
});

cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  clearForm();
});

function clearForm() {
  postTitle.value = '';
  postText.innerHTML = '';
  fileUpload.value = '';
  fileName.textContent = '';
  editingPostId = null;
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

fileUpload.addEventListener('change', () => {
  const file = fileUpload.files[0];
  fileName.textContent = file ? file.name : '';
});

// ✅ CREATE OR UPDATE POST
submitBtn.addEventListener('click', async () => {
  const title = postTitle.value.trim();
  const content = postText.innerHTML.trim();
  const file = fileUpload.files[0];

  if (!title && !content && !file) {
    alert('Please add a title or content before posting.');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('adminid', 'adminave');

  if (file) {
    formData.append('image', file);
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
      alert('Something went wrong while saving your post.');
    }
  } catch (err) {
    console.error('Error submitting post:', err);
  }
});

window.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
});

// ✅ LOAD EXISTING POSTS
async function loadPosts() {
  feed.innerHTML = ''; // clear current posts
  try {
    const res = await fetch('http://localhost:3000/api/ojt/posts');
    const data = await res.json();

    if (data.success && data.posts.length > 0) {
      data.posts.forEach(post => {
        const postElem = document.createElement('div');
        postElem.classList.add('ojt-post');
        postElem.dataset.id = post.id;

        postElem.innerHTML = `
          <div class="ojt-actions">
            <button class="ojt-edit"><i class="fa-solid fa-pen"></i></button>
            <button class="ojt-delete"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <h1>${post.title}</h1>
          <div class="ojt-content">${post.content}</div>
          ${post.image_path ? `<img src="http://localhost:3000/public${post.image_path}" style="max-width:100%;border-radius:8px;margin-top:10px;">` : ''}
          <div class="ojt-divider"><span>${new Date(post.created_at).toLocaleString()}</span></div>
        `;

        // ✏️ Edit button
        postElem.querySelector('.ojt-edit').addEventListener('click', () => {
          editingPostId = post.id;
          postTitle.value = post.title;
          postText.innerHTML = post.content;
          submitBtn.textContent = 'Update';
          modal.style.display = 'flex';
        });

        // ❌ Delete button
        postElem.querySelector('.ojt-delete').addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete this post?')) {
            await fetch(`http://localhost:3000/api/ojt/delete/${post.id}`, { method: 'DELETE' });
            loadPosts();
          }
        });

        feed.appendChild(postElem);
      });
    } else {
    feed.innerHTML = `
      <div class="post-container">
        <div class="post-feed" id="postFeed">
          <div class="post-placeholder">
            <i class="fa-solid fa-briefcase"></i>
            <h2>No OJT posts yet</h2>
            <p>Share announcements, updates, or OJT opportunities with others here.</p>
          </div>
        </div>
      </div>
    `;
    }
  } catch (err) {
    console.error('Error loading posts:', err);
  }
}

window.addEventListener('DOMContentLoaded', loadPosts);
