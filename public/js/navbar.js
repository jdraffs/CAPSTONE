const navbar = document.getElementById('navbar');
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const search = document.querySelector(".search");

function handleScroll() {
  if (window.scrollY > 10) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
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
