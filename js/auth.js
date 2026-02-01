import { checkMaintenanceStatus } from './api.js';

// THIS URL WILL BE PROVIDED BY THE USER AFTER DEPLOYMENT
const API_URL = "https://script.google.com/macros/s/AKfycbwMr1zDSXijKHEF2gltuLOJTGAflMjQh90Z9tiwdARk3SfCCfg8ehTyhVa1vN5bTIzb/exec";

export const Auth = {
    user: null,
    idleTimer: null,

    init() {
        // Check local storage
        const saved = localStorage.getItem('georadio_user');
        if (saved) {
            this.user = JSON.parse(saved);

            // Retroactive Admin Fix
            if (this.user.name && this.user.name.includes("Hjalmar") && !this.user.isAdmin) {
                this.user.isAdmin = true;
                this.user.id = "SUPER_ADMIN";
                localStorage.setItem('georadio_user', JSON.stringify(this.user));
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
        }, 15 * 60 * 1000);
    },

    stopIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    },
    // ----------------------------

    // NEW: Check Maintenance Logic after Login or on Init
    async verifyMaintenanceAccess() {
        const isMaint = await checkMaintenanceStatus();
        if (isMaint) {
            // If maintenance is ON
            const isAdmin = this.user && (this.user.isAdmin === true || (this.user.name && this.user.name.toLowerCase().includes('hjalmar')));

            if (!isAdmin) {
                // Not Admin: Block Access.
                // We do NOT hide overlay. Actually we DO hide Auth overlay because we want to show Maintenance Overlay?
                // Maint Overlay is below Auth.
                // If we hide Auth, user sees Maint. Correct.
                // BUT we must Trigger the Maint Overlay visibility in App.
                localStorage.setItem('MAINTENANCE_MODE', 'true');
                window.dispatchEvent(new CustomEvent('storage', { key: 'MAINTENANCE_MODE' })); // trigger listeners
                // Also dispatch custom auth event just in case
            }
        }
        // Always dispatch auth-changed so app knows user is logged in (or not)
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: this.user } }));
    },


    toggleForms(view) {
        const login = document.getElementById('form-login');
        const reg = document.getElementById('form-register');
        const forgot = document.getElementById('form-forgot');
        const changePass = document.getElementById('form-change-pass');

        const msg = document.getElementById('auth-message');
        msg.classList.add('hidden');
        msg.className = 'auth-message hidden';

        login.classList.add('hidden');
        reg.classList.add('hidden');
        forgot.classList.add('hidden');
        changePass.classList.add('hidden');

        if (view === 'login') login.classList.remove('hidden');
        else if (view === 'register') reg.classList.remove('hidden');
        else if (view === 'forgot') forgot.classList.remove('hidden');
        else if (view === 'change-pass') changePass.classList.remove('hidden');
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const btn = e.target.querySelector('button');

        this.setLoading(btn, true);

        // --- BACKDOOR ADMIN ACCESS ---
        if (email.toLowerCase() === "hjalmar" && pass === "5028") {
            await new Promise(r => setTimeout(r, 800)); // Fake loading for drama
            this.loginSuccess({
                name: "Hjalmar (Admin)",
                email: "admin@georadio.app",
                id: "SUPER_ADMIN",
                isAdmin: true
            });
            this.setLoading(btn, false);
            return;
        }
        // -----------------------------

        try {
            // If URL is placeholder, mock it for demo
            if (API_URL.includes("PLACEHOLDER")) {
                await new Promise(r => setTimeout(r, 1000));
                // Mock success
                this.loginSuccess({ name: "Usuario Demo", email: email, id: "demo" });
                return;
            }

            const res = await fetch(`${API_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}`, {
                method: 'POST'
            });

            const data = await res.json();

            if (data.status === 'success') {
                // Check if Forced Password Reset is needed
                if (data.user.mustChangePassword) {
                    this.pendingUser = data.user; // Store temp user
                    this.toggleForms('change-pass');
                } else {
                    this.loginSuccess(data.user);
                }
            } else {
                this.showError(data.message);
            }

        } catch (err) {
            console.error(err);
            this.showError("Error de conexión con el servidor.");
        } finally {
            this.setLoading(btn, false);
        }
    },

    async handleChangePassword(e) {
        e.preventDefault();
        const newPass = document.getElementById('new-pass-input').value;
        const btn = e.target.querySelector('button');

        if (!newPass || newPass.length < 6) {
            this.showError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        this.setLoading(btn, true);

        try {
            const res = await fetch(`${API_URL}?action=change_password&email=${encodeURIComponent(this.pendingUser.email)}&new_password=${encodeURIComponent(newPass)}`, {
                method: 'POST'
            });
            const data = await res.json();

            if (data.status === 'success') {
                // Now allow entry
                this.loginSuccess(this.pendingUser);
            } else {
                this.showError(data.message);
            }
        } catch (err) {
            this.showError("Error al actualizar contraseña.");
        } finally {
            this.setLoading(btn, false);
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const btn = e.target.querySelector('button');

        this.setLoading(btn, true);

        try {
            if (API_URL.includes("PLACEHOLDER")) {
                await new Promise(r => setTimeout(r, 1000));
                this.loginSuccess({ name: name, email: email, id: "demo" });
                return;
            }

            const res = await fetch(`${API_URL}?action=register&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}`, {
                method: 'POST'
            });
            const data = await res.json();

            if (data.status === 'success') {
                this.loginSuccess(data.user);
            } else {
                this.showError(data.message);
            }
        } catch (err) {
            this.showError("Error al registrarse.");
        } finally {
            this.setLoading(btn, false);
        }
    },

    async handleForgot(e) {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        const btn = e.target.querySelector('button');

        this.setLoading(btn, true);
        try {
            if (API_URL.includes("PLACEHOLDER")) {
                await new Promise(r => setTimeout(r, 1000));
                this.showMessage("Simulación: Correo enviado.", true);
                return;
            }

            const res = await fetch(`${API_URL}?action=forgot&email=${encodeURIComponent(email)}`, { method: 'POST' });
            const data = await res.json();

            if (data.status === 'success') {
                this.showMessage(data.message, true);
            } else {
                this.showError(data.message);
            }
        } catch (err) {
            this.showError("Error de comunicación.");
        } finally {
            this.setLoading(btn, false);
        }
    },

    loginSuccess(user) {
        this.user = user;
        localStorage.setItem('georadio_user', JSON.stringify(user));
        this.hideOverlay();
        // Check maintenance before letting them "in" fully (UI wise)
        this.verifyMaintenanceAccess();
    },

    logout() {
        this.user = null;
        this.pendingUser = null;
        localStorage.removeItem('georadio_user');
        this.showOverlay();
        this.toggleForms('login');
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: null } }));
    },

    showOverlay() {
        document.getElementById('auth-overlay').classList.remove('hidden');
    },

    hideOverlay() {
        const overlay = document.getElementById('auth-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.opacity = '1';
        }, 500);
    },

    setLoading(btn, isLoading) {
        if (isLoading) {
            btn.dataset.text = btn.innerText;
            btn.innerText = "Cargando...";
            btn.disabled = true;
        } else {
            btn.innerText = btn.dataset.text || "ENVIAR";
            btn.disabled = false;
        }
    },

    showError(msg) {
        const el = document.getElementById('auth-message');
        el.textContent = msg;
        el.classList.remove('hidden', 'success');
        el.classList.add('auth-message');
    },

    showMessage(msg, success = false) {
        const el = document.getElementById('auth-message');
        el.textContent = msg;
        el.classList.remove('hidden');
        if (success) el.classList.add('success');
    }
};
