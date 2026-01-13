// private/js/admin/admiLlave/Management.js - PART 1

const adminid = 6; // AdminLlave's ID
let activeCycleId = null;
let currentCycle = null;
let activeSubTab = 'sections'; // Default sub-tab

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeProfileDropdown();
    await loadActiveCycle();
    renderManagementUI();
    setupEventListeners();
});

// ============================================
// LOAD ACTIVE CYCLE
// ============================================

async function loadActiveCycle() {
    try {
        const response = await fetch('/api/accreditation/cycle/active');
        const data = await response.json();

        if (data.cycle) {
            currentCycle = data.cycle;
            activeCycleId = data.cycle.id;
        } else {
            showToast('No active cycle found. Please create a cycle first.', 'warning');
        }
    } catch (error) {
        console.error('Error loading active cycle:', error);
        showToast('Failed to load cycle information', 'error');
    }
}

// ============================================
// RENDER MANAGEMENT UI
// ============================================

function renderManagementUI() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <!-- Sub-Tab Toggle -->
        <div class="sub-tab-toggle">
            <button class="sub-tab-btn active" data-tab="sections" onclick="switchSubTab('sections')">
                <i class="fas fa-list"></i> Sections
            </button>
            <button class="sub-tab-btn" data-tab="accounts" onclick="switchSubTab('accounts')">
                <i class="fas fa-users"></i> Accounts
            </button>
        </div>

        <!-- Sections Sub-Tab -->
        <div class="sub-tab-content" id="sectionsTab">
            <div class="management-card">
                <div class="card-header">
                    <h2 class="card-title">Section Management</h2>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="openAddSectionModal()">
                            <i class="fas fa-plus"></i> Add Section
                        </button>
                        <button class="btn-secondary" onclick="openBulkImportModal()">
                            <i class="fas fa-upload"></i> Bulk Import
                        </button>
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Sections:</span>
                        <span class="stat-value" id="totalSectionsCount">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">With Links:</span>
                        <span class="stat-value" id="sectionsWithLinks">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Without Links:</span>
                        <span class="stat-value" id="sectionsWithoutLinks">0</span>
                    </div>
                </div>

                <!-- Search and Filter -->
                <div class="search-filter-bar">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchSections" placeholder="Search sections..." onkeyup="filterSections()">
                    </div>
                    <div class="filter-group">
                        <select id="filterArea" onchange="filterSections()">
                            <option value="">All Areas</option>
                            <option value="1">Area 1</option>
                            <option value="2">Area 2</option>
                            <option value="3">Area 3</option>
                            <option value="4">Area 4</option>
                            <option value="5">Area 5</option>
                            <option value="6">Area 6</option>
                            <option value="7">Area 7</option>
                            <option value="8">Area 8</option>
                            <option value="9">Area 9</option>
                            <option value="10">Area 10</option>
                        </select>
                        <select id="filterLinkStatus" onchange="filterSections()">
                            <option value="">All Status</option>
                            <option value="submitted">Submitted</option>
                            <option value="not_submitted">Not Submitted</option>
                        </select>
                    </div>
                </div>

                <!-- Sections Table -->
                <div class="table-container">
                    <table class="data-table" id="sectionsTable">
                        <thead>
                            <tr>
                                <th>Section Name</th>
                                <th>Area</th>
                                <th>Area Head</th>
                                <th>Link Status</th>
                                <th>Date Submitted</th>
                                <th>Review Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="sectionsTableBody">
                            <tr>
                                <td colspan="7" class="loading-cell">Loading sections...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Accounts Sub-Tab -->
        <div class="sub-tab-content" id="accountsTab" style="display: none;">
            <!-- Will be loaded when tab is clicked -->
        </div>
    `;

    // Load sections data
    if (activeCycleId) {
        loadSections();
    }
}

// ============================================
// SWITCH SUB-TAB
// ============================================

function switchSubTab(tabName) {
    activeSubTab = tabName;

    // Update button states
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Show/hide tab content
    document.getElementById('sectionsTab').style.display = tabName === 'sections' ? 'block' : 'none';
    document.getElementById('accountsTab').style.display = tabName === 'accounts' ? 'block' : 'none';

    // Load accounts tab content if switching to it
    if (tabName === 'accounts') {
        renderAccountsTab();
    }
}

// ============================================
// LOAD SECTIONS
// ============================================

let allSections = []; // Store all sections for filtering

async function loadSections() {
    if (!activeCycleId) {
        document.getElementById('sectionsTableBody').innerHTML = `
            <tr><td colspan="7" class="no-data">No active cycle. Please create a cycle first.</td></tr>
        `;
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/sections/all/${activeCycleId}`);
        const data = await response.json();

        if (data.sections && data.sections.length > 0) {
            allSections = data.sections;
            displaySections(allSections);
            updateSectionStats(allSections);
        } else {
            allSections = [];
            document.getElementById('sectionsTableBody').innerHTML = `
                <tr><td colspan="7" class="no-data">No sections found. Add sections to get started.</td></tr>
            `;
            updateSectionStats([]);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        showToast('Failed to load sections', 'error');
        document.getElementById('sectionsTableBody').innerHTML = `
            <tr><td colspan="7" class="error-cell">Error loading sections</td></tr>
        `;
    }
}

