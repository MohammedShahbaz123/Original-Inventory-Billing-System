// =====================
// CORRECTED PARTIES MANAGEMENT
// =====================

// Global variables
window.allParties = [];
let currentEditingParty = null;

// Initialize parties management
function initializeParties() {
    console.log("🎯 Initializing parties management...");
    loadParties();
}

function showPartyManagement() {
    console.log("🎯 showPartyManagement() called");
    
    // Show the page first
    Navigation.showPage('party-management');
    console.log("✅ Party management page shown");
    // CORRECTED: Force reload parties to ensure fresh data
    loadParties();
}

// Load all parties
async function loadParties() {
    console.log("🎯 loadParties() called");
    
    try {
        UIUtils.showLoading();
        const result = await UniversalCORSHandler.callAPI('getParties');
        
        if (result.success && result.parties) {
            // CORRECTED: Completely replace the array, don't mutate
            window.allParties = [...result.parties];
            displayParties(window.allParties);
            UIUtils.showNotification('Parties loaded successfully', 'success');
            console.log("✅ Parties loaded:", window.allParties.length);
        } else {
            console.error("❌ No parties data in response:", result);
            window.allParties = [];
            displayParties([]);
            UIUtils.showNotification('No parties data received', 'warning');
        }
    } catch (error) {
        console.error("💥 Error loading parties:", error);
        UIUtils.showNotification('Error loading parties: ' + error.message, 'error');
        window.allParties = [];
        displayParties([]);
    } finally {
        UIUtils.hideLoading();
    }
}

// Display parties as cards
function displayParties(parties) {
    console.log("🎯 displayParties() called with", parties.length, "parties:", parties);
    
    const partiesContainer = document.getElementById('parties-list');
    if (!partiesContainer) {
        console.error("❌ parties-list element not found!");
        return;
    }
    
    console.log("✅ parties-list element found");
    
    if (!parties || parties.length === 0) {
        partiesContainer.innerHTML = `
            <div class="parties-empty-state">
                <div class="parties-empty-icon">👥</div>
                <h3>No Parties Found</h3>
                <p>Get started by adding your first customer or supplier</p>
                <button onclick="showAddPartyForm()" class="create-btn" style="margin-top: 20px;">
                    + Add Your First Party
                </button>
            </div>
        `;
        return;
    }
    
    // CORRECTED: Use proper array mapping with all data
    partiesContainer.innerHTML = parties.map((party) => {
        // CORRECTED: Ensure we're using the actual party object properties
        const partyName = party.name || '';
        const partyType = party.type || '';
        const partyPhone = party.phone || '';
        const partyEmail = party.email || '';
        const partyAddress = party.address || '';
        
        console.log("🎯 Rendering party:", { partyName, partyType, partyPhone, partyEmail, partyAddress });
        
        return `
        <div class="party-card" data-party-name="${Security.escapeHtml(partyName)}">
            <div class="party-header">
                <h3 class="party-name">${Security.escapeHtml(partyName)}</h3>
                <span class="party-type-badge ${partyType}">
                    ${getPartyTypeBadge(partyType)} 
                </span>
            </div>
            
            <div class="party-details">
                ${partyPhone ? `
                    <div class="party-detail">
                        <span class="party-detail-icon">📞</span>
                        <span>${Security.escapeHtml(partyPhone)}</span>
                    </div>
                ` : ''}
                
                ${partyEmail ? `
                    <div class="party-detail">
                        <span class="party-detail-icon">📧</span>
                        <span>${Security.escapeHtml(partyEmail)}</span>
                    </div>
                ` : ''}
                
                ${partyAddress ? `
                    <div class="party-address">
                        <span class="party-detail-icon">🏠</span>
                        <span>${Security.escapeHtml(partyAddress)}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="party-actions">
                <button class="party-action-btn party-edit-btn" 
                        onclick="editParty('${Security.escapeHtml(partyName)}')">
                    ✏️ Edit
                </button>
                <button class="party-action-btn party-delete-btn" 
                        onclick="deleteParty('${Security.escapeHtml(partyName)}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    console.log(`✅ Displayed ${parties.length} parties as cards`);
}

// Get party type badge
function getPartyTypeBadge(type) {
    const badges = {
        'customer': '👤 Customer',
        'supplier': '🏭 Supplier', 
        'both': '🤝 Both'
    };
    return badges[type] || '❓ Not Set'; // Show "Not Set" if type is empty
}

// Show add party form
function showAddPartyForm() {
    console.log("🎯 showAddPartyForm() called");
    currentEditingParty = null;
    resetPartyForm();
    Navigation.showPage('createParty');
    loadExistingPartiesList();
}

// Reset party form
function resetPartyForm() {
    console.log("🎯 resetPartyForm() called");
    
    document.getElementById('partyName').value = '';
    document.getElementById('partyType').value = ''; // EMPTY instead of default
    document.getElementById('partyPhone').value = '';
    document.getElementById('partyEmail').value = '';
    document.getElementById('partyAddress').value = '';
    
    document.getElementById('partyExists').style.display = 'none';
    document.getElementById('partySubmitText').textContent = '👥 Add Party';
    
    togglePartyFields();
}

// Toggle party fields based on type
function togglePartyFields() {
    const partyType = document.getElementById('partyType').value;
    console.log("🎯 togglePartyFields() - Party type:", partyType);
    
    // You can add specific field toggling logic here if needed
}

// Check if party already exists
function checkPartyExists(partyName) {
    if (!partyName || partyName.length < 2) {
        document.getElementById('partyExists').style.display = 'none';
        return;
    }
    
    const exists = allParties.some(party => 
        (party.name || party).toLowerCase() === partyName.toLowerCase()
    );
    
    const existsElement = document.getElementById('partyExists');
    if (exists) {
        existsElement.style.display = 'block';
        existsElement.textContent = '⚠️ This party already exists';
        existsElement.style.color = '#e74c3c';
    } else {
        existsElement.style.display = 'none';
    }
}

// Format phone number
function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 0) {
        if (value.length <= 3) {
            value = value;
        } else if (value.length <= 6) {
            value = value.slice(0, 3) + ' ' + value.slice(3);
        } else if (value.length <= 10) {
            value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
        } else {
            value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6, 10);
        }
    }
    
    input.value = value;
}

