// alumni-survey.js - Public Survey Form JavaScript

// DOM Elements
const fullNameInput = document.getElementById('fullName');
const batchInput = document.getElementById('batch');
const programSelect = document.getElementById('program');
const employmentStatusRadios = document.querySelectorAll('input[name="employmentStatus"]');
const workTypeInput = document.getElementById('workType');
const timelineSelect = document.getElementById('timeline');
const employmentDetails = document.getElementById('employmentDetails');
const submitBtn = document.getElementById('submitBtn');
const surveyFormCard = document.getElementById('surveyFormCard');
const successCard = document.getElementById('successCard');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Show/hide employment details based on status
    employmentStatusRadios.forEach(radio => {
        radio.addEventListener('change', handleEmploymentStatusChange);
    });

    // Submit button
    submitBtn.addEventListener('click', handleSubmit);

    // Enter key on inputs
    [fullNameInput, batchInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });
    });
}

// Handle Employment Status Change
function handleEmploymentStatusChange(e) {
    const status = e.target.value;
    
    if (status === 'Employed' || status === 'Self-Employed') {
        employmentDetails.style.display = 'block';
        // Smooth scroll to employment details
        setTimeout(() => {
            employmentDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        employmentDetails.style.display = 'none';
        // Clear employment details
        workTypeInput.value = '';
        timelineSelect.value = '';
    }
}

// Validate Form
function validateForm() {
    const fullName = fullNameInput.value.trim();
    const batch = batchInput.value.trim();
    const program = programSelect.value;
    const employmentStatus = document.querySelector('input[name="employmentStatus"]:checked');

    // Check required fields
    if (!fullName) {
        alert('Please enter your full name');
        fullNameInput.focus();
        return false;
    }

    if (!batch) {
        alert('Please enter your graduation year');
        batchInput.focus();
        return false;
    }

    // Validate batch year (should be 4 digits and reasonable)
    if (!/^\d{4}$/.test(batch)) {
        alert('Please enter a valid 4-digit graduation year (e.g., 2023)');
        batchInput.focus();
        return false;
    }

    const year = parseInt(batch);
    const currentYear = new Date().getFullYear();
    if (year < 2000 || year > currentYear + 1) {
        alert(`Please enter a graduation year between 2000 and ${currentYear + 1}`);
        batchInput.focus();
        return false;
    }

    if (!program) {
        alert('Please select your program/course');
        programSelect.focus();
        return false;
    }

    if (!employmentStatus) {
        alert('Please select your current employment status');
        return false;
    }

    return true;
}

// Handle Submit
async function handleSubmit() {
    // Validate form
    if (!validateForm()) {
        return;
    }

    // Get form data
    const formData = {
        full_name: fullNameInput.value.trim(),
        batch: batchInput.value.trim(),
        program: programSelect.value,
        employment_status: document.querySelector('input[name="employmentStatus"]:checked').value,
        work_type: workTypeInput.value.trim() || null,
        employment_timeline: timelineSelect.value || null
    };

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await fetch('http://localhost:3000/api/alumni-employment/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // Show success message
            surveyFormCard.style.display = 'none';
            successCard.style.display = 'block';
            
            // Smooth scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert(data.message || 'Failed to submit response. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Response';
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('An error occurred while submitting your response. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Response';
    }
}

// Add smooth transition for employment details
employmentDetails.style.transition = 'all 0.3s ease';
employmentDetails.style.overflow = 'hidden';
employmentDetails.style.maxHeight = '0';

const originalHandleEmploymentStatusChange = handleEmploymentStatusChange;
handleEmploymentStatusChange = function(e) {
    originalHandleEmploymentStatusChange(e);
    
    const status = e.target.value;
    if (status === 'Employed' || status === 'Self-Employed') {
        employmentDetails.style.maxHeight = '500px';
    } else {
        employmentDetails.style.maxHeight = '0';
    }
};