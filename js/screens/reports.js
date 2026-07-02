// Reports Screen logic matching ReportsScreen.kt
let activeReportTab = "pnl"; // "pnl", "farmers", "shops", "vehicles"
let reportSelectedFilter = "Today"; // "Today", "This Month", "Pick Date", "All Time"
let reportSelectedDate = getLocalISODate();

function initReportsScreen() {
    setupReportTabs();
    renderReportTabContent();
    
    // Bind updates
    DataRepository.onChange('purchases', renderReportTabContent);
    DataRepository.onChange('sales', renderReportTabContent);
    DataRepository.onChange('expenses', renderReportTabContent);
}

function setupReportTabs() {
    const tabPnl = document.getElementById('tab-report-pnl');
    const tabFarmers = document.getElementById('tab-report-farmers');
    const tabShops = document.getElementById('tab-report-shops');
    const tabVehicles = document.getElementById('tab-report-vehicles');
    
    if (!tabPnl) return;
    
    const tabs = [tabPnl, tabFarmers, tabShops, tabVehicles];
    const clickHandler = (tab, key) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeReportTab = key;
        renderReportTabContent();
    };
    
    tabPnl.onclick = () => clickHandler(tabPnl, "pnl");
    tabFarmers.onclick = () => clickHandler(tabFarmers, "farmers");
    tabShops.onclick = () => clickHandler(tabShops, "shops");
    tabVehicles.onclick = () => clickHandler(tabVehicles, "vehicles");
    
    // Bind main PDF export action in toolbar
    document.getElementById('btn-report-export-pdf').onclick = () => {
        exportActiveReport();
    };
}

function renderReportTabContent() {
    const container = document.getElementById('report-tab-content');
    if (!container) return;
    container.innerHTML = '';
    
    if (activeReportTab === "pnl") {
        renderPnlSummaryTab(container);
    } else if (activeReportTab === "farmers") {
        renderFarmersLedgerTab(container);
    } else if (activeReportTab === "shops") {
        renderShopsLedgerTab(container);
    } else if (activeReportTab === "vehicles") {
        renderVehiclesLogTab(container);
    }
}

