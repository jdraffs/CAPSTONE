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

openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  postTitle.focus();
});

cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  postTitle.value = '';
  postText.innerHTML = '';
  fileUpload.value = '';
  fileName.textContent = '';
});

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

submitBtn.addEventListener('click', () => {
  const title = postTitle.value.trim();
  const content = postText.innerHTML.trim();

  if (title || content) {
    const newPost = document.createElement('div');
    newPost.classList.add('result-post');

    const titleElem = document.createElement('h1');
    titleElem.textContent = title;

    const contentElem = document.createElement('div');
    contentElem.innerHTML = content;

    const divider = document.createElement('div');
    divider.classList.add('post-divider');

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

    if (fileUpload.files[0]) {
      const fileLink = document.createElement('p');
      fileLink.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${fileUpload.files[0].name}`;
      newPost.appendChild(fileLink);
    }

    newPost.appendChild(divider);
    feed.prepend(newPost);

    // Reset modal
    postTitle.value = '';
    postText.innerHTML = '';
    fileUpload.value = '';
    fileName.textContent = '';
    modal.style.display = 'none';

    const placeholder = document.querySelector('.post-placeholder');
    if (placeholder) placeholder.remove();
  }
});

window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});