function displaySections(sections) {
    const tbody = document.getElementById('sectionsTableBody');
    
    if (sections.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" class="no-data">No sections match your filters</td></tr>
        `;
        return;
    }

    tbody.innerHTML = sections.map(section => {
        const linkStatus = section.google_drive_link 
            ? '<span class="badge badge-green">Submitted</span>' 
            : '<span class="badge badge-gray">Not Submitted</span>';
        
        const reviewStatus = getReviewStatusBadge(section.review_status);
        
        const submittedDate = section.submitted_at 
            ? new Date(section.submitted_at).toLocaleDateString() 
            : '-';
        
        const linkButton = section.google_drive_link 
            ? `<a href="${section.google_drive_link}" target="_blank" class="btn-icon" title="Open Link">
                <i class="fas fa-external-link-alt"></i>
               </a>`
            : '';

        return `
            <tr>
                <td><strong>${section.section_name}</strong></td>
                <td>Area ${section.area_number}</td>
                <td>${section.area_head_name || '-'}</td>
                <td>${linkStatus}</td>
                <td>${submittedDate}</td>
                <td>${reviewStatus}</td>
                <td class="action-buttons">
                    ${linkButton}
                    <button class="btn-icon" onclick="editSection(${section.section_id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteSection(${section.section_id}, '${section.section_name}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateSectionStats(sections) {
    const total = sections.length;
    const withLinks = sections.filter(s => s.google_drive_link).length;
    const withoutLinks = total - withLinks;

    document.getElementById('totalSectionsCount').textContent = total;
    document.getElementById('sectionsWithLinks').textContent = withLinks;
    document.getElementById('sectionsWithoutLinks').textContent = withoutLinks;
}

// ============================================
// FILTER SECTIONS
// ============================================

function filterSections() {
    const searchTerm = document.getElementById('searchSections').value.toLowerCase();
    const areaFilter = document.getElementById('filterArea').value;
    const linkStatusFilter = document.getElementById('filterLinkStatus').value;

    let filtered = allSections;

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.section_name.toLowerCase().includes(searchTerm)
        );
    }

    // Area filter
    if (areaFilter) {
        filtered = filtered.filter(s => 
            s.area_number.toString() === areaFilter
        );
    }

    // Link status filter
    if (linkStatusFilter === 'submitted') {
        filtered = filtered.filter(s => s.google_drive_link);
    } else if (linkStatusFilter === 'not_submitted') {
        filtered = filtered.filter(s => !s.google_drive_link);
    }

    displaySections(filtered);
}

// ============================================
// ADD SECTION MODAL
// ============================================

