// Purchases Screen logic matching PurchasesScreen.kt
let purchasesListenersAttached = false;
function initPurchasesScreen() {
    renderPurchasesList();
    if (!purchasesListenersAttached) {
        DataRepository.onChange('purchases', renderPurchasesList);
        DataRepository.onChange('farmers', renderPurchasesList);
        purchasesListenersAttached = true;
    }
}

function renderPurchasesList() {
    const listEl = document.getElementById('purchases-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    const purchases = DataRepository.purchases;
    
    if (purchases.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">local_shipping</span>
                <h4 class="empty-state-title">No purchases logged yet</h4>
                <p class="empty-state-subtitle">Tap + to log your first purchase</p>
            </div>
        `;
        return;
    }
    
    // Sort purchases by date desc and group by date
    const sorted = [...purchases].sort((a,b) => b.date.localeCompare(a.date));
    const grouped = {};
    sorted.forEach(p => {
        if (!grouped[p.date]) grouped[p.date] = [];
        grouped[p.date].push(p);
    });
    
    // Render grouped lists
    Object.keys(grouped).forEach(dateStr => {
        // Date Header
        const header = document.createElement('div');
        header.className = "date-separator-header";
        header.innerHTML = `
            <div class="date-separator-line"></div>
            <div class="date-separator-badge">${formatDisplayDate(dateStr)}</div>
            <div class="date-separator-line"></div>
        `;
        listEl.appendChild(header);
        
        // Purchase cards
        grouped[dateStr].forEach(purchase => {
            const card = document.createElement('div');
            card.className = "item-card";
            card.style.marginBottom = "8px";
            
            const noteRow = purchase.note ? `<div style="font-size: 12px; color: #888; margin-top: 6px;">Note: ${purchase.note}</div>` : '';
            
            card.innerHTML = `
                <div class="item-card-row">
                    <div class="item-card-meta">
                        <span class="item-card-title">${purchase.farmerName}</span>
                        <span class="item-card-subtitle" style="font-size: 12px;">
                            Date: ${formatDisplayDate(purchase.date)} - Vehicle: ${purchase.vehicleNo || 'N/A'}
                        </span>
                    </div>
                    <div class="item-card-actions">
                        <button class="btn-icon-small btn-share-purchase" title="Share Invoice">
                            <span class="material-icons-round" style="color: var(--primary)">share</span>
                        </button>
                        <button class="btn-icon-small btn-edit-purchase" title="Edit">
                            <span class="material-icons-round" style="color: var(--primary)">edit</span>
                        </button>
                        <button class="btn-icon-small btn-delete-purchase" title="Delete">
                            <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                        </button>
                    </div>
                </div>
                <div style="height: 1px; background-color: var(--surface-variant); margin: 8px 0;"></div>
                <div style="display:flex; justify-content:space-between; font-size:13px; line-height:20px;">
                    <div>
                        <div>Total Wt: ${purchase.totalWeight} kg</div>
                        <div>Empty Wt: ${purchase.emptyBoxWeight} kg</div>
                        <div style="font-weight:700;">Net Wt: ${purchase.netWeight} kg</div>
                    </div>
                    <div style="text-align:right;">
                        <div>Rate: ₹${purchase.rate}/kg</div>
                        <div style="font-weight:700;">Total: ₹${(purchase.totalAmount || 0).toFixed(2)}</div>
                        <div style="color: ${purchase.paidAmount > 0 ? 'var(--income-green)' : '#888'}; font-weight: 600;">
                            Paid: ₹${(purchase.paidAmount || 0).toFixed(2)} (${purchase.paymentMode})
                        </div>
                    </div>
                </div>
                ${noteRow}
            `;
            
            // Bind events
            card.querySelector('.btn-edit-purchase').addEventListener('click', () => openPurchaseForm(purchase));
            card.querySelector('.btn-delete-purchase').addEventListener('click', () => confirmDeletePurchase(purchase));
            card.querySelector('.btn-share-purchase').addEventListener('click', () => generatePurchaseInvoicePrintView(purchase));
            
            listEl.appendChild(card);
        });
    });
}

function openPurchaseForm(purchase = null) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = purchase ? "Edit Purchase Log" : "Log Farmer Purchase";
    
    // Build options for Farmers
    let farmerOptions = `<option value="">-- Select Farmer --</option>`;
    DataRepository.farmers.forEach(f => {
        farmerOptions += `<option value="${f.id}" ${purchase && purchase.farmerId === f.id ? 'selected' : ''}>${f.name}</option>`;
    });
    
    // Build options for Vehicles
    let vehicleOptions = `<option value="">-- Select Vehicle --</option>`;
    DataRepository.vehicles.forEach(v => {
        vehicleOptions += `<option value="${v.number}" ${purchase && purchase.vehicleNo === v.number ? 'selected' : ''}>${v.number} (${v.name})</option>`;
    });
    
    const today = getLocalISODate();
    
    body.innerHTML = `
        <form id="purchase-dialog-form">
            <div class="input-group">
                <label for="form-purchase-date">Date *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">event</span>
                    <input type="date" id="form-purchase-date" required value="${purchase ? purchase.date : today}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-purchase-farmer">Farmer *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">person</span>
                    <select id="form-purchase-farmer" required style="padding-left:42px;">
                        ${farmerOptions}
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label for="form-purchase-vehicle">Vehicle</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">directions_car</span>
                        <select id="form-purchase-vehicle" style="padding-left:42px;">
                            ${vehicleOptions}
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label for="form-purchase-vehicle-custom">Custom Vehicle No</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">edit</span>
                        <input type="text" id="form-purchase-vehicle-custom" placeholder="Optional" value="${purchase && !DataRepository.vehicles.some(v => v.number === purchase.vehicleNo) ? purchase.vehicleNo : ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label for="form-purchase-total-wt">Total Weight (kg) *</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">scale</span>
                        <input type="number" step="0.01" id="form-purchase-total-wt" placeholder="0.00" required value="${purchase ? purchase.totalWeight : ''}">
                    </div>
                </div>
                <div class="input-group">
                    <label for="form-purchase-empty-wt">Empty Box Weight (kg) *</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">scale</span>
                        <input type="number" step="0.01" id="form-purchase-empty-wt" placeholder="0.00" required value="${purchase ? purchase.emptyBoxWeight : ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label>Net Weight</label>
                    <div style="font-weight:700; font-size:16px; height: 45px; display:flex; align-items:center; padding-left:12px; background:var(--surface-variant); border-radius:var(--radius-md);" id="calc-purchase-net-wt">0.00 kg</div>
                </div>
                <div class="input-group">
                    <label for="form-purchase-rate">Rate (₹/kg) *</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">payments</span>
                        <input type="number" step="0.01" id="form-purchase-rate" placeholder="0.00" required value="${purchase ? purchase.rate : ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label>Total Amount</label>
                    <div style="font-weight:700; font-size:16px; height: 45px; display:flex; align-items:center; padding-left:12px; background:var(--surface-variant); border-radius:var(--radius-md); color:var(--owed-orange);" id="calc-purchase-total-amt">₹0.00</div>
                </div>
                <div class="input-group">
                    <label for="form-purchase-paid">Paid Amount (₹)</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">paid</span>
                        <input type="number" step="0.01" id="form-purchase-paid" placeholder="0.00" value="${purchase ? purchase.paidAmount : ''}">
                    </div>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-purchase-pay-mode">Payment Mode</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">credit_card</span>
                    <select id="form-purchase-pay-mode" style="padding-left:42px;">
                        <option value="Credit" ${purchase && purchase.paymentMode === 'Credit' ? 'selected' : ''}>Credit (Owe Farmer)</option>
                        <option value="Cash" ${purchase && purchase.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Bank" ${purchase && purchase.paymentMode === 'Bank' ? 'selected' : ''}>Bank</option>
                        <option value="UPI" ${purchase && purchase.paymentMode === 'UPI' ? 'selected' : ''}>UPI</option>
                        <option value="Cheque" ${purchase && purchase.paymentMode === 'Cheque' ? 'selected' : ''}>Cheque</option>
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-purchase-note">Note</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">notes</span>
                    <input type="text" id="form-purchase-note" placeholder="Optional notes" value="${purchase ? purchase.note : ''}">
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">Log Purchase</button>
        </form>
    `;
    
    // Form math elements
    const totalWeightInput = document.getElementById('form-purchase-total-wt');
    const emptyWeightInput = document.getElementById('form-purchase-empty-wt');
    const rateInput = document.getElementById('form-purchase-rate');
    const netWeightEl = document.getElementById('calc-purchase-net-wt');
    const totalAmountEl = document.getElementById('calc-purchase-total-amt');
    
    function recalcMath() {
        const totalWeight = parseFloat(totalWeightInput.value) || 0.0;
        const emptyWeight = parseFloat(emptyWeightInput.value) || 0.0;
        const rate = parseFloat(rateInput.value) || 0.0;
        
        const netWeight = Math.max(0.0, totalWeight - emptyWeight);
        const totalAmount = netWeight * rate;
        
        netWeightEl.textContent = `${netWeight.toFixed(2)} kg`;
        totalAmountEl.textContent = `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    totalWeightInput.addEventListener('input', recalcMath);
    emptyWeightInput.addEventListener('input', recalcMath);
    rateInput.addEventListener('input', recalcMath);
    
    // Trigger initial math
    recalcMath();
    
    const form = document.getElementById('purchase-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const farmerSelect = document.getElementById('form-purchase-farmer');
        const farmerId = farmerSelect.value;
        const farmerName = farmerSelect.options[farmerSelect.selectedIndex].text;
        
        const vehicleSelect = document.getElementById('form-purchase-vehicle');
        const customVehicle = document.getElementById('form-purchase-vehicle-custom').value.trim();
        const vehicleNo = customVehicle || vehicleSelect.value || null;
        
        const date = document.getElementById('form-purchase-date').value;
        const totalWeight = parseFloat(totalWeightInput.value) || 0.0;
        const emptyBoxWeight = parseFloat(emptyWeightInput.value) || 0.0;
        const rate = parseFloat(rateInput.value) || 0.0;
        const paidAmount = parseFloat(document.getElementById('form-purchase-paid').value) || 0.0;
        const paymentMode = document.getElementById('form-purchase-pay-mode').value;
        const note = document.getElementById('form-purchase-note').value.trim();
        
        const newPurchase = {
            farmerId,
            farmerName,
            date,
            vehicleNo,
            totalWeight,
            emptyBoxWeight,
            rate,
            paidAmount,
            paymentMode,
            note
        };
        
        try {
            if (purchase) {
                await DataRepository.updatePurchase(purchase, newPurchase);
            } else {
                await DataRepository.addPurchase(newPurchase);
            }
            closeModal();
        } catch (err) {
            alert(`Error logging purchase: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeletePurchase(purchase) {
    if (confirm(`Are you sure you want to delete this purchase entry for ${purchase.farmerName}?`)) {
        DataRepository.deletePurchase(purchase)
            .catch(err => alert(`Error deleting purchase log: ${err.message}`));
    }
}

function generatePurchaseInvoicePrintView(purchase) {
    const printViewEl = document.getElementById('print-view');
    const genDate = new Date();
    const formattedGenDate = `${String(genDate.getDate()).padStart(2, '0')}/${String(genDate.getMonth() + 1).padStart(2, '0')}/${genDate.getFullYear()} ${String(genDate.getHours()).padStart(2, '0')}:${String(genDate.getMinutes()).padStart(2, '0')}:${String(genDate.getSeconds()).padStart(2, '0')}`;
    
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
                    <h2>PURCHASE INVOICE</h2>
                    <p>${formatDisplayDate(purchase.date)}</p>
                </div>
            </div>
            
            <div style="margin: 0 40px;">
                <div class="pdf-card" style="width: 240px; margin-bottom: 20px;">
                    <div class="pdf-card-header">Invoice To</div>
                    <div class="pdf-card-body">
                        Name: ${purchase.farmerName}<br>
                        Vehicle No: ${purchase.vehicleNo || 'N/A'}
                    </div>
                </div>
            </div>
            
            <div class="pdf-section-title">Item Details</div>
            
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="align-right">Weight / Qty</th>
                        <th class="align-right">Rate</th>
                        <th class="align-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Gross Weight</td>
                        <td class="align-right">${purchase.totalWeight} kg</td>
                        <td class="align-right">-</td>
                        <td class="align-right">-</td>
                    </tr>
                    <tr>
                        <td>Empty Box Weight</td>
                        <td class="align-right">- ${purchase.emptyBoxWeight} kg</td>
                        <td class="align-right">-</td>
                        <td class="align-right">-</td>
                    </tr>
                    <tr class="pdf-totals-row">
                        <td>Net Chicken Weight</td>
                        <td class="align-right">${purchase.netWeight} kg</td>
                        <td class="align-right">₹${purchase.rate}/kg</td>
                        <td class="align-right">₹${purchase.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="pdf-summary-block">
                <div>Grand Total Amount: &nbsp; &nbsp; <strong style="color: #C62828;">₹${purchase.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                <div>Paid Amount (${purchase.paymentMode}): &nbsp; &nbsp; <strong style="color: #2E7D32;">₹${purchase.paidAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                <div>Outstanding Balance: &nbsp; &nbsp; <strong style="color: ${(purchase.totalAmount - purchase.paidAmount) > 0 ? '#C62828' : '#2E7D32'};">₹${(purchase.totalAmount - purchase.paidAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
            </div>
            
            ${purchase.note ? `<div style="margin: 0 40px; font-size: 10px; color: #37474F;">Note: ${purchase.note}</div>` : ''}
            
            <div class="pdf-footer">
                <div>Generated on: ${formattedGenDate}</div>
                <div>System Generated Electronic Report</div>
            </div>
        </div>
    `;
    window.print();
}

document.addEventListener('DOMContentLoaded', () => {
    const fabPurchases = document.getElementById('fab-add-purchase');
    if (fabPurchases) fabPurchases.addEventListener('click', () => openPurchaseForm());
});
