// alumni-employment.js - Admin Dashboard JavaScript

let allResponses = [];
let filteredResponses = [];

// DOM Elements
const totalResponsesEl = document.getElementById('totalResponses');
const employedCountEl = document.getElementById('employedCount');
const unemployedCountEl = document.getElementById('unemployedCount');
const employmentRateEl = document.getElementById('employmentRate');
const timeline3monthsEl = document.getElementById('timeline3months');
const timeline6monthsEl = document.getElementById('timeline6months');
const timeline1yearEl = document.getElementById('timeline1year');
const timelineMoreEl = document.getElementById('timelineMore');
const responsesTableBody = document.getElementById('responsesTableBody');
const batchFilter = document.getElementById('batchFilter');
const programFilter = document.getElementById('programFilter');
const statusFilter = document.getElementById('statusFilter');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const exportBtn = document.getElementById('exportBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const surveyLinkInput = document.getElementById('surveyLink');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadResponses();
    loadStatistics();
    setupEventListeners();
    initializeProfileDropdown();
});

// Setup Event Listeners
function setupEventListeners() {
    batchFilter.addEventListener('change', applyFilters);
    programFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    exportBtn.addEventListener('click', exportToCSV);
    copyLinkBtn.addEventListener('click', copySurveyLink);
}

// Copy Survey Link
function copySurveyLink() {
    surveyLinkInput.select();
    surveyLinkInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(surveyLinkInput.value).then(() => {
        const originalText = copyLinkBtn.innerHTML;
        copyLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        copyLinkBtn.style.background = '#2e7d32';
        
        setTimeout(() => {
            copyLinkBtn.innerHTML = originalText;
            copyLinkBtn.style.background = '#1976d2';
        }, 2000);
    }).catch(err => {
        alertSystem.warning('Failed to copy link. Please copy manually.');
        console.error('Copy failed:', err);
    });
}

// Load All Responses
async function loadResponses() {
    try {
        const response = await fetch('http://localhost:3000/api/alumni-employment/responses');
        const data = await response.json();
        
        if (data.success) {
            allResponses = data.responses;
            filteredResponses = [...allResponses];
            
            // Populate batch filter
            populateBatchFilter();
            
            // Render table
            renderTable();
        }
    } catch (error) {
        console.error('Error loading responses:', error);
        responsesTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Error loading responses. Please refresh the page.</p>
                </td>
            </tr>
        `;
    }
}

// Load Statistics
async function loadStatistics() {
    try {
        const response = await fetch('http://localhost:3000/api/alumni-employment/stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Update stat cards
            totalResponsesEl.textContent = stats.total;
            employedCountEl.textContent = stats.employed;
            unemployedCountEl.textContent = stats.unemployed;
            
            // Calculate employment rate
            const rate = stats.total > 0 
                ? ((stats.employed / stats.total) * 100).toFixed(1) 
                : 0;
            employmentRateEl.textContent = `${rate}%`;
            
            // Update timeline stats
            const timelineCounts = {
                'Within 3 months': 0,
                'Within 6 months': 0,
                'Within 1 year': 0,
                'More than 1 year': 0
            };
            
            stats.timeline.forEach(item => {
                if (timelineCounts.hasOwnProperty(item.employment_timeline)) {
                    timelineCounts[item.employment_timeline] = parseInt(item.count);
                }
            });
            
            timeline3monthsEl.textContent = timelineCounts['Within 3 months'];
            timeline6monthsEl.textContent = timelineCounts['Within 6 months'];
            timeline1yearEl.textContent = timelineCounts['Within 1 year'];
            timelineMoreEl.textContent = timelineCounts['More than 1 year'];
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Populate Batch Filter
function populateBatchFilter() {
    const batches = [...new Set(allResponses.map(r => r.batch))].sort((a, b) => b - a);
    
    batches.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch;
        option.textContent = batch;
        batchFilter.appendChild(option);
    });
}

// Apply Filters
function applyFilters() {
    const batch = batchFilter.value;
    const program = programFilter.value;
    const status = statusFilter.value;
    
    filteredResponses = allResponses.filter(response => {
        const matchesBatch = !batch || response.batch === batch;
        const matchesProgram = !program || response.program === program;
        const matchesStatus = !status || response.employment_status === status;
        
        return matchesBatch && matchesProgram && matchesStatus;
    });
    
    renderTable();
}

// Clear Filters
function clearFilters() {
    batchFilter.value = '';
    programFilter.value = '';
    statusFilter.value = '';
    
    filteredResponses = [...allResponses];
    renderTable();
}

// Render Table
function renderTable() {
    if (filteredResponses.length === 0) {
        responsesTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="fa-solid fa-inbox"></i>
                    <p>No responses found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    responsesTableBody.innerHTML = '';
    
    filteredResponses.forEach(response => {
        const row = document.createElement('tr');
        
        const statusClass = response.employment_status.toLowerCase().replace(' ', '-');
        const submittedDate = new Date(response.submitted_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td>${response.full_name}</td>
            <td>${response.batch}</td>
            <td>${response.program}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${response.employment_status}
                </span>
            </td>
            <td>${response.work_type || 'N/A'}</td>
            <td>${response.employment_timeline || 'N/A'}</td>
            <td>${submittedDate}</td>
            <td>
                <button class="delete-btn" onclick="deleteResponse(${response.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        
        responsesTableBody.appendChild(row);
    });
}

// Delete Response
async function deleteResponse(id) {
    if (!confirm('Are you sure you want to delete this response?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/alumni-employment/responses/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reload data
            await loadResponses();
            await loadStatistics();
            
            alertSystem.success('Response deleted successfully');
        } else {
            alertSystem.warning('Failed to delete response');
        }
    } catch (error) {
        console.error('Error deleting response:', error);
        alertSystem.error('Error deleting response. Please try again.');
    }
}

// Export to CSV
function exportToCSV() {
    if (filteredResponses.length === 0) {
        alertSystem.warning('No data to export');
        return;
    }
    
    const headers = [
        'Full Name',
        'Batch',
        'Program',
        'Employment Status',
        'Work Type',
        'Employment Timeline',
        'Submitted Date'
    ];
    
    const rows = filteredResponses.map(r => [
        r.full_name,
        r.batch,
        r.program,
        r.employment_status,
        r.work_type || 'N/A',
        r.employment_timeline || 'N/A',
        new Date(r.submitted_at).toLocaleDateString()
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alumni_employment_responses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Make deleteResponse available globally
window.deleteResponse = deleteResponse;