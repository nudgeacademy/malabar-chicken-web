// Handles login form authentication and session management
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const btnLogin = document.getElementById('btn-login');
        const btnText = btnLogin.querySelector('.btn-text');
        const btnLoader = btnLogin.querySelector('.btn-loader');
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // Show loading state
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        btnLogin.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        
        try {
            // Check in Firestore
            const dbUser = await DataRepository.getStaffUserByUsername(username);
            
            if (dbUser && dbUser.password === password) {
                // Success Login
                SessionManager.login(dbUser.username, dbUser.role, {
                    canViewFarmers: dbUser.canViewFarmers,
                    canViewShops: dbUser.canViewShops,
                    canViewPurchases: dbUser.canViewPurchases,
                    canViewSales: dbUser.canViewSales,
                    canViewExpenses: dbUser.canViewExpenses,
                    canViewPayments: dbUser.canViewPayments
                });
                showToast(`Welcome ${dbUser.username}!`);
                Router.navigateTo('main-screen');
            } else if (username.toLowerCase() === 'admin' && password === 'password') {
                // Admin Fallback
                SessionManager.login('admin', 'ADMIN', {
                    canViewFarmers: true,
                    canViewShops: true,
                    canViewPurchases: true,
                    canViewSales: true,
                    canViewExpenses: true,
                    canViewPayments: true
                });
                showToast("Welcome Admin!");
                Router.navigateTo('main-screen');
            } else {
                alert("Invalid username or password");
            }
        } catch (err) {
            console.error("Authentication error:", err);
            // Fallback admin login even if Firestore is offline
            if (username.toLowerCase() === 'admin' && password === 'password') {
                SessionManager.login('admin', 'ADMIN', {
                    canViewFarmers: true,
                    canViewShops: true,
                    canViewPurchases: true,
                    canViewSales: true,
                    canViewExpenses: true,
                    canViewPayments: true
                });
                showToast("Welcome Admin (Offline/Fallback)!");
                Router.navigateTo('main-screen');
            } else {
                alert(`Login failed: ${err.message}`);
            }
        } finally {
            // Reset loading state
            usernameInput.disabled = false;
            passwordInput.disabled = false;
            btnLogin.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            passwordInput.value = '';
        }
    });
});

function initLoginScreen() {
    // Clear credentials
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}