function openAddSectionModal() {
    if (!activeCycleId) {
        showToast('No active cycle. Please create a cycle first.', 'warning');
        return;
    }

    const modal = createModal('Add New Section', `
        <div class="form-group">
            <label for="newSectionName">Section Name *</label>
            <input type="text" id="newSectionName" placeholder="e.g., BSIT 1-1" required>
        </div>
        <div class="form-group">
            <label for="newSectionArea">Area *</label>
            <select id="newSectionArea" required>
                <option value="">Select Area</option>
                <option value="1">Area 1: Mission, Vision, Goals</option>
                <option value="2">Area 2: Faculty</option>
                <option value="3">Area 3: Curriculum and Instruction</option>
                <option value="4">Area 4: Support to Students</option>
                <option value="5">Area 5: Research</option>
                <option value="6">Area 6: Extension and Community</option>
                <option value="7">Area 7: Library</option>
                <option value="8">Area 8: Physical Plant and Facilities</option>
                <option value="9">Area 9: Laboratories</option>
                <option value="10">Area 10: Administration</option>
            </select>
        </div>
    `, async () => {
        const sectionName = document.getElementById('newSectionName').value.trim();
        const areaId = document.getElementById('newSectionArea').value;

        if (!sectionName || !areaId) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        await addSection(sectionName, areaId);
    });

    document.body.appendChild(modal);
}

async function addSection(sectionName, areaId) {
    try {
        const response = await fetch('/api/accreditation/section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cycle_id: activeCycleId,
                area_id: areaId,
                section_name: sectionName,
                created_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Section added successfully', 'success');
            closeAllModals();
            await loadSections();
        } else {
            showToast(data.error || 'Failed to add section', 'error');
        }
    } catch (error) {
        console.error('Error adding section:', error);
        showToast('Failed to add section', 'error');
    }
}

// ============================================
// EDIT SECTION
// ============================================

async function editSection(sectionId) {
    const section = allSections.find(s => s.section_id === sectionId);
    if (!section) return;

    const modal = createModal('Edit Section', `
        <div class="form-group">
            <label for="editSectionName">Section Name *</label>
            <input type="text" id="editSectionName" value="${section.section_name}" required>
        </div>
        <div class="form-group">
            <label for="editSectionArea">Area *</label>
            <select id="editSectionArea" required>
                <option value="1" ${section.area_number === 1 ? 'selected' : ''}>Area 1: Mission, Vision, Goals</option>
                <option value="2" ${section.area_number === 2 ? 'selected' : ''}>Area 2: Faculty</option>
                <option value="3" ${section.area_number === 3 ? 'selected' : ''}>Area 3: Curriculum and Instruction</option>
                <option value="4" ${section.area_number === 4 ? 'selected' : ''}>Area 4: Support to Students</option>
                <option value="5" ${section.area_number === 5 ? 'selected' : ''}>Area 5: Research</option>
                <option value="6" ${section.area_number === 6 ? 'selected' : ''}>Area 6: Extension and Community</option>
                <option value="7" ${section.area_number === 7 ? 'selected' : ''}>Area 7: Library</option>
                <option value="8" ${section.area_number === 8 ? 'selected' : ''}>Area 8: Physical Plant and Facilities</option>
                <option value="9" ${section.area_number === 9 ? 'selected' : ''}>Area 9: Laboratories</option>
                <option value="10" ${section.area_number === 10 ? 'selected' : ''}>Area 10: Administration</option>
            </select>
        </div>
    `, async () => {
        const sectionName = document.getElementById('editSectionName').value.trim();
        const areaId = document.getElementById('editSectionArea').value;

        if (!sectionName || !areaId) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        await updateSection(sectionId, sectionName, areaId);
    });

    document.body.appendChild(modal);
}

async function updateSection(sectionId, sectionName, areaId) {
    try {
        const response = await fetch(`/api/accreditation/section/${sectionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section_name: sectionName,
                area_id: areaId,
                updated_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Section updated successfully', 'success');
            closeAllModals();
            await loadSections();
        } else {
            showToast(data.error || 'Failed to update section', 'error');
        }
    } catch (error) {
        console.error('Error updating section:', error);
        showToast('Failed to update section', 'error');
    }
}

// ============================================
// DELETE SECTION
// ============================================

async function deleteSection(sectionId, sectionName) {
    if (!confirm(`Are you sure you want to delete "${sectionName}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/section/${sectionId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleted_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Section deleted successfully', 'success');
            await loadSections();
        } else {
            showToast(data.error || 'Failed to delete section', 'error');
        }
    } catch (error) {
        console.error('Error deleting section:', error);
        showToast('Failed to delete section', 'error');
    }
}
// private/js/admin/admiLlave/Management.js - PART 2

// ============================================
// BULK IMPORT MODAL
// ============================================

