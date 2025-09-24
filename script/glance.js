const counters = document.querySelectorAll('.counter');

const startCounting = (counter) => {
  counter.innerText = '0';
  const target = +counter.getAttribute('data-target');
  let count = 0;
  const increment = target / 100;

  const updateCount = () => {
    if (count < target) {
      count += increment;
      counter.innerText = Math.floor(count);
      setTimeout(updateCount, 20);
    } else {
      counter.innerText = target.toLocaleString(); // Format large numbers
    }
  };

  updateCount();
};

// Use IntersectionObserver to detect when counter is in view
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const counter = entry.target;
      startCounting(counter);
      observer.unobserve(counter); // Stop observing once triggered
    }
  });
}, {
  threshold: 0.5 // Trigger when at least 50% is visible
});

// Attach observer to all counters
counters.forEach(counter => {
  observer.observe(counter);
});

