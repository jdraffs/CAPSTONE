document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const adminid = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminid, password })
    });

    const data = await response.json();

    if (data.success) {
      // ✅ Store admin info globally for later access
      localStorage.setItem("adminid", adminid);

      // Redirect based on admin ID
      if (data.adminid === 'adminave') {
        window.location.href = '/private/html/adminPages/adminAve/admin1.html';
      } else if (data.adminid === 'adminEnierga') {
        window.location.href = '/private/html/adminPages/adminEnierga/admin2.html';
      } else {
        alert('Unknown admin ID.');
      }
    } else {
      alert('Invalid admin ID or password.');
    }

  } catch (error) {
    console.error('Error:', error);
    alert('Server error. Please try again later.');
  }
});
