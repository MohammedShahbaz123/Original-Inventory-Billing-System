// Parties management
let allParties = [];

async function loadParties() {
    try {
        const partiesList = document.getElementById('parties-list');
        partiesList.innerHTML = `
            <div class="parties-empty-state">
                <div class="parties-empty-icon">⏳</div>
                <h3>Loading Parties...</h3>
                <p>Please wait while we load your parties</p>
            </div>
        `;

        allParties = await SupabaseService.getParties();
        displayParties(allParties);
    } catch (error) {
        console.error('Error loading parties:', error);
    }
}

function displayParties(parties) {
    const partiesList = document.getElementById('parties-list');
    
    if (parties.length === 0) {
        partiesList.innerHTML = `
            <div class="parties-empty-state">
                <div class="parties-empty-icon">👥</div>
                <h3>No Parties Found</h3>
                <p>Get started by adding your first party</p>
                <button onclick="showAddPartyForm()" class="create-btn">+ Add Party</button>
            </div>
        `;
        return;
    }

    partiesList.innerHTML = parties.map(party => `
        <div class="party-card" data-party-id="${party.id}">
            <div class="party-header">
                <h3 class="party-name">${party.name}</h3>
                <span class="party-type-badge party-type-${party.type}">${getPartyTypeLabel(party.type)}</span>
            </div>
            
            <div class="party-details">
                ${party.phone ? `<div class="party-detail"><span class="detail-icon">📞</span> ${party.phone}</div>` : ''}
                ${party.email ? `<div class="party-detail"><span class="detail-icon">📧</span> ${party.email}</div>` : ''}
                ${party.address ? `<div class="party-detail"><span class="detail-icon">📍</span> ${party.address}</div>` : ''}
            </div>
            
            <div class="party-actions">
                <button onclick="editParty('${party.id}')" class="action-btn edit-btn">✏️ Edit</button>
                <button onclick="deleteParty('${party.id}')" class="action-btn delete-btn">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function getPartyTypeLabel(type) {
    const types = {
        'customer': 'Customer',
        'supplier': 'Supplier',
        'both': 'Customer & Supplier'
    };
    return types[type] || type;
}

function showAddPartyForm() {
    Navigation.showPage('createParty');
    loadExistingPartiesList();
}

function resetPartyForm() {
    document.getElementById('partyForm').reset();
    document.getElementById('partyExists').style.display = 'none';
}

function togglePartyFields() {
    // Additional field logic can be added here if needed
}

// Indian phone number formatting and validation
function formatPhone(input) {
    // Get current cursor position
    const cursorPosition = input.selectionStart;
    
    // Remove all non-digit characters
    let value = input.value.replace(/\D/g, '');
    
    // Format as Indian mobile number
    let formattedValue = '';
    if (value.length <= 5) {
        formattedValue = value;
    } else if (value.length <= 10) {
        formattedValue = value.substring(0, 5) + ' ' + value.substring(5);
    } else {
        // Limit to 10 digits for Indian numbers
        formattedValue = value.substring(0, 5) + ' ' + value.substring(5, 10);
    }
    
    input.value = formattedValue;
    
    // Restore cursor position approximately
    setTimeout(() => {
        input.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
    
    // Add visual validation feedback
    validatePhoneInput(input);
}

function validatePhoneInput(input) {
    const phone = input.value.replace(/\s/g, ''); // Remove spaces for validation
    const errorElement = input.parentNode.querySelector('.phone-error');
    
    if (phone === '') {
        // Empty phone is allowed (optional field)
        input.style.borderColor = '#e9ecef';
        if (errorElement) errorElement.style.display = 'none';
        return true;
    }
    
    const isValid = validateIndianPhoneNumber(phone);
    
    if (isValid) {
        input.style.borderColor = '#28a745';
        if (errorElement) errorElement.style.display = 'none';
    } else {
        input.style.borderColor = '#dc3545';
        if (errorElement) errorElement.style.display = 'block';
    }
    
    return isValid;
}

function validateIndianPhoneNumber(phone) {
    if (!phone) return true; // Empty is allowed
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Indian mobile numbers must be 10 digits and start with 6,7,8,9
    if (cleanPhone.length !== 10) {
        return false;
    }
    
    // Must start with 6,7,8,9 for Indian mobile numbers
    if (!/^[6-9]/.test(cleanPhone)) {
        return false;
    }
    
    // Check if it's a valid Indian mobile number pattern
    return /^[6-9]\d{9}$/.test(cleanPhone);
}

function getPhoneValidationMessage(phone) {
    if (!phone || phone.trim() === '') {
        return { isValid: true, message: '' };
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) {
        return { isValid: false, message: 'Phone number must be 10 digits' };
    }
    
    if (!/^[6-9]/.test(cleanPhone)) {
        return { isValid: false, message: 'Indian mobile numbers must start with 6,7,8, or 9' };
    }
    
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return { isValid: false, message: 'Please enter a valid Indian mobile number' };
    }
    
    return { isValid: true, message: '' };
}

async function checkPartyExists(partyName) {
    if (partyName.length < 2) return;
    
    const exists = allParties.some(party => 
        party.name.toLowerCase() === partyName.toLowerCase()
    );
    
    document.getElementById('partyExists').style.display = exists ? 'block' : 'none';
}

async function loadExistingPartiesList() {
    const existingPartiesList = document.getElementById('existingPartiesList');
    const parties = await SupabaseService.getParties();
    
    if (parties.length === 0) {
        existingPartiesList.innerHTML = '<p class="no-parties">No parties added yet</p>';
        return;
    }

    existingPartiesList.innerHTML = parties.slice(0, 5).map(party => `
        <div class="existing-party-item">
            <strong>${party.name}</strong>
            <span class="party-type-small ${party.type}">${getPartyTypeLabel(party.type)}</span>
        </div>
    `).join('');
}

// Form submission
// Form submission - Update the existing handler
document.getElementById('partyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('partySubmitText').closest('button');
    Utils.showLoading(submitBtn);

    try {
        const phone = document.getElementById('partyPhone').value.trim();
        
        // Validate phone number
        const phoneValidation = getPhoneValidationMessage(phone);
        if (!phoneValidation.isValid) {
            Utils.showNotification(phoneValidation.message, 'warning');
            Utils.hideLoading(submitBtn);
            
            // Highlight the phone input
            const phoneInput = document.getElementById('partyPhone');
            phoneInput.style.borderColor = '#dc3545';
            phoneInput.focus();
            return;
        }

        const partyData = {
            name: document.getElementById('partyName').value.trim(),
            type: document.getElementById('partyType').value,
            phone: phone ? phone.replace(/\s/g, '') : null, // Remove spaces before storing
            email: document.getElementById('partyEmail').value.trim() || null,
            address: document.getElementById('partyAddress').value.trim() || null,
            created_at: new Date().toISOString()
        };

        // Check if party already exists
        const existingParty = allParties.find(party => 
            party.name.toLowerCase() === partyData.name.toLowerCase()
        );

        if (existingParty) {
            Utils.showNotification('Party with this name already exists', 'warning');
            Utils.hideLoading(submitBtn);
            return;
        }

        await SupabaseService.createParty(partyData);
        resetPartyForm();
        Navigation.showPage('party-management');
        
    } catch (error) {
        console.error('Error creating party:', error);
    } finally {
        Utils.hideLoading(submitBtn);
    }
});

function filterParties() {
    const searchTerm = document.getElementById('partiesSearch').value.toLowerCase();
    const filteredParties = allParties.filter(party => 
        party.name.toLowerCase().includes(searchTerm) ||
        (party.phone && party.phone.includes(searchTerm)) ||
        (party.email && party.email.toLowerCase().includes(searchTerm)) ||
        (party.type && party.type.toLowerCase().includes(searchTerm)) ||
        (party.address && party.address.toLowerCase().includes(searchTerm))
    );
    displayParties(filteredParties);
}

// Edit party functionality
let editingPartyId = null;

function editParty(partyId) {
    const party = allParties.find(p => p.id === partyId);
    if (party) {
        editingPartyId = partyId;
        showEditPartyPage(party);
    }
}

function showEditPartyPage(party) {
    // Format existing phone number for display
    let formattedPhone = '';
    if (party.phone) {
        const cleanPhone = party.phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
            formattedPhone = cleanPhone.substring(0, 5) + ' ' + cleanPhone.substring(5);
        } else {
            formattedPhone = party.phone;
        }
    }

    const editPageHTML = `
        <div class="page" id="editPartyPage">
            <div class="header">
                <div class="header-left">
                    <button onclick="closeEditPartyPage()" class="back-arrow-btn">←</button>
                    <h1>Edit Party</h1>
                </div>
                <div class="header-right">
                    <button onclick="resetEditPartyForm()" class="secondary-btn">🔄 Reset</button>
                </div>
            </div>
            
            <div class="form-container">
                <form id="editPartyForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editPartyName">Party Name *</label>
                            <input type="text" id="editPartyName" required 
                                   value="${escapeHtml(party.name)}"
                                   placeholder="Enter party name"
                                   maxlength="100" oninput="checkEditPartyExists(this.value)">
                            <div id="editPartyExists" class="error-message" style="display: none;">⚠️ This party already exists</div>
                            <div class="form-hint">Enter customer or supplier name</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editPartyType">Party Type *</label>
                            <select id="editPartyType" required onchange="toggleEditPartyFields()">
                                <option value="">Select Type</option>
                                <option value="customer" ${party.type === 'customer' ? 'selected' : ''}>Customer</option>
                                <option value="supplier" ${party.type === 'supplier' ? 'selected' : ''}>Supplier</option>
                                <option value="both" ${party.type === 'both' ? 'selected' : ''}>Both (Customer & Supplier)</option>
                            </select>
                            <div class="form-hint">Select the type of party</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editPartyPhone">Phone Number</label>
                            <input type="tel" id="editPartyPhone" 
                                   value="${escapeHtml(formattedPhone)}"
                                   placeholder="98765 43210"
                                   oninput="formatPhone(this)"
                                   onblur="validatePhoneInput(this)">
                            <div class="phone-error error-message" style="display: none;">
                                ⚠️ Please enter a valid 10-digit Indian mobile number starting with 6,7,8,9
                            </div>
                            <div class="form-hint">Optional 10-digit Indian mobile number</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editPartyEmail">Email Address</label>
                            <input type="email" id="editPartyEmail" 
                                   value="${escapeHtml(party.email || '')}"
                                   placeholder="party@example.com">
                            <div class="form-hint">Optional email address</div>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="editPartyAddress">Address</label>
                            <textarea id="editPartyAddress" rows="3" 
                                      placeholder="Enter complete address..."
                                      maxlength="200">${escapeHtml(party.address || '')}</textarea>
                            <div class="form-hint">Optional address details</div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="closeEditPartyPage()" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">
                            <span id="editPartySubmitText">💾 Update Party</span>
                            <div id="editPartyLoading" class="loading-spinner" style="display: none;"></div>
                        </button>
                    </div>
                </form>
            </div>
            
            <div class="danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <div class="danger-actions">
                    <button onclick="deletePartyFromEdit('${party.id}')" class="danger-btn">
                        🗑️ Delete Party
                    </button>
                    <p class="danger-warning">This action cannot be undone. All associated transactions will be affected.</p>
                </div>
            </div>
        </div>
    `;

    // ... rest of the function remains the same
    // Hide all current pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });

    // Create and append the edit page
    const editPageContainer = document.createElement('div');
    editPageContainer.innerHTML = editPageHTML;
    document.querySelector('main.content').appendChild(editPageContainer.firstElementChild);

    // Add form submission handler
    document.getElementById('editPartyForm').addEventListener('submit', handleEditPartySubmit);
    
    // Validate existing phone number on load
    const phoneInput = document.getElementById('editPartyPhone');
    if (phoneInput) {
        validatePhoneInput(phoneInput);
    }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function closeEditPartyPage() {
    const editPage = document.getElementById('editPartyPage');
    if (editPage) {
        editPage.remove();
    }
    editingPartyId = null;
    
    // Show the party management page
    Navigation.showPage('party-management');
}

function resetEditPartyForm() {
    const party = allParties.find(p => p.id === editingPartyId);
    if (party) {
        document.getElementById('editPartyName').value = party.name;
        document.getElementById('editPartyType').value = party.type;
        document.getElementById('editPartyPhone').value = party.phone || '';
        document.getElementById('editPartyEmail').value = party.email || '';
        document.getElementById('editPartyAddress').value = party.address || '';
        document.getElementById('editPartyExists').style.display = 'none';
    }
}

function toggleEditPartyFields() {
    // Additional field logic can be added here if needed
}

function checkEditPartyExists(partyName) {
    if (partyName.length < 2) return;
    
    const exists = allParties.some(party => 
        party.name.toLowerCase() === partyName.toLowerCase() && 
        party.id !== editingPartyId
    );
    
    document.getElementById('editPartyExists').style.display = exists ? 'block' : 'none';
}

async function handleEditPartySubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('editPartySubmitText').closest('button');
    Utils.showLoading(submitBtn);

    try {
        const phone = document.getElementById('editPartyPhone').value.trim();
        
        // Validate phone number
        const phoneValidation = getPhoneValidationMessage(phone);
        if (!phoneValidation.isValid) {
            Utils.showNotification(phoneValidation.message, 'warning');
            Utils.hideLoading(submitBtn);
            
            // Highlight the phone input
            const phoneInput = document.getElementById('editPartyPhone');
            phoneInput.style.borderColor = '#dc3545';
            phoneInput.focus();
            return;
        }

        const partyData = {
            name: document.getElementById('editPartyName').value.trim(),
            type: document.getElementById('editPartyType').value,
            phone: phone ? phone.replace(/\s/g, '') : null, // Remove spaces before storing
            email: document.getElementById('editPartyEmail').value.trim() || null,
            address: document.getElementById('editPartyAddress').value.trim() || null,
            updated_at: new Date().toISOString()
        };

        // Check if party already exists (excluding current party)
        const existingParty = allParties.find(party => 
            party.name.toLowerCase() === partyData.name.toLowerCase() && 
            party.id !== editingPartyId
        );

        if (existingParty) {
            Utils.showNotification('Another party with this name already exists', 'warning');
            Utils.hideLoading(submitBtn);
            return;
        }

        await SupabaseService.updateParty(editingPartyId, partyData);
        Utils.showNotification('Party updated successfully', 'success');
        
        closeEditPartyPage();
        
        // Refresh parties list
        await loadParties();
        
    } catch (error) {
        console.error('Error updating party:', error);
        Utils.showNotification('Error updating party', 'error');
    } finally {
        Utils.hideLoading(submitBtn);
    }
}

async function deletePartyFromEdit(partyId) {
    const party = allParties.find(p => p.id === partyId);
    if (!party) return;

    if (confirm(`Are you sure you want to delete "${party.name}"? This action cannot be undone and may affect existing invoices.`)) {
        try {
            await SupabaseService.deleteParty(partyId);
            Utils.showNotification('Party deleted successfully', 'success');
            closeEditPartyPage();
            await loadParties(); // Refresh the list
        } catch (error) {
            console.error('Error deleting party:', error);
            Utils.showNotification('Error deleting party', 'error');
        }
    }
}

async function deleteParty(partyId) {
    const party = allParties.find(p => p.id === partyId);
    if (!party) return;

    if (confirm(`Are you sure you want to delete ${party.name}? This action cannot be undone.`)) {
        try {
            await SupabaseService.deleteParty(partyId);
            await loadParties(); // Refresh the list
        } catch (error) {
            console.error('Error deleting party:', error);
        }
    }
}

function showPartyManagement() {
    Navigation.showPage('party-management');
}