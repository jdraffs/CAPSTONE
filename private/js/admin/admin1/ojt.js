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

let editingPostId = null; // track the post being edited

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

// ✅ SUBMIT POST or UPDATE
submitBtn.addEventListener('click', async () => {
  const title = postTitle.value.trim();
  const content = postText.innerHTML.trim();

  if (title || content) {
    const newPost = document.createElement('div');
    newPost.classList.add('ojt-post');

    const titleElem = document.createElement('h1');
    titleElem.textContent = title;

    const contentElem = document.createElement('div');
    contentElem.innerHTML = content;

    const divider = document.createElement('div');
    divider.classList.add('ojt-divider');

    const timestamp = document.createElement('span');
    const now = new Date();
    timestamp.textContent = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    divider.appendChild(timestamp);
    newPost.appendChild(titleElem);
    newPost.appendChild(contentElem);

    if (editingPostId) {
      url = `http://localhost:3000/api/ojt/update/${editingPostId}`;
      method = 'PUT';
    }

    newPost.appendChild(divider);
    feed.prepend(newPost);

    // Reset modal
    postTitle.value = '';
    postText.innerHTML = '';
    fileUpload.value = '';
    fileName.textContent = '';
    modal.style.display = 'none';

    const placeholder = document.querySelector('.ojt-placeholder');
    if (placeholder) placeholder.remove();
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

        // Edit button
        postElem.querySelector('.ojt-edit').addEventListener('click', () => {
          editingPostId = post.id;
          postTitle.value = post.title;
          postText.innerHTML = post.content;
          submitBtn.textContent = 'Update';
          modal.style.display = 'flex';
        });

        // Delete button
        postElem.querySelector('.ojt-delete').addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete this post?')) {
            await fetch(`http://localhost:3000/api/ojt/delete/${post.id}`, {
              method: 'DELETE',
            });
            loadPosts();
          }
        });

        feed.appendChild(postElem);
      });
    } else {
      feed.innerHTML = `<p class="ojt-placeholder">No posts yet.</p>`;
    }
  } catch (err) {
    console.error('Error loading posts:', err);
  }
}

window.addEventListener('DOMContentLoaded', loadPosts);