// feedback.js - Student & Visitor Feedback System

const API_URL = 'http://localhost:3000/api';

let validatedTransaction = null;
let currentUserType = 'student'; // 'student' or 'visitor'

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupTabSwitching();
    setupStudentForm();
    setupVisitorForm();
});

// ============ TAB SWITCHING ============

function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Update current user type
    currentUserType = tabName;
    
    // Hide success step when switching tabs
    document.getElementById('successStep').style.display = 'none';
}

// ============ STUDENT FORM ============

function setupStudentForm() {
    const validationForm = document.getElementById('studentValidationForm');
    const feedbackForm = document.getElementById('studentFeedbackForm');
    const backBtn = document.getElementById('studentBackBtn');
    const commentsTextarea = document.getElementById('studentComments');
    const charCount = document.getElementById('studentCharCount');
    const ratingInputs = document.querySelectorAll('input[name="student_overall_rating"]');
    
    validationForm.addEventListener('submit', handleStudentValidation);
    feedbackForm.addEventListener('submit', handleStudentFeedbackSubmission);
    backBtn.addEventListener('click', goBackToStudentValidation);
    commentsTextarea.addEventListener('input', () => updateCharCount(commentsTextarea, charCount));
    
    ratingInputs.forEach(input => {
        input.addEventListener('change', () => updateRatingText('student'));
    });
}