function openBulkImportModal() {
    if (!activeCycleId) {
        showToast('No active cycle. Please create a cycle first.', 'warning');
        return;
    }

    const modal = createModal('Bulk Import Sections', `
        <div class="import-instructions">
            <h4>CSV Format Instructions:</h4>
            <ul>
                <li>Column 1: Section Name (e.g., "BSIT 1-1")</li>
                <li>Column 2: Area Number (1-10)</li>
                <li>No header row required</li>
            </ul>
            <p class="example"><strong>Example:</strong><br>
            BSIT 1-1,1<br>
            BSIT 1-2,1<br>
            BSIT 2-1,2</p>
        </div>
        <div class="form-group">
            <label for="csvFile">Select CSV File *</label>
            <input type="file" id="csvFile" accept=".csv" required>
        </div>
    `, async () => {
        const fileInput = document.getElementById('csvFile');
        if (!fileInput.files[0]) {
            showToast('Please select a CSV file', 'error');
            return;
        }
        await processBulkImport(fileInput.files[0]);
    });

    document.body.appendChild(modal);
}

async function processBulkImport(file) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        const sections = [];
        for (let line of lines) {
            const [sectionName, areaNumber] = line.split(',').map(s => s.trim());
            if (sectionName && areaNumber) {
                sections.push({ section_name: sectionName, area_id: areaNumber });
            }
        }

        if (sections.length === 0) {
            showToast('No valid sections found in CSV', 'error');
            return;
        }

        try {
            const response = await fetch('/api/accreditation/sections/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cycle_id: activeCycleId,
                    sections: sections,
                    created_by: adminid
                })
            });

            const data = await response.json();

            if (data.success) {
                showToast(`Successfully imported ${data.count} sections`, 'success');
                closeAllModals();
                await loadSections();
            } else {
                showToast(data.error || 'Failed to import sections', 'error');
            }
        } catch (error) {
            console.error('Error importing sections:', error);
            showToast('Failed to import sections', 'error');
        }
    };

    reader.readAsText(file);
}

// ============================================
// RENDER ACCOUNTS TAB
// ============================================

function renderAccountsTab() {
    const accountsTab = document.getElementById('accountsTab');
    
    accountsTab.innerHTML = `
        <div class="accounts-container">
            <!-- Area Heads Section -->
            <div class="management-card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-user-tie"></i> Area Heads
                    </h2>
                    <button class="btn-primary" onclick="openAddAreaHeadModal()">
                        <i class="fas fa-plus"></i> Add Area Head
                    </button>
                </div>

                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Area Heads:</span>
                        <span class="stat-value" id="totalAreaHeads">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Active:</span>
                        <span class="stat-value" id="activeAreaHeads">0</span>
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Assigned Area(s)</th>
                                <th>Sections</th>
                                <th>Last Login</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="areaHeadsTableBody">
                            <tr><td colspan="7" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Accreditors Section -->
            <div class="management-card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-user-check"></i> Accreditors
                    </h2>
                    <button class="btn-primary" onclick="openAddAccreditorModal()">
                        <i class="fas fa-plus"></i> Add Accreditor
                    </button>
                </div>

                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Accreditors:</span>
                        <span class="stat-value" id="totalAccreditors">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Active:</span>
                        <span class="stat-value" id="activeAccreditors">0</span>
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Assigned Area(s)</th>
                                <th>Reviews</th>
                                <th>Last Login</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="accreditorsTableBody">
                            <tr><td colspan="7" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    loadAreaHeads();
    loadAccreditors();
}

// ============================================
// LOAD AREA HEADS
// ============================================

async function loadAreaHeads() {
    try {
        const response = await fetch('/api/accreditation/area-heads');
        const data = await response.json();

        const tbody = document.getElementById('areaHeadsTableBody');
        
        if (data.areaHeads && data.areaHeads.length > 0) {
            tbody.innerHTML = data.areaHeads.map(head => {
                const status = head.is_active ? 
                    '<span class="badge badge-green">Active</span>' : 
                    '<span class="badge badge-gray">Inactive</span>';
                
                const lastLogin = head.last_login ? 
                    new Date(head.last_login).toLocaleDateString() : 
                    'Never';

                return `
                    <tr>
                        <td><strong>${head.name}</strong></td>
                        <td>${head.email}</td>
                        <td>${head.assigned_areas || '-'}</td>
                        <td>${head.section_count || 0}</td>
                        <td>${lastLogin}</td>
                        <td>${status}</td>
                        <td class="action-buttons">
                            <button class="btn-icon" onclick="editAreaHead(${head.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="viewAreaHeadActivity(${head.id})" title="View Activity">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="deleteAreaHead(${head.id}, '${head.name}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            document.getElementById('totalAreaHeads').textContent = data.areaHeads.length;
            document.getElementById('activeAreaHeads').textContent = 
                data.areaHeads.filter(h => h.is_active).length;
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No area heads found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading area heads:', error);
    }
}

