// Staff Management Screen logic matching ManageStaffScreen.kt
let staffListenersAttached = false;
function initManageStaffScreen() {
    renderStaffList();
    if (!staffListenersAttached) {
        DataRepository.onChange('staff', renderStaffList);
        staffListenersAttached = true;
    }
}

function renderStaffList() {
    const listEl = document.getElementById('staff-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    const staff = DataRepository.staff;
    
    if (staff.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">people</span>
                <h4 class="empty-state-title">No staff members logged</h4>
                <p class="empty-state-subtitle">Tap + to add a staff console credential</p>
            </div>
        `;
        return;
    }
    
    staff.forEach(user => {
        const card = document.createElement('div');
        card.className = "item-card";
        card.style.marginBottom = "8px";
        
        let perms = [];
        if (user.canViewFarmers) perms.push("Farmers");
        if (user.canViewShops) perms.push("Shops");
        if (user.canViewPurchases) perms.push("Purchases");
        if (user.canViewSales) perms.push("Sales");
        if (user.canViewExpenses) perms.push("Expenses");
        if (user.canViewPayments) perms.push("Payments");
        
        const permsLabel = perms.length > 0 ? perms.join(', ') : "None";
        
        card.innerHTML = `
            <div class="item-card-row">
                <div class="item-card-left">
                    <div class="avatar-circle"><span class="material-icons-round">badge</span></div>
                    <div class="item-card-meta">
                        <span class="item-card-title">${user.username} (${user.role})</span>
                        <span class="item-card-subtitle" style="font-size:11px;">Permissions: ${permsLabel}</span>
                    </div>
                </div>
                <div class="item-card-actions">
                    <button class="btn-icon-small btn-edit-staff" title="Edit">
                        <span class="material-icons-round" style="color: var(--primary)">edit</span>
                    </button>
                    <button class="btn-icon-small btn-delete-staff" title="Delete">
                        <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                    </button>
                </div>
            </div>
        `;
        
        card.querySelector('.btn-edit-staff').addEventListener('click', () => openStaffForm(user));
        card.querySelector('.btn-delete-staff').addEventListener('click', () => confirmDeleteStaff(user));
        
        listEl.appendChild(card);
    });
}

function openStaffForm(user = null) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = user ? "Edit Staff User" : "Add New Staff console credential";
    
    body.innerHTML = `
        <form id="staff-dialog-form">
            <div class="input-group">
                <label for="form-staff-username">Username *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">person</span>
                    <input type="text" id="form-staff-username" placeholder="Username" required value="${user ? user.username : ''}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-staff-password">Password *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">lock</span>
                    <input type="text" id="form-staff-password" placeholder="Password" required value="${user ? user.password : ''}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-staff-role">Access Role</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">admin_panel_settings</span>
                    <select id="form-staff-role" style="padding-left:42px;">
                        <option value="STAFF" ${user && user.role === 'STAFF' ? 'selected' : ''}>STAFF (Restricted access)</option>
                        <option value="ADMIN" ${user && user.role === 'ADMIN' ? 'selected' : ''}>ADMIN (Full system access)</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-top: 8px; border-top: 1px solid var(--surface-variant); padding-top: 12px;">
                <h4 style="font-size:13px; font-weight:700; margin-bottom:8px; opacity:0.8;">CONSOLE PERMISSIONS</h4>
                
                <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
                    <label style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="perm-farmers" ${!user || user.canViewFarmers ? 'checked' : ''}>
                        Can view Farmers accounts
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="perm-shops" ${!user || user.canViewShops ? 'checked' : ''}>
                        Can view Chicken Shops accounts
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="perm-purchases" ${!user || user.canViewPurchases ? 'checked' : ''}>
                        Can view Purchases
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="perm-sales" ${!user || user.canViewSales ? 'checked' : ''}>
                        Can view Sales logs
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="perm-expenses" ${!user || user.canViewExpenses ? 'checked' : ''}>
                        Can view Operating Expenses
                    </label>
                    <label style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="perm-payments" ${!user || user.canViewPayments ? 'checked' : ''}>
                        Can log Receipts & Payouts
                    </label>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:14px;">Save Staff Console</button>
        </form>
    `;
    
    const form = document.getElementById('staff-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('form-staff-username').value.trim();
        const password = document.getElementById('form-staff-password').value.trim();
        const role = document.getElementById('form-staff-role').value;
        
        const canViewFarmers = document.getElementById('perm-farmers').checked;
        const canViewShops = document.getElementById('perm-shops').checked;
        const canViewPurchases = document.getElementById('perm-purchases').checked;
        const canViewSales = document.getElementById('perm-sales').checked;
        const canViewExpenses = document.getElementById('perm-expenses').checked;
        const canViewPayments = document.getElementById('perm-payments').checked;
        
        const staffData = {
            username,
            password,
            role,
            canViewFarmers,
            canViewShops,
            canViewPurchases,
            canViewSales,
            canViewExpenses,
            canViewPayments
        };
        
        try {
            if (user) {
                await DataRepository.updateStaffUser({ id: user.id, ...staffData });
            } else {
                await DataRepository.addStaffUser(staffData);
            }
            closeModal();
        } catch (err) {
            alert(`Error saving credentials: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeleteStaff(user) {
    if (confirm(`Are you sure you want to delete staff user ${user.username}?`)) {
        DataRepository.deleteStaffUser(user.id)
            .catch(err => alert(`Error deleting credentials: ${err.message}`));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fabStaff = document.getElementById('fab-add-staff');
    if (fabStaff) fabStaff.addEventListener('click', () => openStaffForm());
});
