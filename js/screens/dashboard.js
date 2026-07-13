// Dashboard logic matching MainScreen.kt and MainScreenViewModel.kt
let dashboardListenersAttached = false;
let dashboardSelectedDate = getLocalISODate(); // "yyyy-MM-dd"

function initMainScreen() {
    const userRole = SessionManager.getUserRole();
    document.getElementById('user-role-badge').textContent = `Logged in as ${userRole}`;
    
    // Toggle Admin widgets
    if (userRole === "ADMIN") {
        document.getElementById('admin-dashboard-widgets').classList.remove('hidden');
    } else {
        document.getElementById('admin-dashboard-widgets').classList.add('hidden');
    }
    
    // Setup date display
    updateDashboardDateText();
    
    // Render modules grid
    renderModulesGrid();
    
    // Bind Repository flow updates
    if (!dashboardListenersAttached) {
        DataRepository.onChange('farmers', updateDashboardData);
        DataRepository.onChange('shops', updateDashboardData);
        DataRepository.onChange('purchases', updateDashboardData);
        DataRepository.onChange('sales', updateDashboardData);
        DataRepository.onChange('expenses', updateDashboardData);
        dashboardListenersAttached = true;
    } else {
        updateDashboardData();
    }
}

function updateDashboardDateText() {
    const dateTextEl = document.getElementById('selected-date-text');
    const todayStr = getLocalISODate();
    const displayDate = formatDisplayDate(dashboardSelectedDate);
    
    dateTextEl.textContent = dashboardSelectedDate === todayStr ? `Today (${displayDate})` : displayDate;
    
    // Toggle "Today" button visibility
    const todayBtn = document.getElementById('dashboard-date-today');
    if (dashboardSelectedDate === todayStr) {
        todayBtn.classList.add('hidden');
    } else {
        todayBtn.classList.remove('hidden');
    }
    
    // Update input element value
    document.getElementById('dashboard-date-picker').value = dashboardSelectedDate;
}

