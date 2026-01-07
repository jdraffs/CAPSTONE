// feedback.js - Transaction-Based Feedback System

// state management
let validatedTransaction = null;
let allTransactions = [];

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
    loadTransactions();
    setupEventListeners();
});

// Load transaction data (mock for now, will be API call later)
async function loadTransactions() {
    try {
        const response = await fetch('/public/data/transactions.json');
        const data = await response.json();
        allTransactions = data.transactions || [];
    } catch (error) {
        console.error('Error loading transactions:', error);
        allTransactions = [];
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Validation form submission
    validationForm.addEventListener('submit', handleValidation);
    
    // Feedback form submission
    feedbackForm.addEventListener('submit', handleFeedbackSubmission);
    
    // Back button
    backBtn.addEventListener('click', goBackToValidation);
    
    // Character counter for comments
    commentsTextarea.addEventListener('input', updateCharCount);
    
    // Star rating feedback
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
    
    // Hide previous errors
    validationError.style.display = 'none';
    
    // Show loading state
    const submitBtn = validationForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    submitBtn.disabled = true;
    
    try {
        // Validate transaction (mock validation for now)
        const transaction = await validateTransaction(transactionId, studentNumber, department);
        
        if (transaction) {
            validatedTransaction = transaction;
            showFeedbackForm();
        } else {
            showValidationError('Transaction not found or already has feedback submitted.');
        }
    } catch (error) {
        showValidationError('An error occurred during validation. Please try again.');
        console.error('Validation error:', error);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Validate transaction (mock function - will be replaced with API call)
async function validateTransaction(transactionId, studentNumber, department) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find transaction in mock data
    const transaction = allTransactions.find(t => 
        t.transaction_id.toLowerCase() === transactionId.toLowerCase() &&
        t.student_number === studentNumber &&
        t.department === department &&
        !t.feedback_submitted
    );
    
    return transaction || null;
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
    
    // Populate transaction details
    document.getElementById('displayTransactionId').textContent = validatedTransaction.transaction_id;
    document.getElementById('displayDepartment').textContent = validatedTransaction.department;
    document.getElementById('displayDate').textContent = new Date(validatedTransaction.transaction_date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Scroll to top
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
    
    // Hide previous errors
    feedbackError.style.display = 'none';
    
    // Get form data
    const formData = {
        transaction_id: validatedTransaction.transaction_id,
        student_number: validatedTransaction.student_number,
        department: validatedTransaction.department,
        department_id: validatedTransaction.department_id,
        overall_rating: parseInt(document.querySelector('input[name="overall_rating"]:checked').value),
        processing_time: parseInt(document.querySelector('input[name="processing_time"]:checked').value),
        staff_assistance: parseInt(document.querySelector('input[name="staff_assistance"]:checked').value),
        clarity: parseInt(document.querySelector('input[name="clarity"]:checked').value),
        facility: parseInt(document.querySelector('input[name="facility"]:checked').value),
        comments: document.getElementById('comments').value.trim(),
        is_anonymous: document.getElementById('anonymousToggle').checked,
        submitted_at: new Date().toISOString()
    };
    
    // Validate all ratings are selected
    if (!formData.overall_rating || !formData.processing_time || !formData.staff_assistance || 
        !formData.clarity || !formData.facility) {
        showFeedbackError('Please rate all service aspects before submitting.');
        return;
    }
    
    // Filter comments (basic profanity check)
    const filteredComments = filterProfanity(formData.comments);
    if (filteredComments !== formData.comments) {
        showFeedbackError('Your comment contains inappropriate language. Please revise and try again.');
        return;
    }
    
    // Show loading state
    const submitBtn = feedbackForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        // Submit feedback (will be API call)
        const result = await submitFeedback(formData);
        
        if (result.success) {
            showSuccessMessage(result.feedback_id);
        } else {
            showFeedbackError(result.message || 'Failed to submit feedback. Please try again.');
        }
    } catch (error) {
        showFeedbackError('An error occurred while submitting feedback. Please try again.');
        console.error('Submission error:', error);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Submit feedback (mock function - will be replaced with API call)
async function submitFeedback(formData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock successful submission
    return {
        success: true,
        feedback_id: 'FB-' + Date.now(),
        message: 'Feedback submitted successfully'
    };
    
    // Actual API call (to be implemented):
    // const response = await fetch('/api/feedback', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(formData)
    // });
    // return await response.json();
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
function filterProfanity(text) {
    // Basic profanity list (extend as needed)
    const profanityList = [
        'badword1', 'badword2', 'badword3', // replace nlng next tym
        // pede pa mag add ng iba
    ];
    
    let filteredText = text;
    profanityList.forEach(word => {
        const regex = new RegExp(word, 'gi');
        if (regex.test(filteredText)) {
            return null; // Return null if profanity detected
        }
    });
    
    return filteredText;
}

// Helper: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}