// Validate and add party - CORRECTED
async function validateAndAddParty() {
    console.log("🎯 validateAndAddParty() called");
    
    const partyName = document.getElementById('partyName').value.trim();
    const partyType = document.getElementById('partyType').value;
    const partyPhone = document.getElementById('partyPhone').value.trim();
    const partyEmail = document.getElementById('partyEmail').value.trim();
    const partyAddress = document.getElementById('partyAddress').value.trim();
    
    // VALIDATION - CORRECTED: Require type
    if (!partyName) {
        UIUtils.showNotification('Please enter party name', 'error');
        document.getElementById('partyName').focus();
        return;
    }
    
    if (!partyType) {
        UIUtils.showNotification('Please select party type', 'error');
        document.getElementById('partyType').focus();
        return;
    }
    
    if (partyEmail && !Validator.validateEmail(partyEmail)) {
        UIUtils.showNotification('Please enter a valid email address', 'error');
        document.getElementById('partyEmail').focus();
        return;
    }
    
    if (partyPhone && !Validator.validatePhone(partyPhone)) {
        UIUtils.showNotification('Please enter a valid phone number', 'error');
        document.getElementById('partyPhone').focus();
        return;
    }
    
    // Check if party already exists (for new parties)
    if (!currentEditingParty) {
        const exists = allParties.some(party => 
            (party.name || party).toLowerCase() === partyName.toLowerCase()
        );
        
        if (exists) {
            UIUtils.showNotification('Party with this name already exists', 'error');
            document.getElementById('partyName').focus();
            return;
        }
    }
    
    await saveParty(partyName, partyType, partyPhone, partyEmail, partyAddress);
}

// Save party to database - CORRECTED
async function saveParty(name, type, phone, email, address) {
    console.log("🎯 saveParty() called:", { name, type, phone, email, address });
    
    try {
        UIUtils.showLoading();
        
        const submitText = document.getElementById('partySubmitText');
        const loadingSpinner = document.getElementById('partyLoading');
        
        submitText.textContent = 'Saving...';
        loadingSpinner.style.display = 'inline-block';
        
        const partyData = {
            name: name,
            type: type,
            phone: phone || '',
            email: email || '',
            address: address || ''
        };
        
        console.log("🔄 Sending party data to API:", partyData);
        
        let result;
        if (currentEditingParty) {
            // Update existing party
            console.log("🔄 Updating party:", currentEditingParty, "to:", name);
            result = await UniversalCORSHandler.callAPI('updateParty', {
                oldName: currentEditingParty,
                newName: name,
                type: type,
                phone: phone || '',
                email: email || '',
                address: address || ''
            });
        } else {
            // Add new party
            console.log("➕ Adding new party");
            result = await UniversalCORSHandler.callAPI('addParty', partyData);
        }
        
        console.log("💾 API Response:", result);
        
        if (result.success) {
            const successMessage = currentEditingParty ? 
                `Party "${name}" updated successfully` : 
                `Party "${name}" added successfully`;
                
            UIUtils.showNotification(successMessage, 'success');
            console.log("✅ Party saved successfully");
            
            // CORRECTED: Force reload parties from server to get fresh data
            await loadParties(); // This will refresh the entire list
            
            // Go back to parties management page
            setTimeout(() => {
                Navigation.showPage('party-management');
                // CORRECTED: Ensure display is updated
                displayParties(window.allParties);
            }, 500);
            
        } else {
            console.error("❌ API returned error:", result.error);
            throw new Error(result.error || `Failed to ${currentEditingParty ? 'update' : 'add'} party`);
        }
        
    } catch (error) {
        console.error("💥 Error saving party:", error);
        UIUtils.showNotification('Error saving party: ' + error.message, 'error');
    } finally {
        UIUtils.hideLoading();
        
        const submitText = document.getElementById('partySubmitText');
        const loadingSpinner = document.getElementById('partyLoading');
        
        submitText.textContent = currentEditingParty ? 'Update Party' : 'Add Party';
        loadingSpinner.style.display = 'none';
    }
}

