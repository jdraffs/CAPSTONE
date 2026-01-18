// Modal Data
const modalData = {
  howToApply: {
    title: 'How to Apply',
    icon: 'fas fa-clipboard-list',
    content: `
      <div class="modal-section">
        <h3><i class="fas fa-info-circle"></i> Admissions to PUP</h3>
        <p>Please follow the required file format. Ensure you meet all the requirements for the entrance examination.</p>
        
        <div class="highlight-box">
          <p>The <strong>PUP iApply system</strong> is responsible for processing all incoming student admission applications. To access and review your applications, students are required to initially register on iApply.</p>
        </div>
      </div>

      <div class="modal-section">
        <h3><i class="fas fa-list-ol"></i> Application Process</h3>
        <ol>
          <li>All admissions applications for new students are processed online through the <a href="https://iapply.pup.edu.ph/signin" target="_blank" class="info-link">PUP iApply</a>.</li>
          <li>
            Applicants should meet the following requirements to take the entrance tests:
            <ul style="margin-top: 10px;">
              <li>Applicant's photo (JPEG File)</li>
              <li>Grades 10 and 11 in English, Math, Science and General Weighted Average (GWA)</li>
              <li>Scanned Grade 10 Report Card (JPEG File)</li>
              <li>Scanned Grade 11 Report Card (JPEG File)</li>
              <li>Report Cards must clearly show grades in English, Math, Science and GWA</li>
            </ul>
          </li>
        </ol>
      </div>

      <div class="modal-section">
        <h3><i class="fas fa-exchange-alt"></i> Transfer & Re-admission</h3>
        <ul>
          <li>Students who seek to transfer to PUP may check these requirements at <a href="https://iapply.pup.edu.ph/signin" target="_blank" class="info-link">PUP iApply Application Form</a>.</li>
          <li>Students who seek re-admission to PUP may email <a href="mailto:admission.transferees@pup.edu.ph" class="info-link">admission.transferees@pup.edu.ph</a>.</li>
        </ul>
      </div>
    `,
    actions: `
      <button class="modal-btn modal-btn-primary" onclick="window.open('https://iapply.pup.edu.ph/signin', '_blank')">
        <i class="fas fa-external-link-alt"></i> Go to PUP iApply
      </button>
      <button class="modal-btn modal-btn-secondary" onclick="closeModal()">
        Close
      </button>
    `
  },

  iApply: {
    title: 'PUP iApply',
    icon: 'fas fa-laptop',
    content: `
      <div class="modal-section">
        <h3><i class="fas fa-globe"></i> Online Application System</h3>
        <p>PUP iApply enables applicants to register for University college admission evaluation and entrance exams. Online application for PUPCET is for the First Semester only.</p>
        
        <div class="highlight-box">
          <p><strong>Important:</strong> All admissions applications for new students must be processed online through the PUP iApply system.</p>
        </div>
      </div>

      <div class="modal-section">
        <h3><i class="fas fa-tasks"></i> What You Can Do</h3>
        <ul>
          <li>Register for University admission evaluation</li>
          <li>Apply for entrance examinations</li>
          <li>Submit required documents online</li>
          <li>Track your application status</li>
          <li>Receive admission updates and notifications</li>
        </ul>
      </div>

      <div class="modal-section">
        <h3><i class="fas fa-question-circle"></i> Getting Started</h3>
        <ol>
          <li>Visit the PUP iApply portal</li>
          <li>Create your account with valid email address</li>
          <li>Complete your profile information</li>
          <li>Upload required documents</li>
          <li>Submit your application</li>
          <li>Wait for confirmation and instructions</li>
        </ol>
      </div>
    `,
    actions: `
      <button class="modal-btn modal-btn-primary" onclick="window.open('https://iapply.pup.edu.ph/signin', '_blank')">
        <i class="fas fa-sign-in-alt"></i> Access PUP iApply
      </button>
      <button class="modal-btn modal-btn-secondary" onclick="closeModal()">
        Close
      </button>
    `
  },

  courses: {
    title: 'Courses Offered',
    icon: 'fas fa-graduation-cap',
    content: `
      <div class="modal-section">
        <h3><i class="fas fa-university"></i> PUP Parañaque City Programs</h3>
        <p>Explore our diverse range of programs designed to prepare you for success in your chosen field.</p>
        
        <table class="courses-table">
          <thead>
            <tr>
              <th style="width: 30%;">Program Code</th>
              <th style="width: 70%;">Program Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="program-code">BSCpE</div>
                <div class="program-name">Bachelor of Science in Computer Engineering</div>
              </td>
              <td>
                <div class="program-description">
                  A comprehensive program that combines computer science and electrical engineering principles.
                  <ul>
                    <li>Focus on hardware and software integration</li>
                    <li>Embedded systems and microprocessor design</li>
                    <li>Network and data communication</li>
                    <li>Strong foundation in mathematics and physics</li>
                  </ul>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="program-code">BSHM</div>
                <div class="program-name">Bachelor of Science in Hospitality Management</div>
              </td>
              <td>
                <div class="program-description">
                  Prepares students for leadership roles in the hospitality and tourism industry.
                  <ul>
                    <li>Hotel and restaurant management</li>
                    <li>Food and beverage service operations</li>
                    <li>Event planning and coordination</li>
                    <li>Customer service excellence training</li>
                  </ul>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="program-code">BSIT</div>
                <div class="program-name">Bachelor of Science in Information Technology</div>
              </td>
              <td>
                <div class="program-description">
                  Focuses on the application of technology in various business and organizational settings.
                  <ul>
                    <li>Software development and programming</li>
                    <li>Database management and administration</li>
                    <li>Web and mobile application development</li>
                    <li>Network security and cybersecurity</li>
                  </ul>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="program-code">BSOA</div>
                <div class="program-name">Bachelor of Science in Office Administration</div>
              </td>
              <td>
                <div class="program-description">
                  Equips students with skills for efficient office management and administrative support.
                  <ul>
                    <li>Office management and organization</li>
                    <li>Business communication and correspondence</li>
                    <li>Records management and documentation</li>
                    <li>Human resource support and coordination</li>
                  </ul>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-section">
        <h3><i class="fas fa-lightbulb"></i> Why Choose PUP Parañaque?</h3>
        <ul>
          <li>Quality education with affordable tuition fees</li>
          <li>Experienced and dedicated faculty members</li>
          <li>Modern facilities and learning resources</li>
          <li>Strong industry partnerships and linkages</li>
          <li>Active student organizations and activities</li>
        </ul>
      </div>
    `,
    actions: `
      <button class="modal-btn modal-btn-primary" onclick="window.open('https://iapply.pup.edu.ph/signin', '_blank')">
        <i class="fas fa-user-plus"></i> Apply Now
      </button>
      <button class="modal-btn modal-btn-secondary" onclick="closeModal()">
        Close
      </button>
    `
  }
};

// Modal Functions
function openModal(type) {
  const modal = document.getElementById('admissionModal');
  const data = modalData[type];
  
  if (!data) return;

  // Update modal content
  document.getElementById('modalTitle').innerHTML = `<i class="${data.icon}"></i> ${data.title}`;
  document.getElementById('modalBody').innerHTML = data.content;
  document.getElementById('modalActions').innerHTML = data.actions;

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('admissionModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('admissionModal');
  if (event.target === modal) {
    closeModal();
  }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
});