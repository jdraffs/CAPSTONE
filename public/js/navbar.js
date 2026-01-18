const navbar = document.getElementById('navbar');
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const dropdown = document.querySelector(".dropdown-content");

function handleScroll() {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.classList.add('scrolled'); // Add null check
  }
}

window.addEventListener('scroll', handleScroll);


// hamburger menu
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navMenu.classList.toggle("active");
  navbar.classList.toggle("active");
  search.style.visibility("invisible");
})
