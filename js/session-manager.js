// SessionManager class storing and retrieving session details in localStorage
const SessionManager = {
    KEY_IS_LOGGED_IN: "is_logged_in",
    KEY_USERNAME: "username",
    KEY_USER_ROLE: "user_role",
    
    KEY_CAN_VIEW_FARMERS: "can_view_farmers",
    KEY_CAN_VIEW_SHOPS: "can_view_shops",
    KEY_CAN_VIEW_PURCHASES: "can_view_purchases",
    KEY_CAN_VIEW_SALES: "can_view_sales",
    KEY_CAN_VIEW_EXPENSES: "can_view_expenses",
    KEY_CAN_VIEW_PAYMENTS: "can_view_payments",

    login(username, role, permissions = {}) {
        localStorage.setItem(this.KEY_IS_LOGGED_IN, "true");
        localStorage.setItem(this.KEY_USERNAME, username);
        localStorage.setItem(this.KEY_USER_ROLE, role);
        
        localStorage.setItem(this.KEY_CAN_VIEW_FARMERS, permissions.canViewFarmers !== false ? "true" : "false");
        localStorage.setItem(this.KEY_CAN_VIEW_SHOPS, permissions.canViewShops !== false ? "true" : "false");
        localStorage.setItem(this.KEY_CAN_VIEW_PURCHASES, permissions.canViewPurchases !== false ? "true" : "false");
        localStorage.setItem(this.KEY_CAN_VIEW_SALES, permissions.canViewSales !== false ? "true" : "false");
        localStorage.setItem(this.KEY_CAN_VIEW_EXPENSES, permissions.canViewExpenses !== false ? "true" : "false");
        localStorage.setItem(this.KEY_CAN_VIEW_PAYMENTS, permissions.canViewPayments !== false ? "true" : "false");
    },

    logout() {
        localStorage.clear();
    },

    isLoggedIn() {
        return localStorage.getItem(this.KEY_IS_LOGGED_IN) === "true";
    },

    getUsername() {
        return localStorage.getItem(this.KEY_USERNAME);
    },

    getUserRole() {
        return localStorage.getItem(this.KEY_USER_ROLE) || "STAFF";
    },

    canViewFarmers() {
        return localStorage.getItem(this.KEY_CAN_VIEW_FARMERS) !== "false";
    },

    canViewShops() {
        return localStorage.getItem(this.KEY_CAN_VIEW_SHOPS) !== "false";
    },

    canViewPurchases() {
        return localStorage.getItem(this.KEY_CAN_VIEW_PURCHASES) !== "false";
    },

    canViewSales() {
        return localStorage.getItem(this.KEY_CAN_VIEW_SALES) !== "false";
    },

    canViewExpenses() {
        return localStorage.getItem(this.KEY_CAN_VIEW_EXPENSES) !== "false";
    },

    canViewPayments() {
        return localStorage.getItem(this.KEY_CAN_VIEW_PAYMENTS) !== "false";
    }
};
