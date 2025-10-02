document.addEventListener('DOMContentLoaded', function () {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const facultyTab = document.getElementById('faculty-login');
  const adminTab = document.getElementById('admin-login');
  const loginTitle = document.getElementById('login-title');



  
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
});
