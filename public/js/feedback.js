// feedback.js - Enhanced with Student/Visitor Tabs - COMPLETE VERSION

const API_URL = 'http://localhost:3000/api';

// State management
let validatedTransaction = null;
let currentUserType = 'student'; // 'student' or 'visitor'

// DOM Elements
const studentTab = document.getElementById('studentTab');
const visitorTab = document.getElementById('visitorTab');
const studentForm = document.getElementById('studentFormContainer');
const visitorForm = document.getElementById('visitorFormContainer');

const validationStep = document.getElementById('validationStep');
const feedbackStep = document.getElementById('feedbackStep');
const successStep = document.getElementById('successStep');

const validationForm = document.getElementById('validationForm');
const feedbackFormEl = document.getElementById('feedbackForm');
const visitorFeedbackForm = document.getElementById('visitorFeedbackForm');

const validationError = document.getElementById('validationError');
const validationErrorText = document.getElementById('validationErrorText');
const feedbackError = document.getElementById('feedbackError');
const feedbackErrorText = document.getElementById('feedbackErrorText');

const backBtn = document.getElementById('backBtn');
const commentsTextarea = document.getElementById('comments');
const charCount = document.getElementById('charCount');

// Visitor form elements
const visitorCommentsTextarea = document.getElementById('visitorComments');
const visitorCharCount = document.getElementById('visitorCharCount');

// Star rating elements
const overallRatingInputs = document.querySelectorAll('input[name="overall_rating"]');
const ratingText = document.getElementById('ratingText');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupTabSwitching();
});

// ============ TAB SWITCHING ============

function setupTabSwitching() {
    studentTab.addEventListener('click', () => switchTab('student'));
    visitorTab.addEventListener('click', () => switchTab('visitor'));
}

function switchTab(userType) {
    currentUserType = userType;
    
    // Update tab styling
    if (userType === 'student') {
        studentTab.classList.add('active');
        visitorTab.classList.remove('active');
        studentForm.style.display = 'block';
        visitorForm.style.display = 'none';
    } else {
        visitorTab.classList.add('active');
        studentTab.classList.remove('active');
        visitorForm.style.display = 'block';
        studentForm.style.display = 'none';
    }
    
    console.log(`Switched to ${userType} form`);
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
    // Student form
    if (validationForm) {
        validationForm.addEventListener('submit', handleValidation);
    }
    
    if (feedbackFormEl) {
        feedbackFormEl.addEventListener('submit', handleFeedbackSubmission);
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', goBackToValidation);
    }
    
    if (commentsTextarea) {
        commentsTextarea.addEventListener('input', updateCharCount);
    }
    
    // Visitor form
    if (visitorFeedbackForm) {
        visitorFeedbackForm.addEventListener('submit', handleVisitorFeedbackSubmission);
    }
    
    if (visitorCommentsTextarea) {
        visitorCommentsTextarea.addEventListener('input', updateVisitorCharCount);
    }
    
    // Star ratings
    overallRatingInputs.forEach(input => {
        input.addEventListener('change', updateRatingText);
    });
    
    // Visitor star ratings
    const visitorRatingInputs = document.querySelectorAll('input[name="visitor_overall_rating"]');
    visitorRatingInputs.forEach(input => {
        input.addEventListener('change', updateVisitorRatingText);
    });
}

// ============ STUDENT VALIDATION ============