// 1. P&L Summary Tab
function renderPnlSummaryTab(container) {
    // Render filters
    const filterCard = document.createElement('div');
    filterCard.className = "card";
    filterCard.style.padding = "10px";
    
    const todayStr = getLocalISODate();
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
    
    filterCard.innerHTML = `
        <span style="font-size:12px; font-weight:600; opacity:0.6; display:block; margin-bottom:8px;">Select Period</span>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
            <button class="btn btn-secondary ${reportSelectedFilter === 'Today' ? 'btn-primary' : ''}" id="btn-rep-filter-today" style="padding:8px 12px; font-size:13px;">Today</button>
            <button class="btn btn-secondary ${reportSelectedFilter === 'This Month' ? 'btn-primary' : ''}" id="btn-rep-filter-month" style="padding:8px 12px; font-size:13px;">This Month</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="btn btn-secondary ${reportSelectedFilter === 'Pick Date' ? 'btn-primary' : ''}" id="btn-rep-filter-pick" style="padding:8px 12px; font-size:13px;">Pick Date</button>
            <button class="btn btn-secondary ${reportSelectedFilter === 'All Time' ? 'btn-primary' : ''}" id="btn-rep-filter-all" style="padding:8px 12px; font-size:13px;">All Time</button>
        </div>
        
        <div id="rep-date-picker-row" class="input-group hidden" style="margin-top:10px; margin-bottom:0;">
            <label>Select Date</label>
            <div class="input-wrapper">
                <span class="material-icons-round input-icon">event</span>
                <input type="date" id="rep-custom-date" value="${reportSelectedDate}">
            </div>
        </div>
    `;
    container.appendChild(filterCard);
    
    // Bind filter actions
    const selectFilter = (filterKey) => {
        reportSelectedFilter = filterKey;
        renderReportTabContent();
    };
    
    document.getElementById('btn-rep-filter-today').onclick = () => selectFilter('Today');
    document.getElementById('btn-rep-filter-month').onclick = () => selectFilter('This Month');
    document.getElementById('btn-rep-filter-all').onclick = () => selectFilter('All Time');
    
    const pickBtn = document.getElementById('btn-rep-filter-pick');
    const dateRow = document.getElementById('rep-date-picker-row');
    if (reportSelectedFilter === 'Pick Date') {
        dateRow.classList.remove('hidden');
    }
    pickBtn.onclick = () => {
        reportSelectedFilter = 'Pick Date';
        renderReportTabContent();
    };
    
    const datePicker = document.getElementById('rep-custom-date');
    if (datePicker) {
        datePicker.onchange = (e) => {
            reportSelectedDate = e.target.value;
            renderReportTabContent();
        };
    }
    
    // Filtering logic
    let purchases = DataRepository.purchases;
    let sales = DataRepository.sales;
    let expenses = DataRepository.expenses;
    
    if (reportSelectedFilter === "Today") {
        purchases = purchases.filter(p => p.date === todayStr);
        sales = sales.filter(s => s.date === todayStr);
        expenses = expenses.filter(e => e.date === todayStr);
    } else if (reportSelectedFilter === "This Month") {
        purchases = purchases.filter(p => p.date.startsWith(currentMonthPrefix));
        sales = sales.filter(s => s.date.startsWith(currentMonthPrefix));
        expenses = expenses.filter(e => e.date.startsWith(currentMonthPrefix));
    } else if (reportSelectedFilter === "Pick Date") {
        purchases = purchases.filter(p => p.date === reportSelectedDate);
        sales = sales.filter(s => s.date === reportSelectedDate);
        expenses = expenses.filter(e => e.date === reportSelectedDate);
    }
    
    const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;
    
    // Period display tag
    let periodStr = "All Time";
    if (reportSelectedFilter === "Today") periodStr = `Today (${formatDisplayDate(todayStr)})`;
    else if (reportSelectedFilter === "This Month") periodStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    else if (reportSelectedFilter === "Pick Date") periodStr = formatDisplayDate(reportSelectedDate);
    
    // Render PNL summary card
    const pnlCard = document.createElement('div');
    pnlCard.className = `pnl-hero card ${netProfit >= 0 ? 'profit' : 'loss'}`;
    const prefix = netProfit >= 0 ? "+" : "";
    pnlCard.innerHTML = `
        <div class="pnl-header">
            <span class="pnl-title">P&L Analytics</span>
            <span class="pnl-date-text">${periodStr}</span>
        </div>
        <div class="pnl-value">${prefix}₹${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="pnl-status-label">${netProfit >= 0 ? 'Net Profit ↑' : 'Net Loss ↓'}</div>
    `;
    container.appendChild(pnlCard);
    
    // Visual comparison CSS bars
    const maxVal = Math.max(totalSales, totalPurchases, totalExpenses, 1.0);
    const salesPercent = (totalSales / maxVal) * 100;
    const purchasesPercent = (totalPurchases / maxVal) * 100;
    const expensesPercent = (totalExpenses / maxVal) * 100;
    
    const chartCard = document.createElement('div');
    chartCard.className = "card";
    chartCard.innerHTML = `
        <span style="font-size:12px; font-weight:700; opacity:0.6; display:block; margin-bottom:12px;">Financial Comparison</span>
        
        <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:4px;">
                <span>Total Sales</span>
                <span style="color:var(--income-green)">₹${totalSales.toLocaleString('en-IN')}</span>
            </div>
            <div style="height:8px; background-color:var(--surface-variant); border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${salesPercent}%; background-color:var(--income-green);"></div>
            </div>
        </div>
        
        <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:4px;">
                <span>Total Purchases</span>
                <span style="color:var(--owed-orange)">₹${totalPurchases.toLocaleString('en-IN')}</span>
            </div>
            <div style="height:8px; background-color:var(--surface-variant); border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${purchasesPercent}%; background-color:var(--owed-orange);"></div>
            </div>
        </div>
        
        <div style="margin-bottom:4px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:4px;">
                <span>Total Expenses</span>
                <span style="color:var(--expense-red)">₹${totalExpenses.toLocaleString('en-IN')}</span>
            </div>
            <div style="height:8px; background-color:var(--surface-variant); border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${expensesPercent}%; background-color:var(--expense-red);"></div>
            </div>
        </div>
    `;
    container.appendChild(chartCard);
}

