const newsItems = [
    {
      id: 1,
      title: "PUPPQ Faculty Enhance Skills at OBE Workshop",
      description: "The PUPPQ faculty members participated in a Continuous Quality Improvement (CQI) Workshop on Outcome-Based Education (OBE) at Silid Lakan Dayang, PUP Sta. Mesa.",
      image: "/assets/images/newsimage/news1.jpg",
      date: "April 30, 2025",
      link: "#"
    },
    {
      id: 2,
      title: "From Enrollment to Employment",
      description: "PUP Parañaque City Campus welcomes partnership with the DOLE-NCR, Parañaque City PESO, and the City Government of Parañaque to be an accredited Job Placement Office!",
      image: "/assets/images/newsimage/news2.jpg",
      date: "April 8, 2025",
      link: "#"
    },
    {
      id: 3,
      title: "PUP Parañaque City Campus' 2nd Globe Summit",
      description: "in collaboration with Academia Research Lab Ltd. and other international partners was highlighted in The Philippine Star, one of the country's most renowned broadsheets.",
            image: "/assets/images/newsimage/news3.jpg",
      date: "May 31, 2025",
      link: "#"
    }
  ];
  
  const newsGrid = document.getElementById('news-grid');
  
  newsItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <div class="news-date">${item.date}</div>
      <img src="${item.image}" alt="${item.title}" class="news-image" />
      <div class="news-content">
        <h3 class="news-title">${item.title}</h3>
        <p class="news-description">${item.description}</p>
        <a href="${item.link}" class="news-link">Read More →</a>
      </div>
    `;
    newsGrid.appendChild(card);
  });
  