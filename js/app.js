// Main entrypoint logic matching MainActivity.kt and SplashScreen.kt
document.addEventListener('DOMContentLoaded', () => {
    // 1. Kick off Data Listeners
    DataRepository.init();
    
    // 2. Splash Screen Redirection Logic (1.2s delay matching SplashScreen.kt)
    setTimeout(() => {
        const splashEl = document.getElementById('splash-screen');
        splashEl.classList.remove('active');
        
        if (SessionManager.isLoggedIn()) {
            Router.navigateTo('main-screen');
        } else {
            Router.navigateTo('login-screen');
        }
    }, 1200);
    
    // 3. Click on modal overlay backdrop closes the modal
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
});

// Global toast notification helper (replaces alert() for better UX)
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.getElementById('app-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Helper to get local date in YYYY-MM-DD format (avoids UTC timezone shift bugs from toISOString)
function getLocalISODate(date = new Date()) {
    const offset = date.getTimezoneOffset();
    const dateWithOffset = new Date(date.getTime() - (offset * 60 * 1000));
    return dateWithOffset.toISOString().split('T')[0];
}
