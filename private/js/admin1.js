document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.content-page');
  const sectionTitle = document.querySelector('.page-title'); // optional

  function showPage(page) {
    // Hide all pages
    pages.forEach(p => p.classList.remove('active'));

    // Show selected one
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Update title if available
    if (sectionTitle) {
      const targetLink = document.querySelector(`[data-page="${page}"] span`);
      if (targetLink) sectionTitle.textContent = targetLink.textContent.trim();
    }

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) activeLink.closest('.nav-item').classList.add('active');
  }

  // Handle clicks
  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      window.location.hash = page;
      showPage(page);
    });
  });

  // On load
  let initialPage = window.location.hash.substring(1);
  if (!initialPage) initialPage = links[0].dataset.page;
  showPage(initialPage);
});
