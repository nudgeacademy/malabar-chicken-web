// Farmers Screen logic matching FarmersScreen.kt
let farmersListenersAttached = false;
function initFarmersScreen() {
    renderFarmersList();
    
    // Listen to database updates
    if (!farmersListenersAttached) {
        DataRepository.onChange('farmers', renderFarmersList);
        farmersListenersAttached = true;
    }
}

function renderFarmersList() {
    const listEl = document.getElementById('farmers-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    const farmers = DataRepository.farmers;
    
    // Update summary bar
    const summaryBar = document.getElementById('farmers-summary-bar');
    if (farmers.length > 0) {
        summaryBar.classList.remove('hidden');
        const totalOwe = farmers.filter(f => f.balance > 0).reduce((sum, f) => sum + f.balance, 0);
        
        document.getElementById('farmers-count-label').textContent = `${farmers.length} Farmers registered`;
        const payableEl = document.getElementById('farmers-total-payable');
        if (totalOwe > 0) {
            payableEl.textContent = `Total Payable: ₹${totalOwe.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            payableEl.classList.remove('hidden');
        } else {
            payableEl.classList.add('hidden');
        }
    } else {
        summaryBar.classList.add('hidden');
    }
    
    // Check if list is empty
    if (farmers.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">person</span>
                <h4 class="empty-state-title">No farmers added yet</h4>
                <p class="empty-state-subtitle">Tap + to add your first farmer</p>
            </div>
        `;
        return;
    }
    
    // Draw farmer cards
    farmers.forEach(farmer => {
        const card = document.createElement('div');
        card.className = "item-card";
        
        const balance = farmer.balance || 0.0;
        let balanceClass = "settled";
        let balanceText = "✓ Settled";
        if (balance > 0) {
            balanceClass = "owe";
            balanceText = `We Owe: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (balance < 0) {
            balanceClass = "receive";
            balanceText = `Owes Us: ₹${(-balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        const addressRow = farmer.address ? `
            <div class="item-card-detail-row">
                <span class="material-icons-round">location_on</span>
                <span>${farmer.address}</span>
            </div>
        ` : '';
        
        const callButton = farmer.phone ? `
            <a href="tel:${farmer.phone}" class="btn-icon-small" title="Call">
                <span class="material-icons-round" style="color: var(--primary)">phone</span>
            </a>
        ` : '';

        card.innerHTML = `
            <div class="item-card-row">
                <div class="item-card-left">
                    <div class="avatar-circle">${farmer.name.charAt(0)}</div>
                    <div class="item-card-meta">
                        <span class="item-card-title">${farmer.name}</span>
                        ${farmer.phone ? `<span class="item-card-subtitle">${farmer.phone}</span>` : ''}
                    </div>
                </div>
                <div class="item-card-actions">
                    ${callButton}
                    <button class="btn-icon-small btn-export-ledger" title="Export Ledger">
                        <span class="material-icons-round" style="color: var(--primary)">menu_book</span>
                    </button>
                    <button class="btn-icon-small btn-edit-farmer" title="Edit">
                        <span class="material-icons-round" style="color: var(--primary)">edit</span>
                    </button>
                    <button class="btn-icon-small btn-delete-farmer" title="Delete">
                        <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                    </button>
                </div>
            </div>
            ${addressRow}
            <div class="item-card-balance-badge ${balanceClass}">${balanceText}</div>
        `;
        
        // Bind events
        card.querySelector('.btn-edit-farmer').addEventListener('click', () => openFarmerForm(farmer));
        card.querySelector('.btn-delete-farmer').addEventListener('click', () => confirmDeleteFarmer(farmer));
        card.querySelector('.btn-export-ledger').addEventListener('click', () => openExportLedgerDialog(farmer, "Farmer"));
        
        listEl.appendChild(card);
    });
}

// Open Form Modal (Add / Edit)
function openFarmerForm(farmer = null) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = farmer ? "Edit Farmer" : "Add New Farmer";
    
    body.innerHTML = `
        <form id="farmer-dialog-form">
            <div class="input-group">
                <label for="form-farmer-name">Farmer Name *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">person</span>
                    <input type="text" id="form-farmer-name" placeholder="Farmer Name" required value="${farmer ? farmer.name : ''}">
                </div>
            </div>
            <div class="input-group">
                <label for="form-farmer-phone">Phone Number</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">phone</span>
                    <input type="tel" id="form-farmer-phone" placeholder="Phone Number" value="${farmer ? farmer.phone : ''}">
                </div>
            </div>
            <div class="input-group">
                <label for="form-farmer-address">Village / Address</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">location_on</span>
                    <input type="text" id="form-farmer-address" placeholder="Village / Address" value="${farmer ? farmer.address : ''}">
                </div>
            </div>
            <div class="input-group">
                <label for="form-farmer-balance">Opening Balance (₹)</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">menu_book</span>
                    <input type="number" step="0.01" id="form-farmer-balance" placeholder="0.00" value="${farmer ? (farmer.openingBalance || farmer.balance || 0.0) : ''}">
                </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Farmer</button>
        </form>
    `;
    
    const form = document.getElementById('farmer-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('form-farmer-name').value.trim();
        const phone = document.getElementById('form-farmer-phone').value.trim();
        const address = document.getElementById('form-farmer-address').value.trim();
        const balance = parseFloat(document.getElementById('form-farmer-balance').value) || 0.0;
        
        try {
            if (farmer) {
                // Update operation
                await DataRepository.updateFarmer(farmer.id, name, phone, address, balance);
            } else {
                // Add operation
                await DataRepository.addFarmer({
                    name: name,
                    phone: phone,
                    address: address,
                    balance: balance,
                    openingBalance: balance
                });
            }
            closeModal();
        } catch (err) {
            alert(`Error saving farmer: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeleteFarmer(farmer) {
    if (confirm(`Are you sure you want to delete farmer ${farmer.name}? This will remove them from the database.`)) {
        DataRepository.deleteFarmer(farmer.id)
            .catch(err => alert(`Error deleting farmer: ${err.message}`));
    }
}

// Shared Ledger Export Date Dialog (Farmers & Shops)
function openExportLedgerDialog(party, partyType) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = "Share Ledger";
    
    body.innerHTML = `
        <div style="font-size:15px; color:var(--on-surface); opacity:0.8; margin-bottom:12px;">Which records do you want to share?</div>
        <div class="input-group">
            <label>Select Option</label>
            <div class="input-wrapper">
                <span class="material-icons-round input-icon">list</span>
                <select id="export-option-select" style="padding-left: 42px;">
                    <option value="all">All Records (Full History)</option>
                    <option value="month">This Month</option>
                    <option value="custom">Choose Dates</option>
                </select>
            </div>
        </div>
        <div id="export-custom-dates" class="form-row hidden">
            <div class="input-group">
                <label for="export-start-date">Start Date</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">event</span>
                    <input type="date" id="export-start-date" style="padding-left: 42px;">
                </div>
            </div>
            <div class="input-group">
                <label for="export-end-date">End Date</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">event</span>
                    <input type="date" id="export-end-date" style="padding-left: 42px;">
                </div>
            </div>
        </div>
        <button id="btn-submit-export" class="btn btn-primary btn-block" style="margin-top: 12px;">
            <span class="material-icons-round">share</span> Share Now
        </button>
    `;
    
    const select = document.getElementById('export-option-select');
    const customRow = document.getElementById('export-custom-dates');
    
    select.addEventListener('change', () => {
        if (select.value === 'custom') {
            customRow.classList.remove('hidden');
        } else {
            customRow.classList.add('hidden');
        }
    });
    
    document.getElementById('btn-submit-export').addEventListener('click', () => {
        let start = null;
        let end = null;
        
        if (select.value === 'month') {
            const today = new Date();
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        } else if (select.value === 'custom') {
            const startVal = document.getElementById('export-start-date').value;
            const endVal = document.getElementById('export-end-date').value;
            if (startVal) start = new Date(startVal + 'T00:00:00');
            if (endVal) end = new Date(endVal + 'T23:59:59');
        }
        
        generateLedgerPrintView(party, partyType, start, end);
        closeModal();
    });
    
    openModal();
}

function generateLedgerPrintView(party, partyType, startDate, endDate) {
    const printViewEl = document.getElementById('print-view');
    printViewEl.innerHTML = '';

    // 1. Gather transactions (discrete Type/Weight/Rate columns, matches PdfHelper.kt's CombinedLedgerEntry)
    let txs = [];
    if (partyType === "Farmer") {
        const purchases = DataRepository.getPurchasesForFarmer(party.id);
        const payments = DataRepository.getPaymentTransactionsForParty(party.id);

        purchases.forEach(p => {
            const modeStr = (p.paymentMode && p.paymentMode !== 'Credit') ? ` (${p.paymentMode})` : '';
            txs.push({
                date: p.date,
                type: `Purchase${modeStr}`,
                weight: p.netWeight || 0,
                weightStr: `${(p.netWeight || 0).toFixed(2)} kg`,
                rateStr: `₹${(p.rate || 0).toFixed(2)}`,
                amount: p.totalAmount || 0,
                paid: p.paidAmount || 0,
                discount: 0,
                isCredit: true, // increases balance (we owe farmer more)
                dateObj: new Date(p.date + 'T00:00:00')
            });
        });

        payments.forEach(pay => {
            const modeStr = pay.paymentMode ? ` (${pay.paymentMode})` : '';
            const discStr = pay.discount ? ` [+₹${pay.discount.toFixed(2)} Disc]` : '';
            txs.push({
                date: pay.date,
                type: `${pay.type === 'Pay' ? 'Paid' : pay.type}${modeStr}${discStr}`,
                weight: 0,
                weightStr: '-',
                rateStr: '-',
                amount: pay.amount || 0,
                paid: 0,
                discount: pay.discount || 0,
                isCredit: false, // decreases balance
                dateObj: new Date(pay.date + 'T00:00:00')
            });
        });
    } else {
        const sales = DataRepository.getSalesForShop(party.id);
        const payments = DataRepository.getPaymentTransactionsForParty(party.id);

        sales.forEach(s => {
            const modeStr = (s.paymentMode && s.paymentMode !== 'Credit') ? ` (${s.paymentMode})` : '';
            txs.push({
                date: s.date,
                type: `Sale${modeStr}`,
                weight: s.netWeight || 0,
                weightStr: `${(s.netWeight || 0).toFixed(2)} kg`,
                rateStr: `₹${(s.rate || 0).toFixed(2)}`,
                amount: s.totalAmount || 0,
                paid: s.paidAmount || 0,
                discount: 0,
                isCredit: true, // increases balance (shop owes us more)
                dateObj: new Date(s.date + 'T00:00:00')
            });
        });

        payments.forEach(pay => {
            const modeStr = pay.paymentMode ? ` (${pay.paymentMode})` : '';
            const discStr = pay.discount ? ` [+₹${pay.discount.toFixed(2)} Disc]` : '';
            txs.push({
                date: pay.date,
                type: `${pay.type === 'Receive' ? 'Received' : pay.type}${modeStr}${discStr}`,
                weight: 0,
                weightStr: '-',
                rateStr: '-',
                amount: pay.amount || 0,
                paid: 0,
                discount: pay.discount || 0,
                isCredit: false, // decreases balance
                dateObj: new Date(pay.date + 'T00:00:00')
            });
        });
    }

    // Sort transactions ascending for ledger format
    txs.sort((a,b) => a.dateObj - b.dateObj);

    // Filter by date range if applicable
    let filteredTxs = txs;
    let oldBalance = party.openingBalance || 0;

    if (startDate || endDate) {
        filteredTxs = txs.filter(t => {
            if (startDate && t.dateObj < startDate) {
                // Calculate old cumulative balance before date range
                oldBalance += t.isCredit ? (t.amount - t.paid) : -(t.amount + t.discount);
                return false;
            }
            if (endDate && t.dateObj > endDate) return false;
            return true;
        });
    }

    const genDate = new Date();
    const formattedGenDate = `${String(genDate.getDate()).padStart(2, '0')}/${String(genDate.getMonth() + 1).padStart(2, '0')}/${genDate.getFullYear()} ${String(genDate.getHours()).padStart(2, '0')}:${String(genDate.getMinutes()).padStart(2, '0')}:${String(genDate.getSeconds()).padStart(2, '0')}`;

    let periodStr = "All Time";
    if (startDate && endDate) periodStr = `${formatDisplayDate(getLocalISODate(startDate))} to ${formatDisplayDate(getLocalISODate(endDate))}`;
    else if (startDate) periodStr = `From ${formatDisplayDate(getLocalISODate(startDate))}`;
    else if (endDate) periodStr = `Until ${formatDisplayDate(getLocalISODate(endDate))}`;

    // Totals over the filtered (displayed) period — matches PdfHelper.kt's totalWt/totalAmt/cashPaid
    let totalWt = 0, totalAmt = 0, cashPaid = 0;
    filteredTxs.forEach(t => {
        if (t.isCredit) {
            totalWt += t.weight;
            totalAmt += t.amount;
        } else {
            cashPaid += (t.amount + t.discount);
        }
    });

    let runningBalance = oldBalance;
    let tableRows = `
        <tr>
            <td>-</td>
            <td><strong>Opening Balance</strong></td>
            <td class="align-right">-</td>
            <td class="align-right">-</td>
            <td class="align-right">-</td>
            <td class="align-right"><strong>₹${oldBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
        </tr>
    `;

    filteredTxs.forEach(t => {
        runningBalance += t.isCredit ? (t.amount - t.paid) : -(t.amount + t.discount);
        const amtColor = t.isCredit ? '#C62828' : '#2E7D32';
        const sign = t.isCredit ? '+' : '-';

        tableRows += `
            <tr>
                <td>${formatDisplayDate(t.date)}</td>
                <td>${t.type}</td>
                <td class="align-right">${t.weightStr}</td>
                <td class="align-right">${t.rateStr}</td>
                <td class="align-right" style="color:${amtColor};">${sign}₹${t.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="align-right"><strong>₹${runningBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            </tr>
        `;
    });

    // TOTALS row (matches PdfHelper.kt's final closing-balance row)
    tableRows += `
        <tr class="pdf-totals-row">
            <td>TOTALS</td>
            <td></td>
            <td class="align-right">${totalWt.toFixed(2)} kg</td>
            <td></td>
            <td class="align-right">Net: ₹${(totalAmt - cashPaid).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="align-right" style="color:${runningBalance > 0 ? '#C62828' : '#2E7D32'};"><strong>₹${runningBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
        </tr>
    `;

    printViewEl.innerHTML = `
        <div class="print-container">
            <div class="pdf-header">
                <div class="pdf-header-left">
                    <div style="width:60px; height:60px; background-color:#ffffff; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#044014; font-weight:bold; font-size:9px; text-align:center;">MALABAR<br>CHICKEN</div>
                    <div>
                        <h1>MALABAR CHICKEN</h1>
                        <p>Agencies Pandikkad, Vettikattiri, Velluvangad (P.o) 676521<br>Phone: +91 999 5005 878 | GSTIN: Not Provided</p>
                    </div>
                </div>
                <div class="pdf-header-right">
                    <h2>ACCOUNT LEDGER</h2>
                    <p>Period: ${periodStr}</p>
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin: 0 40px 20px 40px; gap: 20px;">
                <div class="pdf-card" style="flex:1;">
                    <div class="pdf-card-header">Party Account Info</div>
                    <div class="pdf-card-body">
                        Name: ${party.name}<br>
                        Type: ${partyType}<br>
                        Phone: ${party.phone || 'N/A'}<br>
                        Address: ${party.address || 'N/A'}
                    </div>
                </div>
                <div class="pdf-card" style="flex:1;">
                    <div class="pdf-card-header">Account Balance</div>
                    <div class="pdf-card-body" style="text-align: right;">
                        <span style="font-size:10px; color:#777; text-transform:uppercase;">Outstanding Balance (as of ${periodStr})</span><br>
                        <strong style="font-size: 20px; color: ${runningBalance > 0 ? (partyType === 'Farmer' ? '#C62828' : '#2E7D32') : (partyType === 'Farmer' ? '#2E7D32' : '#C62828')};">
                            ₹${Math.abs(runningBalance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </strong><br>
                        <span style="font-size:11px; color:#111;">${runningBalance > 0 ? (partyType === 'Farmer' ? 'We Owe' : 'Owes Us') : (partyType === 'Farmer' ? 'Advance Paid' : 'Advance Received')}</span>
                    </div>
                </div>
            </div>

            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th class="align-right">Weight</th>
                        <th class="align-right">Rate</th>
                        <th class="align-right">Amount</th>
                        <th class="align-right">Balance</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            
            <div class="pdf-footer">
                <div>Generated on: ${formattedGenDate}</div>
                <div>System Generated Electronic Report</div>
            </div>
        </div>
    `;
    
    // Trigger Print View
    window.print();
}

// Modal helper controls
function openModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    // Force layout reflow
    overlay.offsetWidth;
    overlay.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 250);
}

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('btn-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    
    const fabFarmers = document.getElementById('fab-add-farmer');
    if (fabFarmers) fabFarmers.addEventListener('click', () => openFarmerForm());
});