// ============================================
// LOAD ACCREDITORS
// ============================================

async function loadAccreditors() {
    try {
        const response = await fetch('/api/accreditation/accreditors');
        const data = await response.json();

        const tbody = document.getElementById('accreditorsTableBody');
        
        if (data.accreditors && data.accreditors.length > 0) {
            tbody.innerHTML = data.accreditors.map(acc => {
                const status = acc.is_active ? 
                    '<span class="badge badge-green">Active</span>' : 
                    '<span class="badge badge-gray">Inactive</span>';
                
                const lastLogin = acc.last_login ? 
                    new Date(acc.last_login).toLocaleDateString() : 
                    'Never';

                return `
                    <tr>
                        <td><strong>${acc.name}</strong></td>
                        <td>${acc.email}</td>
                        <td>${acc.assigned_areas || '-'}</td>
                        <td>${acc.review_count || 0}</td>
                        <td>${lastLogin}</td>
                        <td>${status}</td>
                        <td class="action-buttons">
                            <button class="btn-icon" onclick="editAccreditor(${acc.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="viewAccreditorActivity(${acc.id})" title="View Activity">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="deleteAccreditor(${acc.id}, '${acc.name}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            document.getElementById('totalAccreditors').textContent = data.accreditors.length;
            document.getElementById('activeAccreditors').textContent = 
                data.accreditors.filter(a => a.is_active).length;
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No accreditors found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading accreditors:', error);
    }
}

// ============================================
// ACCOUNT MANAGEMENT MODALS (Placeholders)
// ============================================

function openAddAreaHeadModal() {
    showToast('Area Head account creation will be integrated with user management system', 'info');
}

function openAddAccreditorModal() {
    showToast('Accreditor account creation will be integrated with user management system', 'info');
}

function editAreaHead(id) {
    showToast('Edit Area Head functionality coming soon', 'info');
}

function editAccreditor(id) {
    showToast('Edit Accreditor functionality coming soon', 'info');
}

function viewAreaHeadActivity(id) {
    showToast('Activity view coming soon', 'info');
}

function viewAccreditorActivity(id) {
    showToast('Activity view coming soon', 'info');
}

function deleteAreaHead(id, name) {
    showToast('Delete functionality will check for area assignments first', 'info');
}

function deleteAccreditor(id, name) {
    showToast('Delete functionality will check for area assignments first', 'info');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getReviewStatusBadge(status) {
    if (!status || status === 'Not Reviewed') {
        return '<span class="badge badge-gray">Not Reviewed</span>';
    } else if (status === 'Complete') {
        return '<span class="badge badge-green">Complete</span>';
    } else if (status === 'Needs Revision') {
        return '<span class="badge badge-yellow">Needs Revision</span>';
    } else if (status === 'Incomplete') {
        return '<span class="badge badge-red">Incomplete</span>';
    }
    return '<span class="badge badge-gray">-</span>';
}

function createModal(title, bodyHTML, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeAllModals()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${bodyHTML}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeAllModals()">Cancel</button>
                <button class="btn-primary" id="modalConfirmBtn">Confirm</button>
            </div>
        </div>
    `;

    // Add confirm button listener
    setTimeout(() => {
        const confirmBtn = document.getElementById('modalConfirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = onConfirm;
        }
    }, 100);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAllModals();
        }
    });

    return modal;
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.remove();
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setupEventListeners() {
    // Event listeners are handled inline with onclick attributes
    // Additional global event listeners can be added here if needed
}

function initializeProfileDropdown() {
    // Profile dropdown functionality
    console.log('Profile dropdown initialized');
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);