document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop();

  navItems.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;

    const href = link.getAttribute('href');

    // Case 1: Links with an actual page (e.g., ojt.html)
    if (href.endsWith('.html')) {
      const linkFile = href.split('/').pop();
      if (linkFile === currentFile) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }
    // Case 2: Dashboard or hash links (e.g., #overview)
    else if (href.startsWith('#') && currentFile === 'admin1.html') {
      // Only highlight the Dashboard link when on admin1.html
      if (href === '#overview') {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }
  });
});
