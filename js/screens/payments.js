// Payments Screen logic matching PaymentsScreen.kt and SmsHelper.kt
let paymentsListenersAttached = false;
let activePaymentTab = "All"; // "All", "Farmers", "Shops"

function initPaymentsScreen() {
    setupPaymentTabs();
    renderPaymentsList();
    
    if (!paymentsListenersAttached) {
        DataRepository.onChange('payments', renderPaymentsList);
        DataRepository.onChange('farmers', renderPaymentsList);
        DataRepository.onChange('shops', renderPaymentsList);
        paymentsListenersAttached = true;
    }
}

function setupPaymentTabs() {
    const tabAll = document.getElementById('tab-payments-all');
    const tabFarmers = document.getElementById('tab-payments-farmers');
    const tabShops = document.getElementById('tab-payments-shops');
    
    if (!tabAll) return;
    
    const tabs = [tabAll, tabFarmers, tabShops];
    const clickHandler = (tab, key) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activePaymentTab = key;
        renderPaymentsList();
    };
    
    tabAll.onclick = () => clickHandler(tabAll, "All");
    tabFarmers.onclick = () => clickHandler(tabFarmers, "Farmers");
    tabShops.onclick = () => clickHandler(tabShops, "Shops");
}

function renderPaymentsList() {
    const listEl = document.getElementById('payments-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    let payments = DataRepository.payments;
    
    // Filter based on active tab
    if (activePaymentTab === "Farmers") {
        payments = payments.filter(p => p.partyType === "Farmer");
    } else if (activePaymentTab === "Shops") {
        payments = payments.filter(p => p.partyType === "Shop");
    }
    
    if (payments.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">account_balance_wallet</span>
                <h4 class="empty-state-title">No transactions logged</h4>
                <p class="empty-state-subtitle">Tap + to add a payout or receipt</p>
            </div>
        `;
        return;
    }
    
    // Group and sort by date
    const sorted = [...payments].sort((a,b) => b.date.localeCompare(a.date));
    const grouped = {};
    sorted.forEach(p => {
        if (!grouped[p.date]) grouped[p.date] = [];
        grouped[p.date].push(p);
    });
    
    Object.keys(grouped).forEach(dateStr => {
        const header = document.createElement('div');
        header.className = "date-separator-header";
        header.innerHTML = `
            <div class="date-separator-line"></div>
            <div class="date-separator-badge">${formatDisplayDate(dateStr)}</div>
            <div class="date-separator-line"></div>
        `;
        listEl.appendChild(header);
        
        grouped[dateStr].forEach(tx => {
            const card = document.createElement('div');
            card.className = "item-card";
            card.style.marginBottom = "8px";
            
            const isReceive = tx.type === "Receive";
            const typeColor = isReceive ? 'var(--income-green)' : 'var(--owed-orange)';
            const typeText = isReceive ? 'Receipt (Shop)' : 'Payout (Farmer)';
            
            const noteRow = tx.note ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">Note: ${tx.note}</div>` : '';
            
            card.innerHTML = `
                <div class="item-card-row">
                    <div class="item-card-meta">
                        <span class="item-card-title">${tx.partyName}</span>
                        <span class="item-card-subtitle" style="font-size: 12px; color: ${typeColor}; font-weight: 700;">
                            ${typeText} via ${tx.paymentMode}
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <span style="font-size: 16px; font-weight:700; color:${typeColor};">₹${(tx.amount || 0).toFixed(2)}</span>
                        ${tx.discount ? `<span style="font-size: 12px; font-weight:700; color:#e65100;">[Disc: ₹${tx.discount.toFixed(2)}]</span>` : ''}
                        <button class="btn-icon-small btn-share-receipt" title="Share Receipt">
                            <span class="material-icons-round" style="color: var(--primary)">share</span>
                        </button>
                        <button class="btn-icon-small btn-edit-payment" title="Edit">
                            <span class="material-icons-round" style="color: var(--primary)">edit</span>
                        </button>
                        <button class="btn-icon-small btn-delete-payment" title="Delete">
                            <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                        </button>
                    </div>
                </div>
                ${noteRow}
            `;
            
            // Bind events
            card.querySelector('.btn-edit-payment').addEventListener('click', () => openPaymentForm(tx));
            card.querySelector('.btn-delete-payment').addEventListener('click', () => confirmDeletePayment(tx));
            card.querySelector('.btn-share-receipt').addEventListener('click', () => sharePaymentReceipt(tx));
            
            listEl.appendChild(card);
        });
    });
}

