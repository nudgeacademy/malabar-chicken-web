// Sales Screen logic matching SalesScreen.kt
let salesListenersAttached = false;
function initSalesScreen() {
    renderSalesList();
    if (!salesListenersAttached) {
        DataRepository.onChange('sales', renderSalesList);
        DataRepository.onChange('shops', renderSalesList);
        salesListenersAttached = true;
    }
}

function renderSalesList() {
    const listEl = document.getElementById('sales-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    const sales = DataRepository.sales;
    
    if (sales.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">shopping_cart</span>
                <h4 class="empty-state-title">No sales logged yet</h4>
                <p class="empty-state-subtitle">Tap + to log your first sale</p>
            </div>
        `;
        return;
    }
    
    // Sort sales by date desc and group by date
    const sorted = [...sales].sort((a,b) => b.date.localeCompare(a.date));
    const grouped = {};
    sorted.forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = [];
        grouped[s.date].push(s);
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
        
        // Sales cards
        grouped[dateStr].forEach(sale => {
            const card = document.createElement('div');
            card.className = "item-card";
            card.style.marginBottom = "8px";
            
            const noteRow = sale.note ? `<div style="font-size: 12px; color: #888; margin-top: 6px;">Note: ${sale.note}</div>` : '';
            
            card.innerHTML = `
                <div class="item-card-row">
                    <div class="item-card-meta">
                        <span class="item-card-title">${sale.shopName}</span>
                        <span class="item-card-subtitle" style="font-size: 12px;">
                            Date: ${formatDisplayDate(sale.date)} - Vehicle: ${sale.vehicleNo || 'N/A'}
                        </span>
                    </div>
                    <div class="item-card-actions">
                        <button class="btn-icon-small btn-share-sale" title="Share Invoice">
                            <span class="material-icons-round" style="color: var(--primary)">share</span>
                        </button>
                        <button class="btn-icon-small btn-edit-sale" title="Edit">
                            <span class="material-icons-round" style="color: var(--primary)">edit</span>
                        </button>
                        <button class="btn-icon-small btn-delete-sale" title="Delete">
                            <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                        </button>
                    </div>
                </div>
                <div style="height: 1px; background-color: var(--surface-variant); margin: 8px 0;"></div>
                <div style="display:flex; justify-content:space-between; font-size:13px; line-height:20px;">
                    <div>
                        <div>Total Wt: ${(sale.totalWeight || 0).toFixed(2)} kg</div>
                        <div>Empty Wt: ${(sale.emptyBoxWeight || 0).toFixed(2)} kg</div>
                        <div style="font-weight:700;">Net Wt: ${(sale.netWeight || 0).toFixed(2)} kg</div>
                    </div>
                    <div style="text-align:right;">
                        <div>Rate: ₹${(sale.rate || 0).toFixed(2)}/kg</div>
                        <div style="font-weight:700;">Total: ₹${(sale.totalAmount || 0).toFixed(2)}</div>
                        <div style="color: ${sale.paidAmount > 0 ? 'var(--income-green)' : '#888'}; font-weight: 600;">
                            Paid: ₹${(sale.paidAmount || 0).toFixed(2)} (${sale.paymentMode})
                        </div>
                    </div>
                </div>
                ${noteRow}
            `;
            
            // Bind events
            card.querySelector('.btn-edit-sale').addEventListener('click', () => openSaleForm(sale));
            card.querySelector('.btn-delete-sale').addEventListener('click', () => confirmDeleteSale(sale));
            card.querySelector('.btn-share-sale').addEventListener('click', () => generateSaleInvoicePrintView(sale));
            
            listEl.appendChild(card);
        });
    });
}

function openSaleForm(sale = null) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = sale ? "Edit Sale Log" : "Log Shop Sale";
    
    // Build options for Shops
    let shopOptions = `<option value="">-- Select Chicken Shop --</option>`;
    DataRepository.shops.forEach(s => {
        shopOptions += `<option value="${s.id}" ${sale && sale.shopId === s.id ? 'selected' : ''}>${s.name}</option>`;
    });
    
    // Build options for Vehicles
    let vehicleOptions = `<option value="">-- Select Vehicle --</option>`;
    DataRepository.vehicles.forEach(v => {
        vehicleOptions += `<option value="${v.number}" ${sale && sale.vehicleNo === v.number ? 'selected' : ''}>${v.number} (${v.name})</option>`;
    });
    
    const today = getLocalISODate();
    
    body.innerHTML = `
        <form id="sale-dialog-form">
            <div class="input-group">
                <label for="form-sale-date">Date *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">event</span>
                    <input type="date" id="form-sale-date" required value="${sale ? sale.date : today}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-sale-shop">Chicken Shop *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">shopping_cart</span>
                    <select id="form-sale-shop" required style="padding-left:42px;">
                        ${shopOptions}
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label for="form-sale-vehicle">Vehicle</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">directions_car</span>
                        <select id="form-sale-vehicle" style="padding-left:42px;">
                            ${vehicleOptions}
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label for="form-sale-vehicle-custom">Custom Vehicle No</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">edit</span>
                        <input type="text" id="form-sale-vehicle-custom" placeholder="Optional" value="${sale && !DataRepository.vehicles.some(v => v.number === sale.vehicleNo) ? sale.vehicleNo : ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label for="form-sale-total-wt">Total Weight (kg) *</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">scale</span>
                        <input type="number" step="0.01" id="form-sale-total-wt" placeholder="0.00" required value="${sale ? sale.totalWeight : ''}">
                    </div>
                </div>
                <div class="input-group">
                    <label for="form-sale-empty-wt">Empty Box Weight (kg) *</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">scale</span>
                        <input type="number" step="0.01" id="form-sale-empty-wt" placeholder="0.00" required value="${sale ? sale.emptyBoxWeight : ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label>Net Weight</label>
                    <div style="font-weight:700; font-size:16px; height: 45px; display:flex; align-items:center; padding-left:12px; background:var(--surface-variant); border-radius:var(--radius-md);" id="calc-sale-net-wt">0.00 kg</div>
                </div>
                <div class="input-group">
                    <label for="form-sale-rate">Rate (₹/kg) *</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">payments</span>
                        <input type="number" step="0.01" id="form-sale-rate" placeholder="0.00" required value="${sale ? sale.rate : ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="input-group">
                    <label>Total Amount</label>
                    <div style="font-weight:700; font-size:16px; height: 45px; display:flex; align-items:center; padding-left:12px; background:var(--surface-variant); border-radius:var(--radius-md); color:var(--income-green);" id="calc-sale-total-amt">₹0.00</div>
                </div>
                <div class="input-group">
                    <label for="form-sale-paid">Paid Amount (₹)</label>
                    <div class="input-wrapper">
                        <span class="material-icons-round input-icon">paid</span>
                        <input type="number" step="0.01" id="form-sale-paid" placeholder="0.00" value="${sale ? sale.paidAmount : ''}">
                    </div>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-sale-pay-mode">Payment Mode</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">credit_card</span>
                    <select id="form-sale-pay-mode" style="padding-left:42px;">
                        <option value="Credit" ${sale && sale.paymentMode === 'Credit' ? 'selected' : ''}>Credit (Shop Owes Us)</option>
                        <option value="Cash" ${sale && sale.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Bank" ${sale && sale.paymentMode === 'Bank' ? 'selected' : ''}>Bank</option>
                        <option value="UPI" ${sale && sale.paymentMode === 'UPI' ? 'selected' : ''}>UPI</option>
                        <option value="Cheque" ${sale && sale.paymentMode === 'Cheque' ? 'selected' : ''}>Cheque</option>
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-sale-note">Note</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">notes</span>
                    <input type="text" id="form-sale-note" placeholder="Optional notes" value="${sale ? sale.note : ''}">
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">Log Sale</button>
        </form>
    `;
    
    // Form math elements
    const totalWeightInput = document.getElementById('form-sale-total-wt');
    const emptyWeightInput = document.getElementById('form-sale-empty-wt');
    const rateInput = document.getElementById('form-sale-rate');
    const netWeightEl = document.getElementById('calc-sale-net-wt');
    const totalAmountEl = document.getElementById('calc-sale-total-amt');
    
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
    
    const form = document.getElementById('sale-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shopSelect = document.getElementById('form-sale-shop');
        const shopId = shopSelect.value;
        const shopName = shopSelect.options[shopSelect.selectedIndex].text;
        
        const vehicleSelect = document.getElementById('form-sale-vehicle');
        const customVehicle = document.getElementById('form-sale-vehicle-custom').value.trim();
        const vehicleNo = customVehicle || vehicleSelect.value || null;
        
        const date = document.getElementById('form-sale-date').value;
        const totalWeight = parseFloat(totalWeightInput.value) || 0.0;
        const emptyBoxWeight = parseFloat(emptyWeightInput.value) || 0.0;
        const rate = parseFloat(rateInput.value) || 0.0;
        const paidAmount = parseFloat(document.getElementById('form-sale-paid').value) || 0.0;
        const paymentMode = document.getElementById('form-sale-pay-mode').value;
        const note = document.getElementById('form-sale-note').value.trim();
        
        const newSale = {
            shopId,
            shopName,
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
            if (sale) {
                await DataRepository.updateSale(sale, newSale);
            } else {
                await DataRepository.addSale(newSale);
            }
            closeModal();
        } catch (err) {
            alert(`Error logging sale: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeleteSale(sale) {
    if (confirm(`Are you sure you want to delete this sales entry for ${sale.shopName}?`)) {
        DataRepository.deleteSale(sale)
            .catch(err => alert(`Error deleting sales log: ${err.message}`));
    }
}

function generateSaleInvoicePrintView(sale) {
    const printViewEl = document.getElementById('print-view');
    const shop = DataRepository.shops.find(s => s.id === sale.shopId) || { name: sale.shopName, phone: 'N/A', address: 'N/A', balance: 0 };
    
    const sales = DataRepository.sales.filter(s => s.shopId === sale.shopId).sort((a, b) => new Date(a.date) - new Date(b.date));
    const payments = DataRepository.payments.filter(p => p.partyId === sale.shopId && p.partyType === 'Shop').sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const genDate = new Date();
    const formattedGenDate = `${String(genDate.getDate()).padStart(2, '0')}/${String(genDate.getMonth() + 1).padStart(2, '0')}/${genDate.getFullYear()} ${String(genDate.getHours()).padStart(2, '0')}:${String(genDate.getMinutes()).padStart(2, '0')}:${String(genDate.getSeconds()).padStart(2, '0')}`;
    const dateRange = sales.length > 0 ? `${formatDisplayDate(sales[0].date)} to ${formatDisplayDate(sales[sales.length - 1].date)}` : formatDisplayDate(sale.date);
    
    let totalWt = 0;
    let totalAmt = 0;
    sales.forEach(s => { totalWt += s.netWeight; totalAmt += s.totalAmount; });
    const cashPaid = payments.filter(p => p.type === 'Receive').reduce((sum, p) => sum + p.amount + p.discount, 0);
    const totalSalesPaidInline = sales.reduce((sum, s) => sum + s.paidAmount, 0);
    
    const displayOldBalance = shop.balance + cashPaid + totalSalesPaidInline - totalAmt;
    const balanceStr = displayOldBalance > 0 ? `Owes Us: ₹${displayOldBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : `We Owe: ₹${(-displayOldBalance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    let salesRows = '';
    sales.forEach(s => {
        const isCurrent = s.id === sale.id;
        salesRows += `
            <tr ${isCurrent ? 'style="background-color: #f0fdf4;"' : ''}>
                <td>${formatDisplayDate(s.date)}${isCurrent ? ' *' : ''}</td>
                <td class="align-right">${s.totalWeight.toFixed(2)}</td>
                <td class="align-right">${s.emptyBoxWeight.toFixed(2)}</td>
                <td class="align-right">${s.netWeight.toFixed(2)}</td>
                <td class="align-right">${s.rate.toFixed(2)}</td>
                <td class="align-right">₹${s.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    if (sales.length > 0) {
        salesRows += `
            <tr class="pdf-totals-row">
                <td>TOTALS</td>
                <td class="align-right">${sales.reduce((sum, s) => sum + s.totalWeight, 0).toFixed(2)}</td>
                <td class="align-right">${sales.reduce((sum, s) => sum + s.emptyBoxWeight, 0).toFixed(2)}</td>
                <td class="align-right">${totalWt.toFixed(2)}</td>
                <td class="align-right"></td>
                <td class="align-right">₹${totalAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    } else {
        salesRows += `<tr><td colspan="6" style="text-align:center;">No transactions found</td></tr>`;
    }

    let paymentsRows = '';
    payments.forEach(p => {
        const modeStr = p.paymentMode ? ` (${p.paymentMode})` : '';
        const discStr = p.discount > 0 ? ` [+₹${p.discount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Disc]` : '';
        paymentsRows += `
            <tr>
                <td>${formatDisplayDate(p.date)}</td>
                <td>${p.type}${modeStr}</td>
                <td>${p.note || '-'}</td>
                <td class="align-right">₹${p.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${discStr}</td>
            </tr>
        `;
    });
    if (payments.length > 0) {
        paymentsRows += `
            <tr class="pdf-totals-row">
                <td>TOTAL RECEIVED</td>
                <td></td>
                <td></td>
                <td class="align-right">₹${cashPaid.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    } else {
        paymentsRows += `<tr><td colspan="4" style="text-align:center;">No payment transactions found</td></tr>`;
    }

    const closingBalance = displayOldBalance + totalAmt - totalSalesPaidInline - cashPaid;
    const closingLabel = closingBalance > 0 ? 'Current Outstanding:' : 'Advance We Owe:';
    const closingAmtStr = `₹${Math.abs(closingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const closingColor = closingBalance > 0 ? '#C62828' : '#2E7D32';

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
                    <h2>SALES INVOICE</h2>
                    <p>${dateRange}</p>
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin: 0 40px 20px 40px; gap: 20px;">
                <div class="pdf-card" style="flex:1;">
                    <div class="pdf-card-header">Invoice To</div>
                    <div class="pdf-card-body">
                        Name: ${shop.name}<br>
                        Phone: ${shop.phone}<br>
                        Address: ${shop.address}<br>
                        Opening Balance: ${balanceStr}
                    </div>
                </div>
                <div class="pdf-card" style="flex:1;">
                    <div class="pdf-card-header">Invoice Summary</div>
                    <div class="pdf-card-body">
                        Total Sales: ${sales.length}<br>
                        Total Net Weight: ${totalWt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg<br>
                        Total Amount: ₹${totalAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>
                        Total Received: ₹${cashPaid.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                </div>
            </div>
            
            <div class="pdf-section-title">Recent Sale Transactions</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th class="align-right">Total Wt</th>
                        <th class="align-right">Empty</th>
                        <th class="align-right">Net Wt</th>
                        <th class="align-right">Rate</th>
                        <th class="align-right">Amount</th>
                    </tr>
                </thead>
                <tbody>${salesRows}</tbody>
            </table>
            
            <div class="pdf-section-title">Recent Payment Transactions</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Note</th>
                        <th class="align-right">Amount</th>
                    </tr>
                </thead>
                <tbody>${paymentsRows}</tbody>
            </table>

            <div style="margin: 20px 40px 0 auto; max-width: 320px; margin-left: auto;">
                <div style="display:flex; justify-content:space-between; font-size:11px; padding: 3px 0;">
                    <span>Grand Total Amount:</span>
                    <strong style="color:#C62828;">₹${totalAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; padding: 3px 0;">
                    <span>Total Received Amount:</span>
                    <strong style="color:#2E7D32;">₹${(totalSalesPaidInline + cashPaid).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px; padding: 3px 0; font-weight:700;">
                    <span style="color:${closingColor};">${closingLabel}</span>
                    <strong style="color:${closingColor};">${closingAmtStr}</strong>
                </div>
            </div>

            <div class="pdf-footer">
                <div>Generated on: ${formattedGenDate}</div>
                <div>System Generated Electronic Report</div>
            </div>
        </div>
    `;
    window.print();
}

document.addEventListener('DOMContentLoaded', () => {
    const fabSales = document.getElementById('fab-add-sale');
    if (fabSales) fabSales.addEventListener('click', () => openSaleForm());
});
