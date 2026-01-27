/*
 * Manage Authentication State & API Calls
 */

// THIS URL WILL BE PROVIDED BY THE USER AFTER DEPLOYMENT
const API_URL = "https://script.google.com/macros/s/AKfycbx5mlnDM9-5PowY_sjxa91nQ4S73_mnPd6v-4N6uCUuXd5uIkFbbITCLseqvBjkjBVZ/exec";

export const Auth = {
    user: null,

    init() {
        // Check local storage
        const saved = localStorage.getItem('georadio_user');
        if (saved) {
            this.user = JSON.parse(saved);
            this.hideOverlay();
        } else {
            this.showOverlay();
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
    },

    toggleForms(view) {
        const login = document.getElementById('form-login');
        const reg = document.getElementById('form-register');
        const forgot = document.getElementById('form-forgot');

        const msg = document.getElementById('auth-message');
        msg.classList.add('hidden');
        msg.className = 'auth-message hidden';

        login.classList.add('hidden');
        reg.classList.add('hidden');
        forgot.classList.add('hidden');

        if (view === 'login') login.classList.remove('hidden');
        else if (view === 'register') reg.classList.remove('hidden');
        else if (view === 'forgot') forgot.classList.remove('hidden');
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const btn = e.target.querySelector('button');

        this.setLoading(btn, true);

        try {
            // If URL is placeholder, mock it for demo
            if (API_URL.includes("PLACEHOLDER")) {
                await new Promise(r => setTimeout(r, 1000));
                // Mock success
                this.loginSuccess({ name: "Usuario Demo", email: email, id: "demo" });
                return;
            }

            const res = await fetch(`${API_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}`, {
                method: 'POST' // Use POST to avoid sending pass in URL log, though GAS handles GET parameters easier sometimes. 
                // Actually standard GAS fetch usually sends data in payload. 
                // For simplicity with the provided script, we use GET parameters approach or POST payload.
                // Let's stick to the URL parameters for this simple setup as defined in Apps Script `e.parameter`.
            });

            const data = await res.json();

            if (data.status === 'success') {
                this.loginSuccess(data.user);
            } else {
                this.showError(data.message);
            }

        } catch (err) {
            console.error(err);
            // Fallback for demo if script fails (CORS issues commonly happen with GAS if not redirected properly)
            // Ideally we'd fix CORS.
            this.showError("Error de conexión con el servidor.");
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
    },

    logout() {
        this.user = null;
        localStorage.removeItem('georadio_user');
        this.showOverlay();
        this.toggleForms('login');
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
