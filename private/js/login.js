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
      // ✅ Redirect to dashboard
      window.location.href = '/private/html/AdminLogin/admin-dashboard.html';
    } else {
      alert('Invalid admin ID or password.');
    }

  } catch (error) {
    console.error('Error:', error);
    alert('Server error. Please try again later.');
  }
});
