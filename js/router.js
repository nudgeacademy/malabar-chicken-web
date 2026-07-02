// SPA Router for managing screens and history
const Router = {
    history: [],

    navigateTo(screenId) {
        console.log("Navigating to:", screenId);
        
        // Hide all screens
        document.querySelectorAll('.screen-view').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Find and activate target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            
            // Push to back stack unless it's already the active top screen
            if (this.history.length === 0 || this.history[this.history.length - 1] !== screenId) {
                this.history.push(screenId);
            }
            
            // Execute module initializers (e.g. initFarmersScreen)
            const initFnName = `init${this.camelCase(screenId)}`;
            if (typeof window[initFnName] === 'function') {
                window[initFnName]();
            }
        }
    },

    back() {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current screen from history
            const previousScreenId = this.history[this.history.length - 1];
            
            // Navigate back
            document.querySelectorAll('.screen-view').forEach(screen => {
                screen.classList.remove('active');
            });
            const targetScreen = document.getElementById(previousScreenId);
            if (targetScreen) {
                targetScreen.classList.add('active');
                
                // Re-initialize the screen when returning
                const initFnName = `init${this.camelCase(previousScreenId)}`;
                if (typeof window[initFnName] === 'function') {
                    window[initFnName]();
                }
            }
        } else {
            // Default back to main dashboard
            this.navigateTo('main-screen');
        }
    },

    camelCase(str) {
        return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
    }
};

// Bind back buttons globally
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            Router.back();
        });
    });
});