async function handleStudentValidation(e) {
    e.preventDefault();
    
    const transactionId = document.getElementById('studentTransactionId').value.trim();
    const studentNumber = document.getElementById('studentNumber').value.trim();
    const department = document.getElementById('studentDepartment').value;
    
    hideError('studentValidationError');
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    submitBtn.disabled = true;
    
    try {
        console.log('🔍 Validating student transaction');
        
        const response = await fetch(`${API_URL}/feedback/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_id: transactionId,
                student_number: studentNumber,
                department: department
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            validatedTransaction = result.transaction;
            showStudentFeedbackForm();
        } else {
            showError('studentValidationError', result.message || 'Transaction not found or not eligible for feedback.');
        }
    } catch (error) {
        console.error('❌ Validation error:', error);
        showError('studentValidationError', 'An error occurred during validation. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showStudentFeedbackForm() {
    document.getElementById('studentValidationStep').style.display = 'none';
    document.getElementById('studentFeedbackStep').style.display = 'block';
    
    document.getElementById('studentDisplayTransactionId').textContent = validatedTransaction.transaction_id;
    document.getElementById('studentDisplayDepartment').textContent = validatedTransaction.department_name;
    document.getElementById('studentDisplayDate').textContent = new Date(validatedTransaction.transaction_date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToStudentValidation() {
    document.getElementById('studentFeedbackStep').style.display = 'none';
    document.getElementById('studentValidationStep').style.display = 'block';
    document.getElementById('studentFeedbackForm').reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleStudentFeedbackSubmission(e) {
    e.preventDefault();
    
    hideError('studentFeedbackError');
    
    const overallRating = document.querySelector('input[name="student_overall_rating"]:checked');
    const processingTime = document.querySelector('input[name="student_processing_time"]:checked');
    const staffAssistance = document.querySelector('input[name="student_staff_assistance"]:checked');
    const clarity = document.querySelector('input[name="student_clarity"]:checked');
    const facility = document.querySelector('input[name="student_facility"]:checked');
    
    if (!overallRating || !processingTime || !staffAssistance || !clarity || !facility) {
        showError('studentFeedbackError', 'Please rate all service aspects before submitting.');
        return;
    }
    
    const comments = document.getElementById('studentComments').value.trim();
    
    if (comments && !isCommentAppropriate(comments)) {
        showError('studentFeedbackError', 'Your comment contains inappropriate language. Please revise and try again.');
        return;
    }
    
    const formData = {
        transaction_id: validatedTransaction.transaction_id,
        student_number: validatedTransaction.student_number,
        department_id: validatedTransaction.department_id,
        overall_rating: parseInt(overallRating.value),
        processing_time: parseInt(processingTime.value),
        staff_assistance: parseInt(staffAssistance.value),
        clarity: parseInt(clarity.value),
        facility: parseInt(facility.value),
        comments: comments || null,
        is_anonymous: document.getElementById('studentAnonymousToggle').checked
    };
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Student feedback submitted successfully!');
            showSuccessMessage(result.feedback_id, 'student');
        } else {
            showError('studentFeedbackError', result.message || 'Failed to submit feedback. Please try again.');
        }
    } catch (error) {
        console.error('❌ Submission error:', error);
        showError('studentFeedbackError', 'An error occurred while submitting feedback. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ============ VISITOR FORM ============

function setupVisitorForm() {
    const feedbackForm = document.getElementById('visitorFeedbackForm');
    const commentsTextarea = document.getElementById('visitorComments');
    const charCount = document.getElementById('visitorCharCount');
    const ratingInputs = document.querySelectorAll('input[name="visitor_overall_rating"]');
    
    // Set max date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visitDate').setAttribute('max', today);
    
    feedbackForm.addEventListener('submit', handleVisitorFeedbackSubmission);
    commentsTextarea.addEventListener('input', () => updateCharCount(commentsTextarea, charCount));
    
    ratingInputs.forEach(input => {
        input.addEventListener('change', () => updateRatingText('visitor'));
    });
}

async function handleVisitorFeedbackSubmission(e) {
    e.preventDefault();
    
    hideError('visitorFeedbackError');
    
    const overallRating = document.querySelector('input[name="visitor_overall_rating"]:checked');
    const processingTime = document.querySelector('input[name="visitor_processing_time"]:checked');
    const staffAssistance = document.querySelector('input[name="visitor_staff_assistance"]:checked');
    const clarity = document.querySelector('input[name="visitor_clarity"]:checked');
    const facility = document.querySelector('input[name="visitor_facility"]:checked');
    
    if (!overallRating || !processingTime || !staffAssistance || !clarity || !facility) {
        showError('visitorFeedbackError', 'Please rate all service aspects before submitting.');
        return;
    }
    
    const comments = document.getElementById('visitorComments').value.trim();
    
    if (comments && !isCommentAppropriate(comments)) {
        showError('visitorFeedbackError', 'Your comment contains inappropriate language. Please revise and try again.');
        return;
    }
    
    const formData = {
        visitor_name: document.getElementById('visitorName').value.trim(),
        visitor_email: document.getElementById('visitorEmail').value.trim() || null,
        visitor_phone: document.getElementById('visitorPhone').value.trim() || null,
        department_id: parseInt(document.getElementById('visitorDepartment').value),
        service_type: document.getElementById('serviceType').value,
        visit_date: document.getElementById('visitDate').value,
        overall_rating: parseInt(overallRating.value),
        processing_time: parseInt(processingTime.value),
        staff_assistance: parseInt(staffAssistance.value),
        clarity: parseInt(clarity.value),
        facility: parseInt(facility.value),
        comments: comments || null
    };
    
    console.log('📤 Submitting visitor feedback:', formData);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/feedback/visitor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        console.log('📊 Visitor submission result:', result);
        
        if (response.ok && result.success) {
            console.log('✅ Visitor feedback submitted successfully!');
            showSuccessMessage(result.feedback_id, 'visitor');
        } else {
            showError('visitorFeedbackError', result.message || 'Failed to submit feedback. Please try again.');
        }
    } catch (error) {
        console.error('❌ Submission error:', error);
        showError('visitorFeedbackError', 'An error occurred while submitting feedback. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ============ SHARED FUNCTIONS ============

function updateCharCount(textarea, countElement) {
    const count = textarea.value.length;
    countElement.textContent = count;
    countElement.style.color = count >= 450 ? '#c62828' : '#888';
}

function updateRatingText(type) {
    const rating = document.querySelector(`input[name="${type}_overall_rating"]:checked`);
    const ratingText = document.getElementById(`${type}RatingText`);
    
    if (rating) {
        const ratingValue = parseInt(rating.value);
        const ratingLabels = {
            5: 'Excellent',
            4: 'Good',
            3: 'Average',
            2: 'Poor',
            1: 'Very Poor'
        };
        ratingText.textContent = ratingLabels[ratingValue];
        ratingText.style.color = ratingValue >= 4 ? '#4caf50' : ratingValue === 3 ? '#ff9800' : '#c62828';
    }
}

function showError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    const errorTextElement = document.getElementById(errorId + 'Text');
    errorTextElement.textContent = message;
    errorElement.style.display = 'flex';
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError(errorId) {
    document.getElementById(errorId).style.display = 'none';
}

function showSuccessMessage(feedbackId, userType) {
    // Hide all form steps
    if (userType === 'student') {
        document.getElementById('studentFeedbackStep').style.display = 'none';
    } else {
        document.getElementById('visitorFeedbackStep').style.display = 'none';
    }
    
    // Show success step
    const successStep = document.getElementById('successStep');
    successStep.style.display = 'block';
    
    document.getElementById('feedbackReference').textContent = feedbackId;
    document.getElementById('submissionTime').textContent = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function isCommentAppropriate(text) {
    const profanityList = ['badword1', 'badword2', 'badword3'];
    const lowerText = text.toLowerCase();
    return !profanityList.some(word => lowerText.includes(word));
}