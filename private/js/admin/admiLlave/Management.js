// private/js/admin/admiLlave/management.js - PART 1: CORE & SECTIONS

const adminid = 6; // AdminLlave's ID
let activeCycleId = null;
let currentCycle = null;
let activeSubTab = 'sections'; // Default sub-tab

// Global storage for filtering
let allSections = [];
let allAreaHeads = [];
let allAccreditors = [];

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
                <i class="fas fa-list"></i> Accreditation Items
            </button>
            <button class="sub-tab-btn" data-tab="accounts" onclick="switchSubTab('accounts')">
                <i class="fas fa-users"></i> Accounts
            </button>
        </div>

        <!-- Sections Sub-Tab -->
        <div class="sub-tab-content" id="sectionsTab">
            <div class="management-card">
                <div class="card-header">
                    <h2 class="card-title">Accreditation Item Management</h2>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="openAddSectionModal()">
                            <i class="fas fa-plus"></i> Add Item
                        </button>
                        <button class="btn-secondary" onclick="openBulkImportModal()">
                            <i class="fas fa-upload"></i> Bulk Import
                        </button>
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Items:</span>
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
                        <input type="text" id="searchSections" placeholder="Search Items..." onkeyup="filterSections()">
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
                                <th>Item Name</th>
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
// SECTION MODALS
// ============================================

function openAddSectionModal() {
    if (!activeCycleId) {
        showToast('No active cycle. Please create a cycle first.', 'warning');
        return;
    }

    const modal = createModal('Add New Item', `
        <div class="form-group">
            <label for="newSectionName">Item Name *</label>
            <input type="text" id="newSectionName" placeholder="e.g., BSIT 1-1 / Course Syllabus" required>
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

async function editSection(sectionId) {
    const section = allSections.find(s => s.section_id === sectionId);
    if (!section) return;

    const modal = createModal('Edit Section', `
        <div class="form-group">
            <label for="editSectionName">Item Name *</label>
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

// ============================================
// BULK IMPORT
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
                <li>Column 1: Item Name (e.g., "BSIT 1-1")</li>
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
// private/js/admin/admiLlave/management.js - PART 2: ACCOUNTS TAB & ACCOUNT MANAGEMENT

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
                                <th>Accreditation Items</th>
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

// Replace the loadAreaHeads function with this updated version:
async function loadAreaHeads() {
    if (!activeCycleId) {
        document.getElementById('areaHeadsTableBody').innerHTML = 
            '<tr><td colspan="7" class="no-data">No active cycle</td></tr>';
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/accounts-with-assignments/${activeCycleId}`);
        const data = await response.json();

        const tbody = document.getElementById('areaHeadsTableBody');
        
        if (data.areaHeads && data.areaHeads.length > 0) {
            allAreaHeads = data.areaHeads;
            
            tbody.innerHTML = data.areaHeads.map(head => {
                const status = head.is_active ? 
                    '<span class="badge badge-green">Active</span>' : 
                    '<span class="badge badge-gray">Inactive</span>';
                
                const lastLogin = head.last_login ? 
                    new Date(head.last_login).toLocaleDateString() : 
                    'Never';

                const assignedAreas = head.assigned_areas || '-';
                const areaDisplay = !head.assigned_areas ? 
                    '<span style="color: #f59e0b;">No areas assigned</span>' : 
                    assignedAreas;

                return `
                    <tr>
                        <td><strong>${head.name}</strong></td>
                        <td>${head.email}</td>
                        <td>${areaDisplay}</td>
                        <td>${head.section_count || 0}</td>
                        <td>${lastLogin}</td>
                        <td>${status}</td>
                        <td class="action-buttons">
                            <button class="btn-icon" onclick="manageAreaHeadAssignments(${head.id})" title="Manage Assignments">
                                <i class="fas fa-tasks"></i>
                            </button>
                            <button class="btn-icon" onclick="editAreaHead(${head.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="viewAreaHeadActivity(${head.id})" title="View Details">
                                <i class="fas fa-info-circle"></i>
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
            document.getElementById('totalAreaHeads').textContent = 0;
            document.getElementById('activeAreaHeads').textContent = 0;
        }
    } catch (error) {
        console.error('Error loading area heads:', error);
        showToast('Failed to load area heads', 'error');
    }
}

// ============================================
// LOAD ACCREDITORS
// ============================================

async function loadAccreditors() {
    if (!activeCycleId) {
        document.getElementById('accreditorsTableBody').innerHTML = 
            '<tr><td colspan="7" class="no-data">No active cycle</td></tr>';
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/accounts-with-assignments/${activeCycleId}`);
        const data = await response.json();

        const tbody = document.getElementById('accreditorsTableBody');
        
        if (data.accreditors && data.accreditors.length > 0) {
            allAccreditors = data.accreditors;
            
            tbody.innerHTML = data.accreditors.map(acc => {
                const status = acc.is_active ? 
                    '<span class="badge badge-green">Active</span>' : 
                    '<span class="badge badge-gray">Inactive</span>';
                
                const lastLogin = acc.last_login ? 
                    new Date(acc.last_login).toLocaleDateString() : 
                    'Never';

                const assignedAreas = acc.assigned_areas || '-';
                const areaDisplay = !acc.assigned_areas ? 
                    '<span style="color: #f59e0b;">No areas assigned</span>' : 
                    assignedAreas;

                return `
                    <tr>
                        <td><strong>${acc.name}</strong></td>
                        <td>${acc.email}</td>
                        <td>${areaDisplay}</td>
                        <td>${acc.review_count || 0}</td>
                        <td>${lastLogin}</td>
                        <td>${status}</td>
                        <td class="action-buttons">
                            <button class="btn-icon" onclick="manageAccreditorAssignments(${acc.id})" title="Manage Assignments">
                                <i class="fas fa-tasks"></i>
                            </button>
                            <button class="btn-icon" onclick="editAccreditor(${acc.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="viewAccreditorActivity(${acc.id})" title="View Details">
                                <i class="fas fa-info-circle"></i>
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
            document.getElementById('totalAccreditors').textContent = 0;
            document.getElementById('activeAccreditors').textContent = 0;
        }
    } catch (error) {
        console.error('Error loading accreditors:', error);
        showToast('Failed to load accreditors', 'error');
    }
}