// Edit party - CORRECTED
async function editParty(partyName) {
    console.log("🎯 editParty() called:", partyName);
    
    try {
        UIUtils.showLoading();
        
        // Find the party in our local list
        const party = allParties.find(p => {
            const pName = p.name || p;
            return pName === partyName;
        });
        
        if (!party) {
            throw new Error(`Party "${partyName}" not found in local data`);
        }
        
        console.log("📝 Editing party data:", party);
        
        currentEditingParty = partyName;
        
        // Fill the form with ALL party data - CORRECTED: Don't default type
        document.getElementById('partyName').value = party.name || party;
        document.getElementById('partyType').value = party.type || ''; // EMPTY if no type
        document.getElementById('partyPhone').value = party.phone || '';
        document.getElementById('partyEmail').value = party.email || '';
        document.getElementById('partyAddress').value = party.address || '';
        
        document.getElementById('partySubmitText').textContent = 'Update Party';
        document.getElementById('partyExists').style.display = 'none';
        
        togglePartyFields();
        
        // Show the create party page
        Navigation.showPage('createParty');
        loadExistingPartiesList();
        
        UIUtils.showNotification('Editing party: ' + partyName, 'info');
        
    } catch (error) {
        console.error("💥 Error editing party:", error);
        UIUtils.showNotification('Error editing party: ' + error.message, 'error');
    } finally {
        UIUtils.hideLoading();
    }
}

