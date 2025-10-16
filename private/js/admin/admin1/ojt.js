const openBtn = document.getElementById('openPostModal');
const modal = document.getElementById('postModal');
const cancelBtn = document.getElementById('cancelPost');
const submitBtn = document.getElementById('submitPost');
const postText = document.getElementById('postText');
const feed = document.getElementById('ojtFeed');

openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  postText.focus();
});

cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  postText.value = '';
});

submitBtn.addEventListener('click', () => {
  const text = postText.value.trim();
  if (text) {
    const newPost = document.createElement('div');
    newPost.classList.add('ojt-post');
    newPost.innerHTML = `<p>${text}</p>`;
    feed.prepend(newPost);

    postText.value = '';
    modal.style.display = 'none';

    const placeholder = document.querySelector('.ojt-placeholder');
    if (placeholder) placeholder.remove();
  }
});

window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});