// 2. Farmers Ledger Tab
let selectedReportFarmerId = "";
function renderFarmersLedgerTab(container) {
    // Farmer drop-down select
    let options = `<option value="">-- Select Farmer --</option>`;
    DataRepository.farmers.forEach(f => {
        options += `<option value="${f.id}" ${selectedReportFarmerId === f.id ? 'selected' : ''}>${f.name}</option>`;
    });
    
    const card = document.createElement('div');
    card.className = "card";
    card.style.padding = "12px";
    card.innerHTML = `
        <span style="font-size:12px; font-weight:600; opacity:0.6; display:block; margin-bottom:8px;">Choose Grower</span>
        <div class="input-group" style="margin-bottom:0;">
            <div class="input-wrapper">
                <span class="material-icons-round input-icon">person</span>
                <select id="rep-farmer-select" style="padding-left:42px;">
                    ${options}
                </select>
            </div>
        </div>
    `;
    container.appendChild(card);
    
    const select = document.getElementById('rep-farmer-select');
    select.addEventListener('change', () => {
        selectedReportFarmerId = select.value;
        renderFarmersLedgerContent(container);
    });
    
    renderFarmersLedgerContent(container);
}

function renderFarmersLedgerContent(container) {
    // Clear old details
    const old = document.getElementById('rep-farmer-ledger-details');
    if (old) old.remove();
    
    if (!selectedReportFarmerId) return;
    
    const farmer = DataRepository.farmers.find(f => f.id === selectedReportFarmerId);
    if (!farmer) return;
    
    const div = document.createElement('div');
    div.id = 'rep-farmer-ledger-details';
    div.style.marginTop = "14px";
    
    // Fetch logs
    const purchases = DataRepository.getPurchasesForFarmer(farmer.id);
    const payments = DataRepository.getPaymentTransactionsForParty(farmer.id);
    
    let tableRows = ``;
    let count = 0;
    
    // Merge list
    let list = [];
    purchases.forEach(p => list.push({ date: p.date, desc: `Purchase Log (${p.netWeight} kg)`, amount: p.totalAmount, paid: p.paidAmount }));
    payments.forEach(pay => {
        const discStr = pay.discount ? ` [+₹${pay.discount} Disc]` : '';
        list.push({ date: pay.date, desc: `Payout (${pay.paymentMode || 'Cash'})${discStr}`, amount: 0, paid: (pay.amount || 0) + (pay.discount || 0) });
    });
    
    list.sort((a,b) => b.date.localeCompare(a.date));
    
    list.forEach(t => {
        count++;
        tableRows += `
            <tr>
                <td>${formatDisplayDate(t.date)}</td>
                <td>${t.desc}</td>
                <td style="color:var(--expense-red);">₹${t.amount > 0 ? t.amount.toFixed(2) : '-'}</td>
                <td style="color:var(--income-green);">₹${t.paid > 0 ? t.paid.toFixed(2) : '-'}</td>
            </tr>
        `;
    });
    
    if (count === 0) {
        tableRows = `<tr><td colspan="4" style="text-align:center; color:#888;">No transactions found</td></tr>`;
    }
    
    div.innerHTML = `
        <div class="report-table-card">
            <div class="report-table-title">Statement for ${farmer.name} (Bal: ₹${farmer.balance.toFixed(2)})</div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Charge</th>
                        <th>Paid</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
    container.appendChild(div);
}

// 3. Shops Ledger Tab
let selectedReportShopId = "";
function renderShopsLedgerTab(container) {
    let options = `<option value="">-- Select Shop --</option>`;
    DataRepository.shops.forEach(s => {
        options += `<option value="${s.id}" ${selectedReportShopId === s.id ? 'selected' : ''}>${s.name}</option>`;
    });
    
    const card = document.createElement('div');
    card.className = "card";
    card.style.padding = "12px";
    card.innerHTML = `
        <span style="font-size:12px; font-weight:600; opacity:0.6; display:block; margin-bottom:8px;">Choose Customer</span>
        <div class="input-group" style="margin-bottom:0;">
            <div class="input-wrapper">
                <span class="material-icons-round input-icon">shopping_cart</span>
                <select id="rep-shop-select" style="padding-left:42px;">
                    ${options}
                </select>
            </div>
        </div>
    `;
    container.appendChild(card);
    
    const select = document.getElementById('rep-shop-select');
    select.addEventListener('change', () => {
        selectedReportShopId = select.value;
        renderShopsLedgerContent(container);
    });
    
    renderShopsLedgerContent(container);
}

function renderShopsLedgerContent(container) {
    const old = document.getElementById('rep-shop-ledger-details');
    if (old) old.remove();
    
    if (!selectedReportShopId) return;
    
    const shop = DataRepository.shops.find(s => s.id === selectedReportShopId);
    if (!shop) return;
    
    const div = document.createElement('div');
    div.id = 'rep-shop-ledger-details';
    div.style.marginTop = "14px";
    
    const sales = DataRepository.getSalesForShop(shop.id);
    const payments = DataRepository.getPaymentTransactionsForParty(shop.id);
    
    let tableRows = ``;
    let count = 0;
    
    let list = [];
    sales.forEach(s => list.push({ date: s.date, desc: `Sales Log (${s.netWeight} kg)`, amount: s.totalAmount, paid: s.paidAmount }));
    payments.forEach(pay => {
        const discStr = pay.discount ? ` [+₹${pay.discount} Disc]` : '';
        list.push({ date: pay.date, desc: `Receipt (${pay.paymentMode || 'Cash'})${discStr}`, amount: 0, paid: (pay.amount || 0) + (pay.discount || 0) });
    });
    
    list.sort((a,b) => b.date.localeCompare(a.date));
    
    list.forEach(t => {
        count++;
        tableRows += `
            <tr>
                <td>${formatDisplayDate(t.date)}</td>
                <td>${t.desc}</td>
                <td style="color:var(--income-green);">₹${t.amount > 0 ? t.amount.toFixed(2) : '-'}</td>
                <td style="color:var(--expense-red);">₹${t.paid > 0 ? t.paid.toFixed(2) : '-'}</td>
            </tr>
        `;
    });
    
    if (count === 0) {
        tableRows = `<tr><td colspan="4" style="text-align:center; color:#888;">No transactions found</td></tr>`;
    }
    
    div.innerHTML = `
        <div class="report-table-card">
            <div class="report-table-title">Statement for ${shop.name} (Bal: ₹${shop.balance.toFixed(2)})</div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Charge</th>
                        <th>Paid</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
    container.appendChild(div);
}

