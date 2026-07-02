// Shops Screen logic matching ShopsScreen.kt
let shopsListenersAttached = false;
function initShopsScreen() {
    renderShopsList();
    
    // Listen to database updates
    if (!shopsListenersAttached) {
        DataRepository.onChange('shops', renderShopsList);
        shopsListenersAttached = true;
    }
}

function renderShopsList() {
    const listEl = document.getElementById('shops-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    const shops = DataRepository.shops;
    
    // Update summary bar
    const summaryBar = document.getElementById('shops-summary-bar');
    if (shops.length > 0) {
        summaryBar.classList.remove('hidden');
        const totalReceive = shops.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
        
        document.getElementById('shops-count-label').textContent = `${shops.length} Shops registered`;
        const receivableEl = document.getElementById('shops-total-receivable');
        if (totalReceive > 0) {
            receivableEl.textContent = `Total Receivable: ₹${totalReceive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            receivableEl.classList.remove('hidden');
        } else {
            receivableEl.classList.add('hidden');
        }
    } else {
        summaryBar.classList.add('hidden');
    }
    
    // Check if list is empty
    if (shops.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">shopping_cart</span>
                <h4 class="empty-state-title">No shops added yet</h4>
                <p class="empty-state-subtitle">Tap + to add your first shop</p>
            </div>
        `;
        return;
    }
    
    // Draw shop cards
    shops.forEach(shop => {
        const card = document.createElement('div');
        card.className = "item-card";
        
        const balance = shop.balance || 0.0;
        let balanceClass = "settled";
        let balanceText = "✓ Settled";
        if (balance > 0) {
            balanceClass = "receive";
            balanceText = `Owes Us: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (balance < 0) {
            balanceClass = "owe";
            balanceText = `We Owe: ₹${(-balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        const addressRow = shop.address ? `
            <div class="item-card-detail-row">
                <span class="material-icons-round">location_on</span>
                <span>${shop.address}</span>
            </div>
        ` : '';
        
        const callButton = shop.phone ? `
            <a href="tel:${shop.phone}" class="btn-icon-small" title="Call">
                <span class="material-icons-round" style="color: var(--primary)">phone</span>
            </a>
        ` : '';

        card.innerHTML = `
            <div class="item-card-row">
                <div class="item-card-left">
                    <div class="avatar-circle">${shop.name.charAt(0)}</div>
                    <div class="item-card-meta">
                        <span class="item-card-title">${shop.name}</span>
                        ${shop.phone ? `<span class="item-card-subtitle">${shop.phone}</span>` : ''}
                    </div>
                </div>
                <div class="item-card-actions">
                    ${callButton}
                    <button class="btn-icon-small btn-export-shop-ledger" title="Export Ledger">
                        <span class="material-icons-round" style="color: var(--primary)">menu_book</span>
                    </button>
                    <button class="btn-icon-small btn-edit-shop" title="Edit">
                        <span class="material-icons-round" style="color: var(--primary)">edit</span>
                    </button>
                    <button class="btn-icon-small btn-delete-shop" title="Delete">
                        <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                    </button>
                </div>
            </div>
            ${addressRow}
            <div class="item-card-balance-badge ${balanceClass}">${balanceText}</div>
        `;
        
        // Bind events
        card.querySelector('.btn-edit-shop').addEventListener('click', () => openShopForm(shop));
        card.querySelector('.btn-delete-shop').addEventListener('click', () => confirmDeleteShop(shop));
        card.querySelector('.btn-export-shop-ledger').addEventListener('click', () => openExportLedgerDialog(shop, "Shop"));
        
        listEl.appendChild(card);
    });
}

// Open Form Modal (Add / Edit)
function openShopForm(shop = null) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = shop ? "Edit Chicken Shop" : "Add New Shop";
    
    body.innerHTML = `
        <form id="shop-dialog-form">
            <div class="input-group">
                <label for="form-shop-name">Shop Name *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">shopping_cart</span>
                    <input type="text" id="form-shop-name" placeholder="Shop Name" required value="${shop ? shop.name : ''}">
                </div>
            </div>
            <div class="input-group">
                <label for="form-shop-phone">Phone Number</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">phone</span>
                    <input type="tel" id="form-shop-phone" placeholder="Phone Number" value="${shop ? shop.phone : ''}">
                </div>
            </div>
            <div class="input-group">
                <label for="form-shop-address">Address</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">location_on</span>
                    <input type="text" id="form-shop-address" placeholder="Address" value="${shop ? shop.address : ''}">
                </div>
            </div>
            <div class="input-group">
                <label for="form-shop-balance">Opening Balance (₹)</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">menu_book</span>
                    <input type="number" step="0.01" id="form-shop-balance" placeholder="0.00" value="${shop ? (shop.openingBalance || shop.balance || 0.0) : ''}">
                </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Shop</button>
        </form>
    `;
    
    const form = document.getElementById('shop-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('form-shop-name').value.trim();
        const phone = document.getElementById('form-shop-phone').value.trim();
        const address = document.getElementById('form-shop-address').value.trim();
        const balance = parseFloat(document.getElementById('form-shop-balance').value) || 0.0;
        
        try {
            if (shop) {
                await DataRepository.updateShop(shop.id, name, phone, address, balance);
            } else {
                await DataRepository.addShop({
                    name: name,
                    phone: phone,
                    address: address,
                    balance: balance,
                    openingBalance: balance
                });
            }
            closeModal();
        } catch (err) {
            alert(`Error saving shop: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeleteShop(shop) {
    if (confirm(`Are you sure you want to delete shop ${shop.name}? This will remove them from the database.`)) {
        DataRepository.deleteShop(shop.id)
            .catch(err => alert(`Error deleting shop: ${err.message}`));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fabShops = document.getElementById('fab-add-shop');
    if (fabShops) fabShops.addEventListener('click', () => openShopForm());
});
