// Expenses Screen logic matching ExpensesScreen.kt
let expensesListenersAttached = false;
let expensesSelectedFilter = 'Today'; // "Today", "All Time"

function initExpensesScreen() {
    setupExpensesTabs();
    renderExpensesList();
    if (!expensesListenersAttached) {
        DataRepository.onChange('expenses', renderExpensesList);
        expensesListenersAttached = true;
    }
}

function setupExpensesTabs() {
    const todayBtn = document.getElementById('tab-expenses-today');
    const allBtn = document.getElementById('tab-expenses-all');
    if (!todayBtn || !allBtn) return;
    
    todayBtn.onclick = () => {
        expensesSelectedFilter = 'Today';
        todayBtn.classList.add('active');
        allBtn.classList.remove('active');
        renderExpensesList();
    };
    
    allBtn.onclick = () => {
        expensesSelectedFilter = 'All Time';
        allBtn.classList.add('active');
        todayBtn.classList.remove('active');
        renderExpensesList();
    };
}

function renderExpensesList() {
    const listEl = document.getElementById('expenses-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    let expenses = DataRepository.expenses;
    const todayStr = getLocalISODate();
    
    if (expensesSelectedFilter === 'Today') {
        expenses = expenses.filter(e => e.date === todayStr);
    }
    
    // Update summary bar
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    document.getElementById('expenses-total-label').textContent = `Total Expenses: ₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (expenses.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round empty-state-icon">receipt</span>
                <h4 class="empty-state-title">${expensesSelectedFilter === 'Today' ? 'No expenses logged today' : 'No expenses logged yet'}</h4>
                <p class="empty-state-subtitle">Tap + to add your first expense</p>
            </div>
        `;
        return;
    }
    
    // Sort and group by date
    const sorted = [...expenses].sort((a,b) => b.date.localeCompare(a.date));
    const grouped = {};
    sorted.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
    });
    
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
        
        grouped[dateStr].forEach(expense => {
            const card = document.createElement('div');
            card.className = "item-card";
            card.style.marginBottom = "8px";
            
            const noteRow = expense.note ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">Note: ${expense.note}</div>` : '';
            
            card.innerHTML = `
                <div class="item-card-row">
                    <div class="item-card-meta">
                        <span class="item-card-title">${expense.type}</span>
                        <span class="item-card-subtitle" style="font-size: 12px;">
                            Paid from: ${expense.paidFrom}
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <span style="font-size: 16px; font-weight:700; color:var(--expense-red);">₹${(expense.amount || 0).toFixed(2)}</span>
                        <button class="btn-icon-small btn-edit-expense" title="Edit">
                            <span class="material-icons-round" style="color: var(--primary)">edit</span>
                        </button>
                        <button class="btn-icon-small btn-delete-expense" title="Delete">
                            <span class="material-icons-round" style="color: var(--expense-red)">delete</span>
                        </button>
                    </div>
                </div>
                ${noteRow}
            `;
            
            // Bind events
            card.querySelector('.btn-edit-expense').addEventListener('click', () => openExpenseForm(expense));
            card.querySelector('.btn-delete-expense').addEventListener('click', () => confirmDeleteExpense(expense));
            
            listEl.appendChild(card);
        });
    });
}

function openExpenseForm(expense = null) {
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = expense ? "Edit Expense Log" : "Log Daily Expense";
    
    const types = ["Transport", "Wages / Labor", "Vehicle Fuel", "Vehicle EMI", "Feed & Supplies", "Rent", "Other"];
    let typeOptions = ``;
    types.forEach(t => {
        typeOptions += `<option value="${t}" ${expense && expense.type === t ? 'selected' : ''}>${t}</option>`;
    });
    
    const today = getLocalISODate();
    
    body.innerHTML = `
        <form id="expense-dialog-form">
            <div class="input-group">
                <label for="form-expense-date">Date *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">event</span>
                    <input type="date" id="form-expense-date" required value="${expense ? expense.date : today}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-expense-type">Expense Category *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">category</span>
                    <select id="form-expense-type" required style="padding-left:42px;">
                        ${typeOptions}
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-expense-amount">Amount (₹) *</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">payments</span>
                    <input type="number" step="0.01" id="form-expense-amount" placeholder="0.00" required value="${expense ? expense.amount : ''}">
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-expense-paid-from">Paid From</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">account_balance_wallet</span>
                    <select id="form-expense-paid-from" style="padding-left:42px;">
                        <option value="Cash" ${expense && expense.paidFrom === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Bank" ${expense && expense.paidFrom === 'Bank' ? 'selected' : ''}>Bank</option>
                    </select>
                </div>
            </div>
            
            <div class="input-group">
                <label for="form-expense-note">Note / Remarks</label>
                <div class="input-wrapper">
                    <span class="material-icons-round input-icon">notes</span>
                    <input type="text" id="form-expense-note" placeholder="Optional notes" value="${expense ? expense.note : ''}">
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">Log Expense</button>
        </form>
    `;
    
    const form = document.getElementById('expense-dialog-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const date = document.getElementById('form-expense-date').value;
        const type = document.getElementById('form-expense-type').value;
        const amount = parseFloat(document.getElementById('form-expense-amount').value) || 0.0;
        const paidFrom = document.getElementById('form-expense-paid-from').value;
        const note = document.getElementById('form-expense-note').value.trim();
        
        try {
            if (expense) {
                await DataRepository.updateExpense({
                    id: expense.id,
                    date,
                    type,
                    amount,
                    paidFrom,
                    note
                });
            } else {
                await DataRepository.addExpense({
                    date,
                    type,
                    amount,
                    paidFrom,
                    note
                });
            }
            closeModal();
        } catch (err) {
            alert(`Error saving expense: ${err.message}`);
        }
    });
    
    openModal();
}

function confirmDeleteExpense(expense) {
    if (confirm(`Are you sure you want to delete this expense entry?`)) {
        DataRepository.deleteExpense(expense.id)
            .catch(err => alert(`Error deleting expense: ${err.message}`));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fabExpenses = document.getElementById('fab-add-expense');
    if (fabExpenses) fabExpenses.addEventListener('click', () => openExpenseForm());
});
