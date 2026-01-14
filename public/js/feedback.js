// feedback.js - Transaction-Based Feedback System - FIXED VERSION

const API_URL = 'http://localhost:3000/api';

// state management
let validatedTransaction = null;

// DOM Elements
const validationStep = document.getElementById('validationStep');
const feedbackStep = document.getElementById('feedbackStep');
const successStep = document.getElementById('successStep');

const validationForm = document.getElementById('validationForm');
const feedbackForm = document.getElementById('feedbackForm');

const validationError = document.getElementById('validationError');
const validationErrorText = document.getElementById('validationErrorText');
const feedbackError = document.getElementById('feedbackError');
const feedbackErrorText = document.getElementById('feedbackErrorText');

const backBtn = document.getElementById('backBtn');
const commentsTextarea = document.getElementById('comments');
const charCount = document.getElementById('charCount');

// Star rating elements
const overallRatingInputs = document.querySelectorAll('input[name="overall_rating"]');
const ratingText = document.getElementById('ratingText');

// initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    validationForm.addEventListener('submit', handleValidation);
    feedbackForm.addEventListener('submit', handleFeedbackSubmission);
    backBtn.addEventListener('click', goBackToValidation);
    commentsTextarea.addEventListener('input', updateCharCount);
    
    overallRatingInputs.forEach(input => {
        input.addEventListener('change', updateRatingText);
    });
}

// Handle Transaction Validation
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
        
        // Call actual API
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

// Show validation error
function showValidationError(message) {
    validationErrorText.textContent = message;
    validationError.style.display = 'flex';
}

// Show feedback form step
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

// Go back to validation step
function goBackToValidation() {
    feedbackStep.style.display = 'none';
    validationStep.style.display = 'block';
    feedbackForm.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update character count
function updateCharCount() {
    const count = commentsTextarea.value.length;
    charCount.textContent = count;
    
    if (count >= 450) {
        charCount.style.color = '#c62828';
    } else {
        charCount.style.color = '#888';
    }
}

// Update rating text
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

// Handle feedback submission
async function handleFeedbackSubmission(e) {
    e.preventDefault();
    
    feedbackError.style.display = 'none';
    
    // Get all ratings
    const overallRating = document.querySelector('input[name="overall_rating"]:checked');
    const processingTime = document.querySelector('input[name="processing_time"]:checked');
    const staffAssistance = document.querySelector('input[name="staff_assistance"]:checked');
    const clarity = document.querySelector('input[name="clarity"]:checked');
    const facility = document.querySelector('input[name="facility"]:checked');
    
    // Validate all ratings are selected
    if (!overallRating || !processingTime || !staffAssistance || !clarity || !facility) {
        showFeedbackError('Please rate all service aspects before submitting.');
        return;
    }
    
    const comments = document.getElementById('comments').value.trim();
    
    // Filter comments (basic profanity check)
    if (comments && !isCommentAppropriate(comments)) {
        showFeedbackError('Your comment contains inappropriate language. Please revise and try again.');
        return;
    }
    
    // Prepare form data
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
        is_anonymous: document.getElementById('anonymousToggle').checked
    };
    
    console.log('📤 Submitting feedback:', formData);
    
    const submitBtn = feedbackForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        // ACTUAL API CALL
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

// Show feedback error
function showFeedbackError(message) {
    feedbackErrorText.textContent = message;
    feedbackError.style.display = 'flex';
    window.scrollTo({ top: feedbackError.offsetTop - 100, behavior: 'smooth' });
}

// Show success message
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

// Basic profanity filter
function isCommentAppropriate(text) {
    const profanityList = [
        'badword1', 'badword2', 'badword3'
    ];
    
    const lowerText = text.toLowerCase();
    return !profanityList.some(word => lowerText.includes(word));
}