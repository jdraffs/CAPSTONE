document.addEventListener("DOMContentLoaded", () => {
  const alumniData = [
    { name: "John Doe", year: 2025, course: "IT", details: "Software Engineer at XYZ Corp", photo: "/assets/images/alumnisample/alumni1.jpg" },
    { name: "Jane Smith", year: 2025, course: "OA", details: "Marketing Specialist at ABC Ltd", photo: "/assets/images/alumnisample/alumni2.jpg" },
    { name: "Lebron Johnson", year: 2024, course: "CoE", details: "Entrepreneur", photo: "/assets/images/alumnisample/alumni3.jpg" },
    { name: "Bob Brown", year: 2023, course: "IT", details: "Data Analyst at DEF Inc", photo: "/assets/images/alumnisample/alumni4.jpg" },
    { name: "Emily Davis", year: 2025, course: "CoE", details: "Civil Engineer at GHI Ltd", photo: "/assets/images/alumnisample/alumni5.jpg" },
    { name: "Michael Lee", year: 2024, course: "OA", details: "Financial Analyst at JKL Corp", photo: "/assets/images/alumnisample/alumni6.jpg" },
    
  ];

  const alumniContainer = document.getElementById("alumni-container");
  const filterYear = document.getElementById("filter-year");
  const filterCourse = document.getElementById("filter-course");
  const openFormButton = document.querySelector(".open-form-button");
  const closeFormButton = document.querySelector(".close-form-button");
  const popupForm = document.getElementById("popupForm");
  const alumniForm = document.getElementById("alumniForm");

  // Function to render alumni cards
  function renderAlumni(data) {
    alumniContainer.innerHTML = ""; // Clear existing content
    data.forEach((alumni) => {
      const card = document.createElement("div");
      card.classList.add("alumni-card");
      card.innerHTML = `
        <img src="${alumni.photo}" alt="Alumni Photo" class="alumni-photo">
        <div class="alumni-info">
          <h3 class="alumni-name">${alumni.name}</h3>
          <p class="alumni-details">${alumni.details}</p>
          <p class="alumni-course">Course: ${alumni.course}</p>
          <p class="alumni-year">Year: ${alumni.year}</p>
        </div>
      `;
      alumniContainer.appendChild(card);
    });
  }

  // Initial render
  renderAlumni(alumniData);

  // Filter and sort functionality
  function filterAndSortAlumni() {
    const year = filterYear.value;
    const course = filterCourse.value;

    let filteredData = alumniData;

    if (year !== "all") {
      filteredData = filteredData.filter((alumni) => alumni.year.toString() === year);
    }

    if (course !== "all") {
      filteredData = filteredData.filter((alumni) => alumni.course === course);
    }

    renderAlumni(filteredData);
  }

  // Event listeners for filters
  filterYear.addEventListener("change", filterAndSortAlumni);
  filterCourse.addEventListener("change", filterAndSortAlumni);

  // Open the popup form
  openFormButton.addEventListener("click", () => {
    popupForm.style.display = "flex";
  });

  // Close the popup form
  closeFormButton.addEventListener("click", () => {
    popupForm.style.display = "none";
  });

  // Handle form submission
  alumniForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Your submission has been sent for admin verification.");
    popupForm.style.display = "none";
    alumniForm.reset();
  });
});