async function handleValidation(e) {
    e.preventDefault();
    
    const transactionId = document.getElementById('transactionId').value.trim();
    const studentNumber = document.getElementById('studentNumber').value.trim();
    const department = document.getElementById('department').value;
    
    validationError.style.display = 'none';
    
    const submitBtn = validationForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    submitBtn.disabled = true;
    
    try {
        console.log('🔍 Validating transaction:', { transactionId, studentNumber, department });
        
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
        console.log('📊 Validation result:', result);
        
        if (response.ok && result.success) {
            validatedTransaction = result.transaction;
            showFeedbackForm();
        } else {
            showValidationError(result.message || 'Transaction not found or not eligible for feedback.');
        }
    } catch (error) {
        console.error('❌ Validation error:', error);
        showValidationError('An error occurred during validation. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showValidationError(message) {
    validationErrorText.textContent = message;
    validationError.style.display = 'flex';
}

function showFeedbackForm() {
    validationStep.style.display = 'none';
    feedbackStep.style.display = 'block';
    
    document.getElementById('displayTransactionId').textContent = validatedTransaction.transaction_id;
    document.getElementById('displayDepartment').textContent = validatedTransaction.department_name;
    document.getElementById('displayDate').textContent = new Date(validatedTransaction.transaction_date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToValidation() {
    feedbackStep.style.display = 'none';
    validationStep.style.display = 'block';
    feedbackFormEl.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ STUDENT FEEDBACK SUBMISSION ============

async function handleFeedbackSubmission(e) {
    e.preventDefault();
    
    feedbackError.style.display = 'none';
    
    const overallRating = document.querySelector('input[name="overall_rating"]:checked');
    const processingTime = document.querySelector('input[name="processing_time"]:checked');
    const staffAssistance = document.querySelector('input[name="staff_assistance"]:checked');
    const clarity = document.querySelector('input[name="clarity"]:checked');
    const facility = document.querySelector('input[name="facility"]:checked');
    
    if (!overallRating || !processingTime || !staffAssistance || !clarity || !facility) {
        showFeedbackError('Please rate all service aspects before submitting.');
        return;
    }
    
    const comments = document.getElementById('comments').value.trim();
    
    if (comments && !isCommentAppropriate(comments)) {
        showFeedbackError('Your comment contains inappropriate language. Please revise and try again.');
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
        is_anonymous: document.getElementById('anonymousToggle').checked,
        feedback_type: 'student'
    };
    
    console.log('📤 Submitting student feedback:', formData);
    
    const submitBtn = feedbackFormEl.querySelector('button[type="submit"]');
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
        console.log('📊 Submission result:', result);
        
        if (response.ok && result.success) {
            console.log('✅ Feedback submitted successfully!');
            showSuccessMessage(result.feedback_id);
        } else {
            showFeedbackError(result.message || 'Failed to submit feedback. Please try again.');
        }
    } catch (error) {
        console.error('❌ Submission error:', error);
        showFeedbackError('An error occurred while submitting feedback. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showFeedbackError(message) {
    feedbackErrorText.textContent = message;
    feedbackError.style.display = 'flex';
    window.scrollTo({ top: feedbackError.offsetTop - 100, behavior: 'smooth' });
}

// ============ VISITOR FEEDBACK SUBMISSION ============

async function handleVisitorFeedbackSubmission(e) {
    e.preventDefault();
    
    const visitorError = document.getElementById('visitorFeedbackError');
    const visitorErrorText = document.getElementById('visitorFeedbackErrorText');
    
    if (visitorError) visitorError.style.display = 'none';
    
    // Get visitor information
    const visitorName = document.getElementById('visitorName').value.trim();
    const visitorEmail = document.getElementById('visitorEmail').value.trim();
    const visitorPhone = document.getElementById('visitorPhone').value.trim();
    const visitPurpose = document.getElementById('visitPurpose').value;
    const department = document.getElementById('visitorDepartment').value;
    
    // Get ratings
    const overallRating = document.querySelector('input[name="visitor_overall_rating"]:checked');
    const processingTime = document.querySelector('input[name="visitor_processing_time"]:checked');
    const staffAssistance = document.querySelector('input[name="visitor_staff_assistance"]:checked');
    const clarity = document.querySelector('input[name="visitor_clarity"]:checked');
    const facility = document.querySelector('input[name="visitor_facility"]:checked');
    
    // Validation
    if (!visitorName) {
        if (visitorErrorText) visitorErrorText.textContent = 'Please enter your name.';
        if (visitorError) visitorError.style.display = 'flex';
        return;
    }
    
    if (!department || !visitPurpose) {
        if (visitorErrorText) visitorErrorText.textContent = 'Please select department and visit purpose.';
        if (visitorError) visitorError.style.display = 'flex';
        return;
    }
    
    if (!overallRating || !processingTime || !staffAssistance || !clarity || !facility) {
        if (visitorErrorText) visitorErrorText.textContent = 'Please rate all service aspects.';
        if (visitorError) visitorError.style.display = 'flex';
        return;
    }
    
    const comments = visitorCommentsTextarea.value.trim();
    
    if (comments && !isCommentAppropriate(comments)) {
        if (visitorErrorText) visitorErrorText.textContent = 'Your comment contains inappropriate language.';
        if (visitorError) visitorError.style.display = 'flex';
        return;
    }
    
    const formData = {
        visitor_name: visitorName,
        visitor_email: visitorEmail || null,
        visitor_phone: visitorPhone || null,
        visit_purpose: visitPurpose,
        department: department,
        overall_rating: parseInt(overallRating.value),
        processing_time: parseInt(processingTime.value),
        staff_assistance: parseInt(staffAssistance.value),
        clarity: parseInt(clarity.value),
        facility: parseInt(facility.value),
        comments: comments || null,
        feedback_type: 'visitor'
    };
    
    console.log('📤 Submitting visitor feedback:', formData);
    
    const submitBtn = visitorFeedbackForm.querySelector('button[type="submit"]');
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
            console.log('✅ Visitor feedback submitted!');
            showVisitorSuccessMessage(result.feedback_id);
        } else {
            if (visitorErrorText) visitorErrorText.textContent = result.message || 'Failed to submit feedback.';
            if (visitorError) visitorError.style.display = 'flex';
        }
    } catch (error) {
        console.error('❌ Visitor submission error:', error);
        if (visitorErrorText) visitorErrorText.textContent = 'An error occurred. Please try again.';
        if (visitorError) visitorError.style.display = 'flex';
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showVisitorSuccessMessage(feedbackId) {
    visitorForm.style.display = 'none';
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

// ============ SUCCESS MESSAGE ============

function showSuccessMessage(feedbackId) {
    feedbackStep.style.display = 'none';
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

// ============ CHAR COUNT ============

function updateCharCount() {
    const count = commentsTextarea.value.length;
    charCount.textContent = count;
    charCount.style.color = count >= 450 ? '#c62828' : '#888';
}

function updateVisitorCharCount() {
    const count = visitorCommentsTextarea.value.length;
    visitorCharCount.textContent = count;
    visitorCharCount.style.color = count >= 450 ? '#c62828' : '#888';
}

// ============ RATING TEXT ============

function updateRatingText() {
    const rating = document.querySelector('input[name="overall_rating"]:checked');
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

function updateVisitorRatingText() {
    const rating = document.querySelector('input[name="visitor_overall_rating"]:checked');
    const visitorRatingText = document.getElementById('visitorRatingText');
    
    if (rating && visitorRatingText) {
        const ratingValue = parseInt(rating.value);
        const ratingLabels = {
            5: 'Excellent',
            4: 'Good',
            3: 'Average',
            2: 'Poor',
            1: 'Very Poor'
        };
        visitorRatingText.textContent = ratingLabels[ratingValue];
        visitorRatingText.style.color = ratingValue >= 4 ? '#4caf50' : ratingValue === 3 ? '#ff9800' : '#c62828';
    }
}

// ============ PROFANITY FILTER ============

function isCommentAppropriate(text) {
    const profanityList = [
        'badword1', 'badword2', 'badword3'
        // Add actual profanity words as needed
    ];
    
    const lowerText = text.toLowerCase();
    return !profanityList.some(word => lowerText.includes(word));
}