document.addEventListener('DOMContentLoaded', function () {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const facultyTab = document.getElementById('faculty-login');
  const adminTab = document.getElementById('admin-login');
  const loginTitle = document.getElementById('login-title');


  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-tab');

      if (target === 'faculty-login') {
        facultyTab.classList.add('active');
        adminTab.classList.remove('active');
        loginTitle.textContent = 'Login to Your Faculty Account'; 
      } else if (target === 'admin-login') {
        adminTab.classList.add('active');
        facultyTab.classList.remove('active');
        loginTitle.textContent = 'Login to Your Admin Account';
      }
    });
  });

  
  window.togglePassword = function (fieldId) {
    const input = document.getElementById(fieldId);
    const icon = input.nextElementSibling.querySelector('i');

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  };


  const adminForm = document.getElementById('admin-login-form');

  adminForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const inputEmail = document.getElementById('admin-username').value.trim();
    const inputPassword = document.getElementById('admin-password').value.trim();

    const mockAdminEmail = "admin";
    const mockAdminPassword = "admin";

    if (inputEmail === mockAdminEmail && inputPassword === mockAdminPassword) {
      alert("Admin login successful!");
      window.location.href = "/html/AdminLogin/admin-dashboard.html"; 
    } else {
      alert("Invalid Admin credentials");
    }
  });


  const facultyForm = document.getElementById('faculty-login-form');

  facultyForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const facultyUser = document.getElementById('faculty-username').value.trim();
    const facultyPass = document.getElementById('faculty-password').value.trim();


    if (facultyUser === "faculty" && facultyPass === "faculty") {
      alert("Faculty login successful!");
      window.location.href = "/html/faculty/faculty-dashboard.html";
    } else {
      alert("Invalid Faculty credentials");
    }
  });
});