// Delete party - CORRECTED with better error handling for CORS issues
async function deleteParty(partyName) {
    console.log("🎯 deleteParty() called with:", partyName);
    
    if (!partyName) {
        console.error("❌ Party name is undefined!");
        UIUtils.showNotification('Error: Party name is missing', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${partyName}"?\n\nThis action cannot be undone and will remove this party from all records.`)) {
        console.log("❌ Delete cancelled by user");
        return;
    }
    
    try {
        UIUtils.showLoading();
        
        console.log("🗑️ Deleting party:", partyName);
        
        const result = await UniversalCORSHandler.callAPI('deleteParty', { 
            name: partyName
        });
        
        console.log("✅ Delete party response:", result);
        
        if (result.success) {
            UIUtils.showNotification(`Party "${partyName}" deleted successfully`, 'success');
            
            // CORRECTED: Remove from local array immediately as fallback
            const partyIndex = window.allParties.findIndex(party => {
                const pName = typeof party === 'object' ? party.name : party;
                return pName === partyName;
            });
            
            if (partyIndex !== -1) {
                window.allParties.splice(partyIndex, 1);
                console.log("✅ Removed party from local array");
            }
            
            // Try to refresh from server, but if it fails, use local array
            try {
                await loadParties();
            } catch (refreshError) {
                console.warn("⚠️ Could not refresh from server, using local data:", refreshError);
                displayParties(window.allParties);
                UIUtils.showNotification('Deleted locally - refresh page to sync fully', 'info');
            }
            
        } else {
            throw new Error(result.error || 'Failed to delete party');
        }
        
    } catch (error) {
        console.error("💥 Error deleting party:", error);
        UIUtils.showNotification('Error deleting party: ' + error.message, 'error');
    } finally {
        UIUtils.hideLoading();
    }
}

// Load existing parties list for quick view
function loadExistingPartiesList() {
    console.log("🎯 loadExistingPartiesList() called");
    
    const existingPartiesList = document.getElementById('existingPartiesList');
    if (!existingPartiesList) {
        console.log("ℹ️ existingPartiesList element not found");
        return;
    }
    
    if (!allParties || allParties.length === 0) {
        existingPartiesList.innerHTML = `
            <div class="no-parties" style="text-align: center; padding: 20px; color: #7f8c8d;">
                No parties added yet
            </div>
        `;
        return;
    }
    
    // Show only top 5 parties for quick reference
    const displayParties = allParties.slice(0, 5);
    
    existingPartiesList.innerHTML = displayParties.map(party => `
        <div class="party-quick-item">
            <div class="party-quick-name">
                <strong>${Security.escapeHtml(party.name || party)}</strong>
                <span class="party-quick-type ${party.type || 'not-set'}">
                    ${getPartyTypeBadge(party.type || '')}
                </span>
            </div>
            ${party.phone ? `<div class="party-quick-detail">📞 ${Security.escapeHtml(party.phone)}</div>` : ''}
        </div>
    `).join('');
    
    if (allParties.length > 5) {
        existingPartiesList.innerHTML += `
            <div class="more-parties" style="text-align: center; padding: 10px; color: #3498db;">
                + ${allParties.length - 5} more parties...
            </div>
        `;
    }
}

// Filter parties based on search input
function filterParties() {
    const searchInput = document.getElementById('partiesSearch');
    if (!searchInput) {
        console.error("❌ partiesSearch element not found");
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    console.log("🎯 Filtering parties with search term:", searchTerm);
    
    if (!window.allParties || window.allParties.length === 0) {
        console.log("ℹ️ No parties to filter");
        return;
    }
    
    let filteredParties;
    
    if (searchTerm === '') {
        // Show all parties if search is empty
        filteredParties = window.allParties;
    } else {
        // Filter parties based on search term
        filteredParties = window.allParties.filter(party => {
            const partyName = (party.name || party).toLowerCase();
            const partyType = (party.type || '').toLowerCase();
            const partyPhone = (party.phone || '').toLowerCase();
            const partyEmail = (party.email || '').toLowerCase();
            const partyAddress = (party.address || '').toLowerCase();
            
            return partyName.includes(searchTerm) || 
                   partyType.includes(searchTerm) ||
                   partyPhone.includes(searchTerm) || 
                   partyEmail.includes(searchTerm) ||
                   partyAddress.includes(searchTerm);
        });
    }
    
    console.log(`🔍 Displaying ${filteredParties.length} filtered parties out of ${window.allParties.length} total`);
    displayParties(filteredParties);
}

// Clear search and show all parties
function clearPartySearch() {
    const searchInput = document.getElementById('partiesSearch');
    if (searchInput) {
        searchInput.value = '';
        filterParties(); // This will show all parties
    }
}

// Initialize search functionality
function initializePartySearch() {
    const searchInput = document.getElementById('partiesSearch');
    if (searchInput) {
        // Add event listener for real-time search
        searchInput.addEventListener('input', filterParties);
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Escape') {
                clearPartySearch();
            }
        });
        console.log("✅ Party search initialized");
    }
}

// Get parties for dropdowns (used in sales/purchases)
async function getPartiesForDropdown(partyType = null) {
    console.log("🎯 getPartiesForDropdown() called, type:", partyType);
    
    try {
        // If we already have parties loaded, use them
        if (allParties.length > 0) {
            let filteredParties = allParties;
            
            if (partyType === 'customer') {
                filteredParties = allParties.filter(party => 
                    party.type === 'customer' || party.type === 'both'
                );
            } else if (partyType === 'supplier') {
                filteredParties = allParties.filter(party => 
                    party.type === 'supplier' || party.type === 'both'
                );
            }
            
            return filteredParties.map(party => party.name || party);
        }
        
        // Otherwise fetch from API
        const result = await UniversalCORSHandler.callAPI('getParties');
        if (result.success && result.parties) {
            allParties = result.parties;
            
            let filteredParties = allParties;
            if (partyType === 'customer') {
                filteredParties = allParties.filter(party => 
                    party.type === 'customer' || party.type === 'both'
                );
            } else if (partyType === 'supplier') {
                filteredParties = allParties.filter(party => 
                    party.type === 'supplier' || party.type === 'both'
                );
            }
            
            return filteredParties.map(party => party.name || party);
        }
        
        return [];
        
    } catch (error) {
        console.error("💥 Error getting parties for dropdown:", error);
        return [];
    }
}

// Initialize parties when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Parties module loaded");
    
    // Initialize parties after a short delay to ensure other components are ready
    setTimeout(() => {
        initializeParties();
    }, 1000);
});
function debugPartiesState() {
    console.log("=== DEBUG PARTIES STATE ===");
    console.log("allParties array:", window.allParties);
    console.log("allParties length:", window.allParties.length);
    console.log("Current display:", document.getElementById('parties-list').innerHTML);
    console.log("=== END DEBUG ===");
}

// Call this from browser console to check state
window.debugParties = debugPartiesState;