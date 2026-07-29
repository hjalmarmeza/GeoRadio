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
        const linkReg = document.getElementById('link-register');
        if (linkReg) linkReg.onclick = (e) => { e.preventDefault(); this.toggleForms('register'); };
        
        const linkLogin = document.getElementById('link-login');
        if (linkLogin) linkLogin.onclick = (e) => { e.preventDefault(); this.toggleForms('login'); };
        
        const linkForgot = document.getElementById('link-forgot');
        if (linkForgot) linkForgot.onclick = (e) => { e.preventDefault(); this.toggleForms('forgot'); };
        
        const linkBack = document.getElementById('link-back-login');
        if (linkBack) linkBack.onclick = (e) => { e.preventDefault(); this.toggleForms('login'); };

        // Submits
        const formLogin = document.getElementById('form-login');
        if (formLogin) formLogin.onsubmit = (e) => this.handleLogin(e);
        
        const formReg = document.getElementById('form-register');
        if (formReg) formReg.onsubmit = (e) => this.handleRegister(e);
        
        const formForgot = document.getElementById('form-forgot');
        if (formForgot) formForgot.onsubmit = (e) => this.handleForgot(e);
        
        const formChange = document.getElementById('form-change-pass');
        if (formChange) formChange.onsubmit = (e) => this.handleChangePassword(e);

        // Password Toggles
        const toggleBtns = document.querySelectorAll('.btn-toggle-pass');
        toggleBtns.forEach(btn => {
            btn.onclick = () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('.material-icons-round');
                
                if (input && icon) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.textContent = 'visibility_off';
                    } else {
                        input.type = 'password';
                        icon.textContent = 'visibility';
                    }
                }
            };
        });
    },

    // --- IDLE TIMER (DISABLED) ---
    startIdleTimer() {
        // Disabled: Prevent automatic logout when backgrounded or locked.
        // this.stopIdleTimer();
        // this.idleTimer = setTimeout(() => { ... }, ...);
    },

    stopIdleTimer() {
        // Disabled
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
        if (msg) { msg.classList.add('hidden'); msg.className = 'auth-message hidden'; }

        if (login) login.classList.add('hidden');
        if (reg) reg.classList.add('hidden');
        if (forgot) forgot.classList.add('hidden');
        if (changePass) changePass.classList.add('hidden');

        if (view === 'login' && login) login.classList.remove('hidden');
        else if (view === 'register' && reg) reg.classList.remove('hidden');
        else if (view === 'forgot' && forgot) forgot.classList.remove('hidden');
        else if (view === 'change-pass' && changePass) changePass.classList.remove('hidden');
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
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        if (success) el.classList.add('success');
    }
};