// 4. Vehicle Logs Tab
let selectedReportVehicleNo = "";
function renderVehiclesLogTab(container) {
    let options = `<option value="">-- Select Vehicle --</option>`;
    DataRepository.vehicles.forEach(v => {
        options += `<option value="${v.number}" ${selectedReportVehicleNo === v.number ? 'selected' : ''}>${v.number} (${v.name})</option>`;
    });
    
    const card = document.createElement('div');
    card.className = "card";
    card.style.padding = "12px";
    card.innerHTML = `
        <span style="font-size:12px; font-weight:600; opacity:0.6; display:block; margin-bottom:8px;">Choose Fleet Vehicle</span>
        <div class="input-group" style="margin-bottom:0;">
            <div class="input-wrapper">
                <span class="material-icons-round input-icon">directions_car</span>
                <select id="rep-vehicle-select" style="padding-left:42px;">
                    ${options}
                </select>
            </div>
        </div>
    `;
    container.appendChild(card);
    
    const select = document.getElementById('rep-vehicle-select');
    select.addEventListener('change', () => {
        selectedReportVehicleNo = select.value;
        renderVehiclesLogContent(container);
    });
    
    renderVehiclesLogContent(container);
}

function renderVehiclesLogContent(container) {
    const old = document.getElementById('rep-vehicle-log-details');
    if (old) old.remove();
    
    if (!selectedReportVehicleNo) return;
    
    const div = document.createElement('div');
    div.id = 'rep-vehicle-log-details';
    div.style.marginTop = "14px";
    
    // Filter purchases & sales by vehicle number
    const purchases = DataRepository.purchases.filter(p => p.vehicleNo === selectedReportVehicleNo);
    const sales = DataRepository.sales.filter(s => s.vehicleNo === selectedReportVehicleNo);
    
    let tableRows = ``;
    let count = 0;
    
    purchases.forEach(p => {
        count++;
        tableRows += `
            <tr style="background-color:rgba(230,0,0,0.02);">
                <td>${formatDisplayDate(p.date)}</td>
                <td>Farmer Purchase: ${p.farmerName}</td>
                <td>${p.netWeight} kg</td>
                <td style="color:var(--expense-red); font-weight:700;">₹${p.totalAmount.toFixed(2)}</td>
            </tr>
        `;
    });
    
    sales.forEach(s => {
        count++;
        tableRows += `
            <tr style="background-color:rgba(0,230,0,0.02);">
                <td>${formatDisplayDate(s.date)}</td>
                <td>Shop Sale: ${s.shopName}</td>
                <td>${s.netWeight} kg</td>
                <td style="color:var(--income-green); font-weight:700;">₹${s.totalAmount.toFixed(2)}</td>
            </tr>
        `;
    });
    
    if (count === 0) {
        tableRows = `<tr><td colspan="4" style="text-align:center; color:#888;">No logs found for this vehicle</td></tr>`;
    }
    
    div.innerHTML = `
        <div class="report-table-card">
            <div class="report-table-title">Logs for Vehicle: ${selectedReportVehicleNo}</div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type / Party</th>
                        <th>Net Wt</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
    container.appendChild(div);
}

// Global active tab export generator
function exportActiveReport() {
    const genDate = new Date();
    const formattedGenDate = `${String(genDate.getDate()).padStart(2, '0')}/${String(genDate.getMonth() + 1).padStart(2, '0')}/${genDate.getFullYear()} ${String(genDate.getHours()).padStart(2, '0')}:${String(genDate.getMinutes()).padStart(2, '0')}:${String(genDate.getSeconds()).padStart(2, '0')}`;
    
    if (activeReportTab === "pnl") {
        // Print general P&L Statement
        const todayStr = getLocalISODate();
        const currentMonthPrefix = todayStr.substring(0, 7);
        
        let purchases = DataRepository.purchases;
        let sales = DataRepository.sales;
        let expenses = DataRepository.expenses;
        
        if (reportSelectedFilter === "Today") {
            purchases = purchases.filter(p => p.date === todayStr);
            sales = sales.filter(s => s.date === todayStr);
            expenses = expenses.filter(e => e.date === todayStr);
        } else if (reportSelectedFilter === "This Month") {
            purchases = purchases.filter(p => p.date.startsWith(currentMonthPrefix));
            sales = sales.filter(s => s.date.startsWith(currentMonthPrefix));
            expenses = expenses.filter(e => e.date.startsWith(currentMonthPrefix));
        } else if (reportSelectedFilter === "Pick Date") {
            purchases = purchases.filter(p => p.date === reportSelectedDate);
            sales = sales.filter(s => s.date === reportSelectedDate);
            expenses = expenses.filter(e => e.date === reportSelectedDate);
        }
        
        const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netProfit = totalSales - totalPurchases - totalExpenses;
        
        let periodStr = "All Time";
        if (reportSelectedFilter === "Today") periodStr = `Today (${formatDisplayDate(todayStr)})`;
        else if (reportSelectedFilter === "This Month") periodStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        else if (reportSelectedFilter === "Pick Date") periodStr = formatDisplayDate(reportSelectedDate);

        const printViewEl = document.getElementById('print-view');
        
        let tableRows = ``;
        sales.forEach(s => {
            tableRows += `
                <tr>
                    <td>${formatDisplayDate(s.date)}</td>
                    <td>Sale: ${s.shopName} (Vehicle: ${s.vehicleNo || 'N/A'})</td>
                    <td class="align-right" style="color:#2E7D32;">+ ₹${s.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `;
        });
        
        purchases.forEach(p => {
            tableRows += `
                <tr>
                    <td>${formatDisplayDate(p.date)}</td>
                    <td>Purchase: ${p.farmerName} (Vehicle: ${p.vehicleNo || 'N/A'})</td>
                    <td class="align-right" style="color:#C62828;">- ₹${p.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `;
        });
        
        expenses.forEach(e => {
            tableRows += `
                <tr>
                    <td>${formatDisplayDate(e.date)}</td>
                    <td>Expense: ${e.type} (${e.note || 'No notes'})</td>
                    <td class="align-right" style="color:#C62828;">- ₹${e.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `;
        });
        
        if (tableRows === '') {
            tableRows = `<tr><td colspan="3" style="text-align:center;">No transactions registered in this period</td></tr>`;
        }
        
        const prefix = netProfit >= 0 ? "+" : "";
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
                        <h2>FINANCIAL STATEMENT</h2>
                        <p>Period: ${periodStr}</p>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; margin: 0 40px 20px 40px; gap: 20px;">
                    <div class="pdf-card" style="flex:1;">
                        <div class="pdf-card-header">Total Sales</div>
                        <div class="pdf-card-body">
                            <strong style="font-size: 16px; color: #2E7D32;">₹${totalSales.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                        </div>
                    </div>
                    <div class="pdf-card" style="flex:1;">
                        <div class="pdf-card-header">Total Purchases</div>
                        <div class="pdf-card-body">
                            <strong style="font-size: 16px; color: #C62828;">₹${totalPurchases.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                        </div>
                    </div>
                    <div class="pdf-card" style="flex:1;">
                        <div class="pdf-card-header">Total Expenses</div>
                        <div class="pdf-card-body">
                            <strong style="font-size: 16px; color: #C62828;">₹${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                        </div>
                    </div>
                </div>
                
                <div style="margin: 0 40px 20px 40px; padding: 12px 16px; border: 1px solid #B0BEC5; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; background-color: #f8f9fa;">
                    <span style="font-weight:700; font-size:14px; color: #044014;">Net P&L Result:</span>
                    <strong style="font-size:22px; color:${netProfit >= 0 ? '#2E7D32' : '#C62828'}">${prefix}₹${Math.abs(netProfit).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                </div>
                
                <div class="pdf-section-title">Transactions Detail</div>
                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Details / Description</th>
                            <th class="align-right">Flow Result</th>
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
        window.print();
    } else if (activeReportTab === "farmers") {
        if (selectedReportFarmerId) {
            const farmer = DataRepository.farmers.find(f => f.id === selectedReportFarmerId);
            if (farmer) generateLedgerPrintView(farmer, "Farmer", null, null);
        } else {
            alert("Please select a farmer to export statement.");
        }
    } else if (activeReportTab === "shops") {
        if (selectedReportShopId) {
            const shop = DataRepository.shops.find(s => s.id === selectedReportShopId);
            if (shop) generateLedgerPrintView(shop, "Shop", null, null);
        } else {
            alert("Please select a shop to export statement.");
        }
    } else if (activeReportTab === "vehicles") {
        if (selectedReportVehicleNo) {
            const printViewEl = document.getElementById('print-view');
            const purchases = DataRepository.purchases.filter(p => p.vehicleNo === selectedReportVehicleNo);
            const sales = DataRepository.sales.filter(s => s.vehicleNo === selectedReportVehicleNo);
            
            let tableRows = ``;
            purchases.forEach(p => {
                tableRows += `
                    <tr>
                        <td>${formatDisplayDate(p.date)}</td>
                        <td>Farmer Purchase: ${p.farmerName}</td>
                        <td class="align-right">${p.netWeight.toFixed(2)}</td>
                        <td class="align-right">₹${p.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                `;
            });
            
            sales.forEach(s => {
                tableRows += `
                    <tr>
                        <td>${formatDisplayDate(s.date)}</td>
                        <td>Shop Sale: ${s.shopName}</td>
                        <td class="align-right">${s.netWeight.toFixed(2)}</td>
                        <td class="align-right">₹${s.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                `;
            });

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
                            <h2>VEHICLE LOG REPORT</h2>
                            <p>Vehicle: ${selectedReportVehicleNo}</p>
                        </div>
                    </div>
                    
                    <table class="pdf-table" style="margin-top: 30px;">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Transaction Description</th>
                                <th class="align-right">Net Weight</th>
                                <th class="align-right">Amount</th>
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
            window.print();
        } else {
            alert("Please select a vehicle to export log statement.");
        }
    }
}

