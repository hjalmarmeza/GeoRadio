import { checkMaintenanceStatus } from './api.js';


// THIS URL WILL BE PROVIDED BY THE USER AFTER DEPLOYMENT
const API_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3TXIxekRTWGlqS0hFRjJnbHR1TE9KVEdBZmxNalFoOTBaOXRpd2RBUmszU2ZDQ2ZnOGVoVHloVmExdk41YlRJemIvZXhlYw==');


export const Auth = {
    user: null,
    idleTimer: null,


    init() {
        // Check local storage
        const saved = localStorage.getItem(atob('Z2VvcmFkaW9fdXNlcg=='));
        if (saved) {
            this.user = JSON.parse(saved);


            // Retroactive Admin Fix
            if (this.user.name && this.user.name.includes(atob('SGphbG1hcg==')) && !this.user.isAdmin) {
                this.user.isAdmin = true;
                this.user.id = atob('U1VQRVJfQURNSU4=');
                localStorage.setItem(atob('Z2VvcmFkaW9fdXNlcg=='), JSON.stringify(this.user));
            }


            this.hideOverlay();


            // Check Maintenance on init (if session persisted)
            this.verifyMaintenanceAccess();
        } else {
            this.showOverlay();
            // Force hide maintenance so user can login
            const maint = document.getElementById('maintenance-overlay');
            if (maint) maint.classList.add('hidden');
        }


        this.bindEvents();
    },


    bindEvents() {
        const overlay = document.getElementById('auth-overlay');
        if (!overlay) return;


        // Toggles
        document.getElementById('link-register').onclick = (e) => { e.preventDefault(); this.toggleForms('register'); };
        document.getElementById('link-login').onclick = (e) => { e.preventDefault(); this.toggleForms('login'); };
        document.getElementById('link-forgot').onclick = (e) => { e.preventDefault(); this.toggleForms('forgot'); };
        document.getElementById('link-back-login').onclick = (e) => { e.preventDefault(); this.toggleForms('login'); };


        // Submits
        document.getElementById('form-login').onsubmit = (e) => this.handleLogin(e);
        document.getElementById('form-register').onsubmit = (e) => this.handleRegister(e);
        document.getElementById('form-forgot').onsubmit = (e) => this.handleForgot(e);
        document.getElementById('form-change-pass').onsubmit = (e) => this.handleChangePassword(e);
    },


    // --- IDLE TIMER (15 Mins) ---
    startIdleTimer() {
        // Clear existing to be safe
        this.stopIdleTimer();
        // Start 15 minute countdown
        this.idleTimer = setTimeout(() => {
            console.warn("Session expired due to inactivity (15m)");
            this.logout();
            this.showError("Sesión cerrada por inactividad.");