function openPaymentForm(tx = null) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = tx ? "Edit Payment Transaction" : "Log Payout / Receipt";
    
    const today = getLocalISODate();
    const initialPartyType = tx ? tx.partyType : "Farmer";
    
    body.innerHTML = `
        <form id="payment-dialog-form">
            <div class="input-group">
                <label for="form-payment-date">Date *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">event</span>
                    <input type="date" id="form-payment-date" required value="${tx ? tx.date : today}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-payment-party-type">Party Type</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">people</span>
                    <select id="form-payment-party-type" style="padding-left:42px;">
                        <option value="Farmer" ${initialPartyType === 'Farmer' ? 'selected' : ''}>Farmer</option>
                        <option value="Shop" ${initialPartyType === 'Shop' ? 'selected' : ''}>Chicken Shop</option>
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-payment-party">Select Party *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">person</span>
                    <select id="form-payment-party" required style="padding-left:42px;">
                        <!-- Options populated dynamically -->
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-payment-type">Transaction Type *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">category</span>
                    <select id="form-payment-type" required style="padding-left:42px;">
                        <!-- Options populated dynamically based on party type -->
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-payment-amount">Amount (₹) *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">payments</span>
                    <input type="number" step="0.01" id="form-payment-amount" placeholder="0.00" required value="${tx ? tx.amount : ''}">
                </div>
            </div>

            <div class="input-group">
                <label for="form-payment-discount">Discount (₹) (optional)</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">discount</span>
                    <input type="number" step="0.01" id="form-payment-discount" placeholder="0.00" value="${tx && tx.discount ? tx.discount : ''}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-payment-mode">Payment Mode</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">credit_card</span>
                    <select id="form-payment-mode" style="padding-left:42px;">
                        <option value="Cash" ${tx && tx.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Bank" ${tx && tx.paymentMode === 'Bank' ? 'selected' : ''}>Bank</option>
                        <option value="UPI" ${tx && tx.paymentMode === 'UPI' ? 'selected' : ''}>UPI</option>
                        <option value="Cheque" ${tx && tx.paymentMode === 'Cheque' ? 'selected' : ''}>Cheque</option>
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-payment-note">Note</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">notes</span>
                    <input type="text" id="form-payment-note" placeholder="Optional notes" value="${tx ? tx.note : ''}">
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">Log Transaction</button>
        </form>
    `;
    
    const partyTypeSelect = document.getElementById('form-payment-party-type');
    const partySelect = document.getElementById('form-payment-party');
    const typeSelect = document.getElementById('form-payment-type');
    
    function updatePartyOptions() {
        const type = partyTypeSelect.value;
        partySelect.innerHTML = '';
        
        let list = type === "Farmer" ? DataRepository.farmers : DataRepository.shops;
        let options = `<option value="">-- Select Party --</option>`;
        
        list.forEach(item => {
            options += `<option value="${item.id}" ${tx && tx.partyId === item.id ? 'selected' : ''}>${item.name}</option>`;
        });
        partySelect.innerHTML = options;
        
        // Update transaction type drop-down
        typeSelect.innerHTML = '';
        if (type === "Farmer") {
            typeSelect.innerHTML = `
                <option value="Pay" ${tx && tx.type === 'Pay' ? 'selected' : ''}>Pay (We pay Farmer)</option>
                <option value="Receive" ${tx && tx.type === 'Receive' ? 'selected' : ''}>Receive (Refund from Farmer)</option>
            `;
        } else {
            typeSelect.innerHTML = `
                <option value="Receive" ${tx && tx.type === 'Receive' ? 'selected' : ''}>Receive (Shop pays us)</option>
                <option value="Pay" ${tx && tx.type === 'Pay' ? 'selected' : ''}>Pay (Refund/Credit to Shop)</option>
            `;
        }
    }
    
    partyTypeSelect.addEventListener('change', updatePartyOptions);
    updatePartyOptions(); // Initial load
    
    const form = document.getElementById('payment-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const date = document.getElementById('form-payment-date').value;
        const partyType = partyTypeSelect.value;
        const partyId = partySelect.value;
        const partyName = partySelect.options[partySelect.selectedIndex].text;
        const type = typeSelect.value;
        const amount = parseFloat(document.getElementById('form-payment-amount').value) || 0.0;
        const discount = parseFloat(document.getElementById('form-payment-discount').value) || 0.0;
        const paymentMode = document.getElementById('form-payment-mode').value;
        const note = document.getElementById('form-payment-note').value.trim();
        
        const newTx = {
            date,
            partyType,
            partyId,
            partyName,
            type,
            amount,
            discount,
            paymentMode,
            note
        };
        
        try {
            if (tx) {
                await DataRepository.updatePaymentTransaction(tx, newTx);
            } else {
                await DataRepository.addPaymentTransaction(newTx);
            }
            closeModal();
        } catch (err) {
            alert(`Error saving transaction: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeletePayment(tx) {
    if (confirm(`Are you sure you want to delete this payment transaction?`)) {
        DataRepository.deletePaymentTransaction(tx)
            .catch(err => alert(`Error deleting payment: ${err.message}`));
    }
}

// Replicates the Malayalam SMS receipt formatting from SmsHelper.kt
function sharePaymentReceipt(tx) {
    // 1. Find party current balance
    const party = tx.partyType === "Farmer" 
        ? DataRepository.farmers.find(f => f.id === tx.partyId)
        : DataRepository.shops.find(s => s.id === tx.partyId);
        
    const balance = party ? party.balance : 0.0;
    const formattedDate = formatDisplayDate(tx.date);
    
    // 2. Draft Malayalam invoice/receipt message
    let msg = `மலബാർ ചിക്കൻ:: ക്യാഷ് ലഭിച്ചത്/നൽകിയത് വിവരങ്ങൾ: \n`;
    if (tx.partyType === "Farmer") {
        msg += `ബില്ല് തീയതി: ${formattedDate}\n`;
        msg += `നൽകിയ തുക: ₹ ${tx.amount.toFixed(2)}/- (${tx.paymentMode})\n`;
        if (tx.discount > 0) msg += `ഡിസ്കൗണ്ട്: ₹ ${tx.discount.toFixed(2)}/-\n`;
        msg += `പുതിയ ബാലൻസ്: ₹ ${balance.toFixed(2)}`;
    } else {
        msg += `ബില്ല് തീയതി: ${formattedDate}\n`;
        msg += `ലഭിച്ച തുക: ₹ ${tx.amount.toFixed(2)}/- (${tx.paymentMode})\n`;
        if (tx.discount > 0) msg += `ഡിസ്കൗണ്ട്: ₹ ${tx.discount.toFixed(2)}/-\n`;
        msg += `പുതിയ ബാലൻസ്: ₹ ${balance.toFixed(2)}`;
    }
    
    // 3. Trigger sharing
    const phone = party ? party.phone : "";
    if (navigator.share) {
        navigator.share({
            title: 'Malabar Chicken ERP Receipt',
            text: msg
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback to WhatsApp Web
        const encodedText = encodeURIComponent(msg);
        const url = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedText}` : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(url, '_blank');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fabPayments = document.getElementById('fab-add-payment');
    if (fabPayments) fabPayments.addEventListener('click', () => openPaymentForm());
});
