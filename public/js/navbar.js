const navbar = document.getElementById('navbar');
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

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
})