function changeDashboardDate(days) {
    const d = new Date(dashboardSelectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    dashboardSelectedDate = getLocalISODate(d);
    updateDashboardDateText();
    updateDashboardData();
}

function updateDashboardData() {
    const userRole = SessionManager.getUserRole();
    if (userRole !== "ADMIN") return; // No P&L calculations for staff
    
    const selectedDateVal = dashboardSelectedDate;
    
    // 1. Filter daily entries
    const filteredPurchases = DataRepository.purchases.filter(p => p.date === selectedDateVal);
    const filteredSales = DataRepository.sales.filter(s => s.date === selectedDateVal);
    const filteredExpenses = DataRepository.expenses.filter(e => e.date === selectedDateVal);
    
    // 2. Aggregate P&L amounts
    const totalSales = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const grossProfit = totalSales - totalPurchases;
    const netProfit = grossProfit - totalExpenses;
    
    // 3. Render Hero Card
    const heroCard = document.getElementById('pnl-hero-card');
    const pnlValEl = document.getElementById('pnl-amount');
    const pnlStatusEl = document.getElementById('pnl-status');
    const pnlDateEl = document.getElementById('pnl-date');
    
    pnlDateEl.textContent = formatDisplayDate(selectedDateVal);
    
    // Format netProfit
    const prefix = netProfit >= 0 ? "+" : "";
    pnlValEl.textContent = `${prefix}₹${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (netProfit >= 0) {
        heroCard.className = "pnl-hero card profit";
        pnlStatusEl.textContent = "Net Profit ↑";
    } else {
        heroCard.className = "pnl-hero card loss";
        pnlStatusEl.textContent = "Net Loss ↓";
    }
    
    // Render Stats
    document.getElementById('stat-sales-amount').textContent = `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-sales-count').textContent = `${filteredSales.length} bills`;

    document.getElementById('stat-purchases-amount').textContent = `₹${totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-purchases-count').textContent = `${filteredPurchases.length} lots`;

    document.getElementById('stat-expenses-amount').textContent = `₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-expenses-count').textContent = `${filteredExpenses.length} items`;
    
    // 4. Render overall ledger balances
    const totalOweFarmers = DataRepository.farmers.filter(f => f.balance > 0).reduce((sum, f) => sum + f.balance, 0);
    const totalShopsOweUs = DataRepository.shops.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
    
    document.getElementById('ledger-owe-farmers-value').textContent = `₹${totalOweFarmers.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('ledger-owe-farmers-sub').textContent = `${DataRepository.farmers.length} farmers`;
    
    document.getElementById('ledger-shops-owe-value').textContent = `₹${totalShopsOweUs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('ledger-shops-owe-sub').textContent = `${DataRepository.shops.length} shops`;
}

function renderModulesGrid() {
    const grid = document.getElementById('modules-grid');
    grid.innerHTML = '';
    
    const userRole = SessionManager.getUserRole();
    const modules = [];
    
    if (SessionManager.canViewFarmers()) {
        modules.push({ title: "Farmers", subtitle: "Growers & suppliers", icon: "person", color: "#E3F2FD", iconColor: "#1565C0", screen: "farmers-screen" });
    }
    if (SessionManager.canViewShops()) {
        modules.push({ title: "Chicken Shops", subtitle: "Customer accounts", icon: "shopping_cart", color: "#E8F5E9", iconColor: "#2E7D32", screen: "shops-screen" });
    }
    if (SessionManager.canViewPurchases()) {
        modules.push({ title: "Purchases", subtitle: "Buy from farmers", icon: "local_shipping", color: "#FFF8E1", iconColor: "#E65100", screen: "purchases-screen" });
    }
    if (SessionManager.canViewSales()) {
        modules.push({ title: "Sales", subtitle: "Sell to shops", icon: "send", color: "#F3E5F5", iconColor: "#6A1B9A", screen: "sales-screen" });
    }
    if (SessionManager.canViewExpenses()) {
        modules.push({ title: "Expenses", subtitle: "Daily operating costs", icon: "receipt", color: "#FFFFEBEE", iconColor: "#C62828", screen: "expenses-screen" });
    }
    if (SessionManager.canViewPayments()) {
        modules.push({ title: "Payments", subtitle: "Receipts & payouts", icon: "account_balance_wallet", color: "#E0F7FA", iconColor: "#00838F", screen: "payments-screen" });
    }
    if (userRole === "ADMIN") {
        modules.push({ title: "Reports", subtitle: "P&L Analytics", icon: "bar_chart", color: "#FFF3E0", iconColor: "#E65100", screen: "reports-screen" });
        modules.push({ title: "Vehicles", subtitle: "Manage fleet", icon: "directions_car", color: "#ECEFF1", iconColor: "#455A64", screen: "vehicles-screen" });
        modules.push({ title: "Manage Staff", subtitle: "Add/Edit Staff", icon: "people", color: "#EFEBE9", iconColor: "#4E342E", screen: "manage-staff-screen" });
    }
    
    modules.forEach(m => {
        const el = document.createElement('div');
        el.className = "menu-item-card";
        el.innerHTML = `
            <div class="menu-icon-wrapper" style="background-color: ${m.color}">
                <span class="material-icons-round" style="color: ${m.iconColor}">${m.icon}</span>
            </div>
            <div class="menu-item-meta">
                <span class="menu-item-title">${m.title}</span>
                <span class="menu-item-subtitle">${m.subtitle}</span>
            </div>
        `;
        el.addEventListener('click', () => Router.navigateTo(m.screen));
        grid.appendChild(el);
    });
}

// Bind dashboard UI events
document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('dashboard-date-prev');
    const nextBtn = document.getElementById('dashboard-date-next');
    const todayBtn = document.getElementById('dashboard-date-today');
    const picker = document.getElementById('dashboard-date-picker');
    const trigger = document.getElementById('dashboard-date-display');
    const logoutBtn = document.getElementById('btn-logout');
    
    if (prevBtn) prevBtn.addEventListener('click', () => changeDashboardDate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeDashboardDate(1));
    if (todayBtn) todayBtn.addEventListener('click', () => {
        dashboardSelectedDate = getLocalISODate();
        updateDashboardDateText();
        updateDashboardData();
    });
    
    if (picker) picker.addEventListener('change', (e) => {
        if (e.target.value) {
            dashboardSelectedDate = e.target.value;
            updateDashboardDateText();
            updateDashboardData();
        }
    });
    
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to log out?")) {
            SessionManager.logout();
            Router.navigateTo('login-screen');
        }
    });
});

// Reusable date formats
function formatDisplayDate(dateStr) {
    if (!dateStr) return "";
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
        }
    } catch(e) {}
    return dateStr;
}

function parseDisplayDate(displayStr) {
    if (!displayStr) return "";
    try {
        const parts = displayStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
        }
    } catch(e) {}
    return displayStr;
}