// ============================================
// ADD AREA HEAD MODAL
// ============================================

function openAddAreaHeadModal() {
    const modal = createModal('Create Area Head Account', `
        <div class="form-group">
            <label for="areaHeadUsername">Username *</label>
            <input type="text" id="areaHeadUsername" placeholder="Enter username" required>
            <small class="form-hint">Username must be unique</small>
        </div>
        <div class="form-group">
            <label for="areaHeadFullName">Full Name *</label>
            <input type="text" id="areaHeadFullName" placeholder="Enter full name" required>
        </div>
        <div class="form-group">
            <label for="areaHeadEmail">Email *</label>
            <input type="email" id="areaHeadEmail" placeholder="Enter email address" required>
            <small class="form-hint">Must be a valid email address</small>
        </div>
        <div class="form-group">
            <label for="areaHeadPassword">Password *</label>
            <input type="password" id="areaHeadPassword" placeholder="Enter password" required>
            <small class="form-hint">Minimum 8 characters</small>
        </div>
        <div class="form-group">
            <label for="areaHeadPasswordConfirm">Confirm Password *</label>
            <input type="password" id="areaHeadPasswordConfirm" placeholder="Re-enter password" required>
        </div>
    `, async () => {
        const username = document.getElementById('areaHeadUsername').value.trim();
        const fullName = document.getElementById('areaHeadFullName').value.trim();
        const email = document.getElementById('areaHeadEmail').value.trim();
        const password = document.getElementById('areaHeadPassword').value;
        const confirmPassword = document.getElementById('areaHeadPasswordConfirm').value;

        // Validation
        if (!username || !fullName || !email || !password || !confirmPassword) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        // Password validation
        if (password.length < 8) {
            showToast('Password must be at least 8 characters long', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        await createAreaHeadAccount(username, fullName, email, password);
    });

    document.body.appendChild(modal);
}

async function createAreaHeadAccount(username, fullName, email, password) {
    try {
        const response = await fetch('/api/accreditation/account/area-head', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                full_name: fullName,
                email,
                password,
                created_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Area Head account created successfully', 'success');
            closeAllModals();
            await loadAreaHeads();
        } else {
            showToast(data.error || 'Failed to create Area Head account', 'error');
        }
    } catch (error) {
        console.error('Error creating Area Head account:', error);
        showToast('Failed to create Area Head account', 'error');
    }
}

// ============================================
// ADD ACCREDITOR MODAL
// ============================================

function openAddAccreditorModal() {
    const modal = createModal('Create Accreditor Account', `
        <div class="form-group">
            <label for="accreditorUsername">Username *</label>
            <input type="text" id="accreditorUsername" placeholder="Enter username" required>
            <small class="form-hint">Username must be unique</small>
        </div>
        <div class="form-group">
            <label for="accreditorFullName">Full Name *</label>
            <input type="text" id="accreditorFullName" placeholder="Enter full name" required>
        </div>
        <div class="form-group">
            <label for="accreditorEmail">Email *</label>
            <input type="email" id="accreditorEmail" placeholder="Enter email address" required>
            <small class="form-hint">Must be a valid email address</small>
        </div>
        <div class="form-group">
            <label for="accreditorPassword">Password *</label>
            <input type="password" id="accreditorPassword" placeholder="Enter password" required>
            <small class="form-hint">Minimum 8 characters</small>
        </div>
        <div class="form-group">
            <label for="accreditorPasswordConfirm">Confirm Password *</label>
            <input type="password" id="accreditorPasswordConfirm" placeholder="Re-enter password" required>
        </div>
    `, async () => {
        const username = document.getElementById('accreditorUsername').value.trim();
        const fullName = document.getElementById('accreditorFullName').value.trim();
        const email = document.getElementById('accreditorEmail').value.trim();
        const password = document.getElementById('accreditorPassword').value;
        const confirmPassword = document.getElementById('accreditorPasswordConfirm').value;

        // Validation
        if (!username || !fullName || !email || !password || !confirmPassword) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        // Password validation
        if (password.length < 8) {
            showToast('Password must be at least 8 characters long', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        await createAccreditorAccount(username, fullName, email, password);
    });

    document.body.appendChild(modal);
}

async function createAccreditorAccount(username, fullName, email, password) {
    try {
        const response = await fetch('/api/accreditation/account/accreditor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                full_name: fullName,
                email,
                password,
                created_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Accreditor account created successfully', 'success');
            closeAllModals();
            await loadAccreditors();
        } else {
            showToast(data.error || 'Failed to create Accreditor account', 'error');
        }
    } catch (error) {
        console.error('Error creating Accreditor account:', error);
        showToast('Failed to create Accreditor account', 'error');
    }
}

// ============================================
// EDIT AREA HEAD
// ============================================

function editAreaHead(id) {
    const areaHead = allAreaHeads.find(ah => ah.id === id);
    if (!areaHead) return;

    const modal = createModal('Edit Area Head Account', `
        <div class="form-group">
            <label for="editAreaHeadFullName">Full Name *</label>
            <input type="text" id="editAreaHeadFullName" value="${areaHead.name}" required>
        </div>
        <div class="form-group">
            <label for="editAreaHeadEmail">Email *</label>
            <input type="email" id="editAreaHeadEmail" value="${areaHead.email}" required>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="editAreaHeadActive" ${areaHead.is_active ? 'checked' : ''}>
                Active Account
            </label>
        </div>
        <div class="form-group">
            <button class="btn-secondary" onclick="openResetPasswordModal(${id}, 'Area Head')" style="width: 100%;">
                <i class="fas fa-key"></i> Reset Password
            </button>
        </div>
    `, async () => {
        const fullName = document.getElementById('editAreaHeadFullName').value.trim();
        const email = document.getElementById('editAreaHeadEmail').value.trim();
        const isActive = document.getElementById('editAreaHeadActive').checked;

        if (!fullName || !email) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        await updateAccount(id, fullName, email, isActive);
    });

    document.body.appendChild(modal);
}

// ============================================
// EDIT ACCREDITOR
// ============================================

function editAccreditor(id) {
    const accreditor = allAccreditors.find(acc => acc.id === id);
    if (!accreditor) return;

    const modal = createModal('Edit Accreditor Account', `
        <div class="form-group">
            <label for="editAccreditorFullName">Full Name *</label>
            <input type="text" id="editAccreditorFullName" value="${accreditor.name}" required>
        </div>
        <div class="form-group">
            <label for="editAccreditorEmail">Email *</label>
            <input type="email" id="editAccreditorEmail" value="${accreditor.email}" required>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="editAccreditorActive" ${accreditor.is_active ? 'checked' : ''}>
                Active Account
            </label>
        </div>
        <div class="form-group">
            <button class="btn-secondary" onclick="openResetPasswordModal(${id}, 'Accreditor')" style="width: 100%;">
                <i class="fas fa-key"></i> Reset Password
            </button>
        </div>
    `, async () => {
        const fullName = document.getElementById('editAccreditorFullName').value.trim();
        const email = document.getElementById('editAccreditorEmail').value.trim();
        const isActive = document.getElementById('editAccreditorActive').checked;

        if (!fullName || !email) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        await updateAccount(id, fullName, email, isActive);
    });

    document.body.appendChild(modal);
}

async function updateAccount(accountId, fullName, email, isActive) {
    try {
        const response = await fetch(`/api/accreditation/account/${accountId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: fullName,
                email,
                is_active: isActive,
                updated_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Account updated successfully', 'success');
            closeAllModals();
            await loadAreaHeads();
            await loadAccreditors();
        } else {
            showToast(data.error || 'Failed to update account', 'error');
        }
    } catch (error) {
        console.error('Error updating account:', error);
        showToast('Failed to update account', 'error');
    }
}
// private/js/admin/admiLlave/management.js - PART 3: PASSWORD RESET, DELETE & UTILITIES

// ============================================
// RESET PASSWORD
// ============================================

function openResetPasswordModal(accountId, accountType) {
    closeAllModals();

    const modal = createModal(`Reset Password - ${accountType}`, `
        <div class="form-group">
            <label for="newPassword">New Password *</label>
            <input type="password" id="newPassword" placeholder="Enter new password" required>
            <small class="form-hint">Minimum 8 characters</small>
        </div>
        <div class="form-group">
            <label for="confirmNewPassword">Confirm New Password *</label>
            <input type="password" id="confirmNewPassword" placeholder="Re-enter new password" required>
        </div>
    `, async () => {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (!newPassword || !confirmPassword) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters long', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        await resetPassword(accountId, newPassword);
    });

    document.body.appendChild(modal);
}

async function resetPassword(accountId, newPassword) {
    try {
        const response = await fetch(`/api/accreditation/account/${accountId}/reset-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                new_password: newPassword,
                reset_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Password reset successfully', 'success');
            closeAllModals();
        } else {
            showToast(data.error || 'Failed to reset password', 'error');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showToast('Failed to reset password', 'error');
    }
}

// ============================================
// DELETE ACCOUNTS
// ============================================

function deleteAreaHead(id, name) {
    if (!confirm(`Are you sure you want to delete Area Head "${name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    deleteAccount(id, 'Area Head');
}

function deleteAccreditor(id, name) {
    if (!confirm(`Are you sure you want to delete Accreditor "${name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    deleteAccount(id, 'Accreditor');
}

async function deleteAccount(accountId, accountType) {
    try {
        const response = await fetch(`/api/accreditation/account/${accountId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleted_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast(`${accountType} account deleted successfully`, 'success');
            await loadAreaHeads();
            await loadAccreditors();
        } else {
            showToast(data.error || `Failed to delete ${accountType} account`, 'error');
        }
    } catch (error) {
        console.error(`Error deleting ${accountType} account:`, error);
        showToast(`Failed to delete ${accountType} account`, 'error');
    }
}
// ============================================
// VIEW AREA HEAD ACTIVITY WITH ASSIGNMENTS
// ============================================

async function viewAreaHeadActivity(id) {
    if (!activeCycleId) {
        showToast('No active cycle', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/account/${id}/details/${activeCycleId}`);
        const data = await response.json();

        if (!data.account) {
            showToast('Failed to load account details', 'error');
            return;
        }

        const account = data.account;
        const assignments = account.assignments || [];

        let assignmentHTML = '';
        if (assignments.length > 0) {
            assignmentHTML = `
                <h4>Assigned Areas:</h4>
                <div class="assignment-list">
                    ${assignments.map(a => `
                        <div class="assignment-item">
                            <strong>Area ${a.area_number}: ${a.area_name}</strong>
                            <p>Sections: ${a.section_count}</p>
                            <p>Assigned: ${new Date(a.assigned_at).toLocaleDateString()}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            assignmentHTML = '<p class="no-data">No areas assigned yet</p>';
        }

        const modal = createModal(`Area Head Details - ${account.full_name}`, `
            <div class="account-details">
                <div class="detail-row">
                    <strong>Username:</strong> ${account.username}
                </div>
                <div class="detail-row">
                    <strong>Email:</strong> ${account.email}
                </div>
                <div class="detail-row">
                    <strong>Status:</strong> 
                    ${account.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}
                </div>
                <div class="detail-row">
                    <strong>Last Login:</strong> 
                    ${account.last_login ? new Date(account.last_login).toLocaleString() : 'Never'}
                </div>
                <div class="detail-row">
                    <strong>Created:</strong> ${new Date(account.created_at).toLocaleDateString()}
                </div>
            </div>
            ${assignmentHTML}
        `, () => {
            closeAllModals();
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading area head details:', error);
        showToast('Failed to load area head details', 'error');
    }
}
// ============================================
// MANAGE AREA HEAD ASSIGNMENTS
// ============================================

async function manageAreaHeadAssignments(accountId) {
    if (!activeCycleId) {
        showToast('No active cycle', 'warning');
        return;
    }

    try {
        // Fetch account details
        const accountResponse = await fetch(`/api/accreditation/account/${accountId}/details/${activeCycleId}`);
        const accountData = await accountResponse.json();

        if (!accountData.account) {
            showToast('Failed to load account details', 'error');
            return;
        }

        const account = accountData.account;
        const currentAssignments = account.assignments || [];

        // Fetch available areas (areas not assigned to this area head)
        const areasResponse = await fetch(`/api/accreditation/areas/${activeCycleId}`);
        const areasData = await areasResponse.json();
        const allAreas = areasData.areas || [];

        // Create assignment interface
        let areasHTML = '';
        allAreas.forEach(area => {
            const isAssigned = currentAssignments.some(a => a.area_id === area.area_id);
            const hasOtherHead = area.area_head_id && area.area_head_id !== accountId;
            
            let statusHTML = '';
            if (isAssigned) {
                statusHTML = `
                    <button class="btn-danger btn-sm" onclick="removeAreaHeadAssignment(${activeCycleId}, ${area.area_id}, ${accountId})">
                        <i class="fas fa-times"></i> Remove
                    </button>
                `;
            } else if (hasOtherHead) {
                statusHTML = `<span class="text-muted">Assigned to ${area.area_head_name}</span>`;
            } else {
                statusHTML = `
                    <button class="btn-primary btn-sm" onclick="assignAreaHead(${activeCycleId}, ${area.area_id}, ${accountId})">
                        <i class="fas fa-plus"></i> Assign
                    </button>
                `;
            }

            areasHTML += `
                <div class="area-assignment-row">
                    <div class="area-info">
                        <strong>Area ${area.area_number}: ${area.area_name}</strong>
                        <p class="text-sm">Sections: ${area.total_sections}</p>
                    </div>
                    <div class="area-action">
                        ${statusHTML}
                    </div>
                </div>
            `;
        });

        const modal = createModal(`Manage Area Assignments - ${account.full_name}`, `
            <div class="assignment-manager">
                <p class="info-text">Assign this Area Head to specific areas. Each area can only have one Area Head.</p>
                <div class="areas-list">
                    ${areasHTML}
                </div>
            </div>
        `, () => {
            closeAllModals();
            loadAreaHeads(); // Reload to show updated assignments
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading area assignments:', error);
        showToast('Failed to load area assignments', 'error');
    }
}

async function assignAreaHead(cycleId, areaId, accountId) {
    try {
        const response = await fetch('/api/accreditation/assign/area-head', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cycle_id: cycleId,
                area_id: areaId,
                area_head_id: accountId,
                assigned_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Area Head assigned successfully', 'success');
            // Reload the modal
            closeAllModals();
            manageAreaHeadAssignments(accountId);
        } else {
            showToast(data.error || 'Failed to assign Area Head', 'error');
        }
    } catch (error) {
        console.error('Error assigning Area Head:', error);
        showToast('Failed to assign Area Head', 'error');
    }
}

async function removeAreaHeadAssignment(cycleId, areaId, accountId) {
    if (!confirm('Are you sure you want to remove this area assignment?')) {
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/assign/area-head/${cycleId}/${areaId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ removed_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Area assignment removed successfully', 'success');
            // Reload the modal
            closeAllModals();
            manageAreaHeadAssignments(accountId);
        } else {
            showToast(data.error || 'Failed to remove area assignment', 'error');
        }
    } catch (error) {
        console.error('Error removing area assignment:', error);
        showToast('Failed to remove area assignment', 'error');
    }
}

// ============================================
// MANAGE ACCREDITOR ASSIGNMENTS
// ============================================

async function manageAccreditorAssignments(accountId) {
    if (!activeCycleId) {
        showToast('No active cycle', 'warning');
        return;
    }

    try {
        // Fetch account details
        const accountResponse = await fetch(`/api/accreditation/account/${accountId}/details/${activeCycleId}`);
        const accountData = await accountResponse.json();

        if (!accountData.account) {
            showToast('Failed to load account details', 'error');
            return;
        }

        const account = accountData.account;
        const currentAssignments = account.assignments || [];

        // Fetch all areas
        const areasResponse = await fetch(`/api/accreditation/areas/${activeCycleId}`);
        const areasData = await areasResponse.json();
        const allAreas = areasData.areas || [];

        // Create assignment interface
        let areasHTML = '';
        allAreas.forEach(area => {
            const isAssigned = currentAssignments.some(a => a.area_id === area.area_id);
            
            let statusHTML = '';
            if (isAssigned) {
                // Get assignment ID to remove
                const assignment = currentAssignments.find(a => a.area_id === area.area_id);
                statusHTML = `
                    <button class="btn-danger btn-sm" onclick="removeAccreditorAssignment(${activeCycleId}, ${area.area_id}, ${accountId})">
                        <i class="fas fa-times"></i> Remove
                    </button>
                `;
            } else {
                statusHTML = `
                    <button class="btn-primary btn-sm" onclick="assignAccreditor(${activeCycleId}, ${area.area_id}, ${accountId})">
                        <i class="fas fa-plus"></i> Assign
                    </button>
                `;
            }

            areasHTML += `
                <div class="area-assignment-row">
                    <div class="area-info">
                        <strong>Area ${area.area_number}: ${area.area_name}</strong>
                        <p class="text-sm">Sections: ${area.total_sections}</p>
                    </div>
                    <div class="area-action">
                        ${statusHTML}
                    </div>
                </div>
            `;
        });

        const modal = createModal(`Manage Area Assignments - ${account.full_name}`, `
            <div class="assignment-manager">
                <p class="info-text">Assign this Accreditor to specific areas. Accreditors can be assigned to multiple areas.</p>
                <div class="areas-list">
                    ${areasHTML}
                </div>
            </div>
        `, () => {
            closeAllModals();
            loadAccreditors(); // Reload to show updated assignments
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading accreditor assignments:', error);
        showToast('Failed to load accreditor assignments', 'error');
    }
}

async function assignAccreditor(cycleId, areaId, accountId) {
    try {
        const response = await fetch('/api/accreditation/assign/accreditor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cycle_id: cycleId,
                area_id: areaId,
                accreditor_id: accountId,
                assigned_by: adminid
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Accreditor assigned successfully', 'success');
            // Reload the modal
            closeAllModals();
            manageAccreditorAssignments(accountId);
        } else {
            showToast(data.error || 'Failed to assign Accreditor', 'error');
        }
    } catch (error) {
        console.error('Error assigning Accreditor:', error);
        showToast('Failed to assign Accreditor', 'error');
    }
}

async function removeAccreditorAssignment(cycleId, areaId, accountId) {
    if (!confirm('Are you sure you want to remove this area assignment?')) {
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/assign/accreditor/${cycleId}/${areaId}/${accountId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ removed_by: adminid })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Area assignment removed successfully', 'success');
            // Reload the modal
            closeAllModals();
            manageAccreditorAssignments(accountId);
        } else {
            showToast(data.error || 'Failed to remove area assignment', 'error');
        }
    } catch (error) {
        console.error('Error removing accreditor assignment:', error);
        showToast('Failed to remove accreditor assignment', 'error');
    }
}

// ============================================
// VIEW ACCREDITOR ACTIVITY WITH ASSIGNMENTS
// ============================================

async function viewAccreditorActivity(id) {
    if (!activeCycleId) {
        showToast('No active cycle', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/accreditation/account/${id}/details/${activeCycleId}`);
        const data = await response.json();

        if (!data.account) {
            showToast('Failed to load account details', 'error');
            return;
        }

        const account = data.account;
        const assignments = account.assignments || [];

        let assignmentHTML = '';
        if (assignments.length > 0) {
            assignmentHTML = `
                <h4>Assigned Areas:</h4>
                <div class="assignment-list">
                    ${assignments.map(a => `
                        <div class="assignment-item">
                            <strong>Area ${a.area_number}: ${a.area_name}</strong>
                            <p>Reviews Completed: ${a.review_count}</p>
                            <p>Assigned: ${new Date(a.assigned_at).toLocaleDateString()}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            assignmentHTML = '<p class="no-data">No areas assigned yet</p>';
        }

        const modal = createModal(`Accreditor Details - ${account.full_name}`, `
            <div class="account-details">
                <div class="detail-row">
                    <strong>Username:</strong> ${account.username}
                </div>
                <div class="detail-row">
                    <strong>Email:</strong> ${account.email}
                </div>
                <div class="detail-row">
                    <strong>Status:</strong> 
                    ${account.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}
                </div>
                <div class="detail-row">
                    <strong>Last Login:</strong> 
                    ${account.last_login ? new Date(account.last_login).toLocaleString() : 'Never'}
                </div>
                <div class="detail-row">
                    <strong>Created:</strong> ${new Date(account.created_at).toLocaleDateString()}
                </div>
            </div>
            ${assignmentHTML}
        `, () => {
            closeAllModals();
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading accreditor details:', error);
        showToast('Failed to load accreditor details', 'error');
    }
}

// ============================================
// VIEW ACTIVITY (PLACEHOLDER)
// ============================================

function viewAreaHeadActivity(id) {
    showToast('Activity view coming soon', 'info');
}

function viewAccreditorActivity(id) {
    showToast('Activity view coming soon', 'info');
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