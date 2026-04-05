import * as API from './api.js';
import { RadioPlayer } from './audio.js';
import { Storage } from './storage.js';
import { Auth } from './auth.js';

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.log('SW Failed', err));
    });
}

// --- MAINTENANCE & ADMIN LOGIC ---
const maint = {
    overlay: document.getElementById('maintenance-overlay'),
    btnBypass: document.getElementById('btn-admin-bypass'),

    init() {
        this.check();

        // Listen for changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'MAINTENANCE_MODE') {
                this.check();
            }
        });

        // 1. LOCAL POLLING REMOVED to save battery
        // 2. REMOTE POLLING REMOVED to save battery
        // Maintenance is now checked on init() and before starting any playback.

        // Listen for Auth changes
        window.addEventListener('auth-changed', () => {
            this.check();
            updateAdminUI();
        });

        // Secret Bypass
        if (this.btnBypass) {
            this.btnBypass.addEventListener('click', () => {
                this.overlay.classList.add('hidden');
                Auth.showOverlay();
            });
        }
    },

    check() {
        const isMaint = localStorage.getItem('MAINTENANCE_MODE') === 'true';
        const user = Auth.user;

        // Admin Bypass Logic
        const isAdmin = user && (user.isAdmin === true || (user.name && user.name.toLowerCase().includes('hjalmar')));

        if (isMaint) {
            if (isAdmin) {
                // Admin allowed: Hide Overlay but show Indicator
                this.overlay.classList.add('hidden');
                this.showAdminIndicator(true);
            } else if (!user) {
                // User NOT logged in: Hide Maintenance Overlay so they can Login
                this.overlay.classList.add('hidden');
                this.showAdminIndicator(false);
            } else {
                // User IS logged in but NOT Admin: Block Access
                this.overlay.classList.remove('hidden');
                this.showAdminIndicator(false);

                // Ensure video plays
                const vid = document.getElementById('maintenance-video');
                if (vid && vid.paused) vid.play().catch(e => console.log(e));
            }
        } else {
            this.overlay.classList.add('hidden');
            this.showAdminIndicator(false);
        }
    },

    showAdminIndicator(show) {
        let indicator = document.getElementById('admin-mode-indicator');
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'admin-mode-indicator';
                indicator.className = 'admin-badge';
                indicator.innerHTML = '<span class="material-icons-round" style="font-size:14px">lock_open</span> MODO MANTENIMIENTO (ADMIN)';
                document.body.appendChild(indicator);
            }
        } else {
            if (indicator) indicator.remove();
        }
    }
};

function updateAdminUI() {
    // Add Toggle Button to Sidebar if Admin
    const user = Auth.user;

    // Robust check: Check isAdmin boolean OR name 'Hjalmar'
    const isAdmin = user && (user.isAdmin === true || (user.name && user.name.toLowerCase().includes('hjalmar')));

    // Always try to find the existing button to remove it if not admin
    // Always try to find the existing button
    const btn = document.getElementById('btn-maint-toggle');

    if (isAdmin) {
        if (btn) {
            btn.classList.remove('hidden'); // Show it

            // Re-apply listener logic ensuring no duplicates
            btn.onclick = async () => {
                const current = localStorage.getItem('MAINTENANCE_MODE') === 'true';
                const newState = !current;

                // Optimistic Local Update
                localStorage.setItem('MAINTENANCE_MODE', newState);
                maint.check();
                updateAdminUI();

                // Send to Server
                const success = await API.setMaintenanceStatus(newState);
                if (!success) {
                    console.error("Failed to sync maintenance status with server");
                    alert("Error al sincronizar con el servidor. El cambio es solo local.");
                }
            };

            // Update State Visually (Simple Icon Style)
            const isMaint = localStorage.getItem('MAINTENANCE_MODE') === 'true';

            if (isMaint) {
                // Active (ON)
                btn.innerHTML = '<span class="material-icons-round">warning</span>';
                btn.style.color = '#ff0055'; // Red for Warning
                btn.title = "DESACTIVAR MANTENIMIENTO";
            } else {
                // Inactive (OFF)
                btn.innerHTML = '<span class="material-icons-round">build</span>';
                btn.style.color = 'var(--accent)'; // Normal Accent
                btn.title = "ACTIVAR MANTENIMIENTO";
            }

            // Clean up visual overrides to ensure transparency
            btn.className = 'btn-icon'; // Reset class to basic
            btn.style.background = 'transparent';
            btn.style.border = 'none';
            btn.style.boxShadow = 'none';
            btn.style.marginTop = '';
            btn.style.order = '';
            btn.classList.remove('hidden'); // Ensure visible
        }

    } else {
        if (btn) btn.classList.add('hidden'); // Hide if not admin
    }
}



// --- State ---
const state = {
    selectedCountry: null,
    selectedCity: null,
    stations: [],
    trends: [], // Cache for trends
    currentStation: null,
    currentView: 'explore', // 'explore', 'trends', 'favorites'
    isFiltersVisible: false // for mobile
};

// --- DOM Elements ---
// --- DOM Elements ---
const el = {
    countrySelect: document.getElementById('country-select'),
    btnFavCountry: document.getElementById('btn-fav-country'),
    citySelect: document.getElementById('city-select'),
    btnFavCity: document.getElementById('btn-fav-city'),
    cityGroup: document.getElementById('city-group'),
    stationsGrid: document.getElementById('stations-grid'),
    favoritesGrid: document.getElementById('favorites-grid'),
    trendsGrid: document.getElementById('trends-grid'),
    loader: document.getElementById('stations-loader'),
    searchInput: document.getElementById('station-search'),
    totalStations: document.getElementById('count-stations'),
    gridTitle: document.getElementById('grid-title'),
    searchWrap: document.querySelector('.search-wrap'),

    // Views
    viewExplore: document.getElementById('view-explore'),
    viewFavorites: document.getElementById('view-favorites'),
    viewTrends: document.getElementById('view-trends'),
    viewRecents: document.getElementById('view-history'),
    filtersPanel: document.getElementById('filters-panel'),

    // Layout
    contentWrapper: document.querySelector('.content-wrapper'), // To help mobile layout if needed

    // Nav Items (using querySelector with attribute for mobile/sidebar consistency)
    navExplore: document.querySelector('[data-view="explore"]'),
    navFavorites: document.querySelector('[data-view="favorites"]'),
    navTrends: document.querySelector('[data-view="trends"]'),
    navRecents: document.querySelector('[data-view="history"]'),
    navFilterToggle: document.getElementById('btn-mobile-filters'), // The 'Filtros' tab

    // Player
    playerStationName: document.getElementById('player-station-name'),
    playerStatus: document.getElementById('player-status'),
    playerLogo: document.getElementById('player-logo'),
    btnPlay: document.getElementById('btn-play-toggle'),
    btnSleep: document.getElementById('btn-sleep'),
    btnPlayerWhatsapp: document.getElementById('btn-player-whatsapp'),
    playIcon: document.getElementById('play-icon'),
    volumeSlider: document.getElementById('volume-slider'),

    // Sidebar specifically
    btnViewRecents: document.getElementById('btn-view-recents'),

    // Modals
    timerModal: document.getElementById('modal-sleep'),
    btnCloseTimer: document.getElementById('btn-close-sleep'),
    timerOptions: document.querySelectorAll('.btn-sleep-opt'),

    // Visualizer & Visual Effects
    visualizerCanvas: document.getElementById('visualizer-canvas'),
    btnCloseFilters: document.getElementById('btn-close-filters')
};

// --- Player Instance ---
const player = new RadioPlayer();

// --- Initialization ---
async function init() {
    Auth.init(); // Initialize Auth System
    maint.init(); // Initialize Maintenance System
    updateAdminUI(); // Check if admin UI needed
    setTimeout(updateAdminUI, 1000); // Fail-safe re-check for DOM/Auth timing
    applyTheme(Storage.getTheme()); // Apply saved theme

    setupEventListeners();
    setupPlayerCallbacks();

    // Init Visualizer
    if (typeof player.startVisualizer === 'function') {
        player.startVisualizer(el.visualizerCanvas);
    }

    // Load Countries
    showLoader(true);
    const countries = await API.getCountries();
    populateSelect(el.countrySelect, countries.map(c => c.name), "Selecciona...", 'country');
    showLoader(false);

    // Initial view: show filters if on mobile
    if (window.innerWidth <= 768) {
        toggleFilters(true);
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Country Change
    el.countrySelect.addEventListener('change', async (e) => {
        const country = e.target.value;
        state.selectedCountry = country;

        // Ensure we are in Explore mode but DO NOT reset grid yet
        // This keeps the user on the filter screen (especially mobile)
        if (state.currentView !== 'explore') {
            switchView('explore');
        }

        // Reset City (but keep Country selected)
        // Update Fav Button
        updateFavCountryButton(country);

        el.citySelect.innerHTML = '<option value="" disabled selected>Cargando ciudades...</option>';
        el.citySelect.disabled = true;
        el.cityGroup.classList.add('disabled');

        // DO NOT clear stations grid here yet. Wait for city selection.
        // state.stations = []; 
        // renderCurrentView(); 

        // Show loader only inside the select? No, just wait.
        // actually we can show loader briefly for cities
        // showLoader(true); 

        const cities = await API.getCities(country);
        populateSelect(el.citySelect, cities.map(c => c.name), "Selecciona ciudad...", 'city', country);

        el.citySelect.disabled = false;
        el.cityGroup.classList.remove('disabled');

        // Reset and disable search until city is picked
        toggleSearch(false);
        el.searchInput.value = '';
        // showLoader(false);
        // Reset city favorite button
        updateFavCityButton(null);
    });

    // City Change
    el.citySelect.addEventListener('change', async (e) => {
        const city = e.target.value;
        state.selectedCity = city;

        updateFavCityButton(city); // Update Star

        if (window.innerWidth <= 768) {
            toggleFilters(false);
        }

        loadStations(state.selectedCountry, city);
    });

    // Search Filter
    el.searchInput.addEventListener('input', (e) => {
        const term = normalizeText(e.target.value);

        if (state.currentView === 'explore') {
            const filtered = state.stations.filter(s => normalizeText(s.name).includes(term));
            renderStationsList(el.stationsGrid, filtered);
        } else if (state.currentView === 'favorites') {
            const favs = Storage.getFavoriteStations();
            const filtered = favs.filter(s => normalizeText(s.name).includes(term));
            renderStationsList(el.favoritesGrid, filtered);
        } else if (state.currentView === 'trends') {
            const filtered = state.trends.filter(s => normalizeText(s.name).includes(term));
            renderStationsList(el.trendsGrid, filtered);
        }
    });

    // Player Controls
    if (el.btnPlay) el.btnPlay.addEventListener('click', () => player.toggle());
    if (el.volumeSlider) {
        el.volumeSlider.addEventListener('input', (e) => player.setVolume(parseFloat(e.target.value)));
        player.setVolume(parseFloat(el.volumeSlider.value)); // Initialize volume on load
    }

    // Navigation
    if (el.navExplore) el.navExplore.addEventListener('click', () => switchView('explore'));
    if (el.navFavorites) el.navFavorites.addEventListener('click', () => switchView('favorites'));
    if (el.navTrends) el.navTrends.addEventListener('click', () => switchView('trends'));
    if (el.navFilterToggle) el.navFilterToggle.addEventListener('click', () => toggleFilters());
    if (el.btnCloseFilters) el.btnCloseFilters.addEventListener('click', () => toggleFilters(false));

    // Fav Country Click
    if (el.btnFavCountry) {
        el.btnFavCountry.addEventListener('click', () => {
            const country = el.countrySelect.value;
            if (!country) return;

            const added = Storage.toggleFavoriteCountry(country);
            updateFavCountryButton(country);
        });
    }

    // Fav City Click
    if (el.btnFavCity) {
        el.btnFavCity.addEventListener('click', () => {
            const city = el.citySelect.value;
            const country = state.selectedCountry;
            if (!city || !country) return;

            Storage.toggleFavoriteCity({ name: city, country: country });
            updateFavCityButton(city);
        });
    }

    // --- Timer Logic ---
    if (el.btnSleep && el.timerModal && el.btnCloseTimer) {
        el.btnSleep.addEventListener('click', () => {
            el.timerModal.classList.remove('hidden');
        });

        el.btnCloseTimer.addEventListener('click', () => {
            el.timerModal.classList.add('hidden');
        });

        // Re-query options within the context or use the pre-defined ones
        // Using el.timerOptions if it was queried after DOM ready (module does this)
        el.timerOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                const mins = parseInt(btn.dataset.min);
                if (mins === 0) {
                    player.cancelSleepTimer();
                    el.btnSleep.classList.remove('active');
                } else {
                    player.startSleepTimer(mins);
                    el.btnSleep.classList.add('active');
                }
                el.timerModal.classList.add('hidden');
            });
        });
    }
}

// New Sidebar Buttons
if (el.btnViewRecents) {
    el.btnViewRecents.addEventListener('click', () => {
        switchView('history');
        toggleFilters(false);
    });
}

// Themes logic
const toggleTheme = () => {
    const currentCheck = Storage.getTheme();
    const themes = ['cyan', 'purple', 'gold', 'neon_green'];
    let idx = themes.indexOf(currentCheck);
    idx = (idx + 1) % themes.length;
    const newTheme = themes[idx];
    applyTheme(newTheme);
    Storage.setTheme(newTheme);
};

if (el.btnThemeToggle) {
    el.btnThemeToggle.addEventListener('click', toggleTheme);
}

const btnThemeMobile = document.getElementById('btn-theme-toggle-mobile');
if (btnThemeMobile) {
    btnThemeMobile.addEventListener('click', toggleTheme);
}

// Zen Mode Toggle
const btnZenMode = document.getElementById('btn-zen-mode');
if (btnZenMode) {
    btnZenMode.addEventListener('click', () => {
        document.body.classList.toggle('immersive-mode');
    });
}

// Logout
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        Auth.logout();
        toggleFilters(false); // Close drawer
    });
}

// --- Logic ---
async function loadStations(country, city) {
    if (el.gridTitle) el.gridTitle.textContent = city + ", " + country;
    showLoader(true);

    const stations = await API.getStations(country, city);
    state.stations = stations;

    if (el.totalStations) el.totalStations.textContent = stations.length;
    renderCurrentView();
    showLoader(false);

    // Enable search if we have stations, or at least enable the input to allow zero-result awareness if desired.
    // User asked to activate it "after selected country and city".
    toggleSearch(true);
}

async function loadTrends() {
    // If country selected, show top for country
    showLoader(true);
    let trends = [];
    let title = 'Top Global';

    if (state.selectedCountry) {
        title = `Top 10 en ${state.selectedCountry}`;
        trends = await API.getTopCountryStations(state.selectedCountry, 10);

        // Fallback if no country stations found (some countries might return 0)
        if (!trends || trends.length === 0) {
            console.log("No top stations for country, falling back to global");
            title = `Top Global (No se encontraron datos para ${state.selectedCountry})`;
            trends = await API.getTopStations(50);
        }
    } else {
        title = 'Top Global (Selecciona un país para ver el suyo)';
        trends = await API.getTopStations(50);
    }

    el.gridTitle.textContent = title;
    state.trends = trends;
    renderStationsList(el.trendsGrid, trends);
    showLoader(false);
}

function switchView(viewName) {
    state.currentView = viewName;

    // Update Nav UI
    const isMobile = window.innerWidth <= 768;

    if (el.navExplore) el.navExplore.classList.toggle('active', viewName === 'explore');
    if (el.navFavorites) el.navFavorites.classList.toggle('active', viewName === 'favorites');
    if (el.navTrends) el.navTrends.classList.toggle('active', viewName === 'trends');
    if (el.navRecents) el.navRecents.classList.toggle('active', viewName === 'history');
    
    // Default hiding
    if (el.viewExplore) el.viewExplore.classList.add('hidden');
    if (el.viewFavorites) el.viewFavorites.classList.add('hidden');
    if (el.viewTrends) el.viewTrends.classList.add('hidden');
    if (el.viewRecents) el.viewRecents.classList.add('hidden');

    // Update Content UI & Logic
    if (viewName === 'explore' && el.viewExplore) {
        el.viewExplore.classList.remove('hidden');

        // Restore title or default
        if (state.selectedCity) {
            el.gridTitle.textContent = `${state.selectedCity}, ${state.selectedCountry}`;
        } else {
            el.gridTitle.textContent = 'Explora el mundo';
        }

        if (state.stations && state.stations.length > 0) {
            const term = el.searchInput ? el.searchInput.value : '';
            if (term) {
                const filtered = state.stations.filter(s => normalizeText(s.name).includes(normalizeText(term)));
                renderStationsList(el.stationsGrid, filtered);
            } else {
                renderStationsList(el.stationsGrid, state.stations);
            }
            toggleSearch(true);
        } else {
            renderStationsList(el.stationsGrid, []);
            toggleSearch(false);
        }
    } else if (viewName === 'favorites') {
        if (el.viewFavorites) el.viewFavorites.classList.remove('hidden');
        if (el.gridTitle) el.gridTitle.textContent = 'Mis Favoritos';
        loadFavorites();
    } else if (viewName === 'trends') {
        if (el.viewTrends) el.viewTrends.classList.remove('hidden');
        if (el.gridTitle) el.gridTitle.textContent = 'Top 50 Global';
        loadTrends();
    } else if (viewName === 'history') { 
        if (el.viewRecents) el.viewRecents.classList.remove('hidden');
        if (el.gridTitle) el.gridTitle.textContent = 'Escuchado Recientemente';
        loadRecents();
    }

    // Handle Filters Drawer vs Content
    if (isMobile) {
        // Only auto-open on init if country missing. 
        // If clicking Explorar explicitly, we stay there unless we decide otherwise.
        // For now, toggleFilters(false) to ensure content is visible.
        toggleFilters(false);
    }
}

function loadFavorites() {
    const favs = Storage.getFavoriteStations();
    renderStationsList(el.favoritesGrid, favs, true);
}

function loadRecents() {
    const recents = Storage.getRecents();
    renderStationsList(el.recentsGrid, recents);
}

function toggleFilters(forceState) {
    const newState = forceState !== undefined ? forceState : !state.isFiltersVisible;
    state.isFiltersVisible = newState;
    
    const isMobile = window.innerWidth <= 768;

    if (newState) {
        el.filtersPanel.classList.add('active');
        if (isMobile) {
            el.filtersPanel.style.display = 'flex';
            // EXCLUSIVE: Highlight Filters, deactivate others
            if (el.navFilterToggle) el.navFilterToggle.classList.add('active');
            if (el.navExplore) el.navExplore.classList.remove('active');
            if (el.navFavorites) el.navFavorites.classList.remove('active');
            if (el.navTrends) el.navTrends.classList.remove('active');
        } else {
            // Desktop behavior
            if (el.navFilterToggle) el.navFilterToggle.classList.add('active');
        }
    } else {
        el.filtersPanel.classList.remove('active');
        if (isMobile) {
            el.filtersPanel.style.display = 'none';
            // RESTORE HIGHLIGHT of the actual view we are in
            if (el.navFilterToggle) el.navFilterToggle.classList.remove('active');
            if (el.navExplore) el.navExplore.classList.toggle('active', state.currentView === 'explore');
            if (el.navFavorites) el.navFavorites.classList.toggle('active', state.currentView === 'favorites');
            if (el.navTrends) el.navTrends.classList.toggle('active', state.currentView === 'trends');
            if (el.navRecents) el.navRecents.classList.toggle('active', state.currentView === 'history');
        } else {
            if (el.navFilterToggle) el.navFilterToggle.classList.remove('active');
            if (state.currentView === 'explore') {
                el.filtersPanel.style.display = 'flex';
            }
        }
    }
}

function renderCurrentView() {
    if (state.currentView === 'explore') {
        renderStationsList(el.stationsGrid, state.stations);
    } else if (state.currentView === 'favorites') {
        loadFavorites();
    } else if (state.currentView === 'trends') {
        loadTrends();
    }
}

function renderStationsList(container, stations, isFavView = false) {
    if (!container) return;
    container.innerHTML = '';

    if (!stations || stations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round">${isFavView ? 'favorite_border' : 'signal_wifi_off'}</span>
                <p>${isFavView ? 'Aún no tienes favoritos.' : 'No se encontraron emisoras.'}</p>
            </div>
        `;
        return;
    }

    stations.forEach(station => {
        const card = document.createElement('div');
        card.className = 'station-card';

        // Check if favorite
        const isFav = Storage.isFavoriteStation(station.stationuuid);

        const logoUrl = station.favicon || '';

        card.innerHTML = `
            <div class="card-actions">
                ${station.whatsapp ? `
                <button class="btn-whatsapp" onclick="event.stopPropagation(); window.open('https://wa.me/${station.whatsapp}', '_blank')">
                    <span class="material-icons-round">chat</span>
                </button>` : ''}
                <button class="btn-fav ${isFav ? 'active' : ''}" data-id="${station.stationuuid}">
                    <span class="material-icons-round">${isFav ? 'favorite' : 'favorite_border'}</span>
                </button>
            </div>
            <img src="${logoUrl}" class="station-logo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(station.name)}&background=00f3ff&color=000'">
            <div class="station-name">${station.name}</div>
            <div class="station-tags">${station.tags ? station.tags.split(',').slice(0, 2).join(', ') : 'FM'}</div>
        `;

        // Click on card plays
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-fav')) return;
            playStation(station);
        });

        // Click on heart
        const btnFav = card.querySelector('.btn-fav');
        btnFav.addEventListener('click', (e) => {
            e.stopPropagation();
            const added = Storage.toggleFavoriteStation(station);

            if (added) {
                btnFav.classList.add('active');
                btnFav.querySelector('span').textContent = 'favorite';
            } else {
                btnFav.classList.remove('active');
                btnFav.querySelector('span').textContent = 'favorite_border';
                if (isFavView) {
                    card.remove();
                    if (container.children.length === 0) renderStationsList(container, [], true);
                }
            }
        });

        container.appendChild(card);
    });
}

async function playStation(station) {
    // Local-only maintenance check (no network call that can block)
    const isMaint = localStorage.getItem('MAINTENANCE_MODE') === 'true';
    if (isMaint) {
        maint.check();
        if (!document.getElementById('maintenance-overlay').classList.contains('hidden')) return;
    }

    state.currentStation = station;

    // Expand player bar
    const playerBar = document.getElementById('player-bar');
    if (playerBar) playerBar.classList.add('active');

    // Update UI with null guards
    if (el.playerStationName) el.playerStationName.textContent = station.name;
    if (el.playerStatus) {
        el.playerStatus.textContent = "Conectando...";
        el.playerStatus.style.color = "var(--primary)";
    }

    if (el.playerLogo) {
        if (station.favicon) {
            el.playerLogo.innerHTML = `<img src="${station.favicon}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;" onerror="this.parentElement.innerHTML='<span class=\\'material-icons-round\\'>radio</span>'">`;
        } else {
            el.playerLogo.innerHTML = `<span class="material-icons-round">radio</span>`;
        }
    }

    // Update WhatsApp Button in Player
    if (el.btnPlayerWhatsapp) {
        if (station.whatsapp) {
            el.btnPlayerWhatsapp.style.display = '';
            el.btnPlayerWhatsapp.onclick = () => window.open(`https://wa.me/${station.whatsapp}`, '_blank');
        } else {
            el.btnPlayerWhatsapp.style.display = 'none';
            el.btnPlayerWhatsapp.onclick = null;
        }
    }

    if (el.btnPlay) el.btnPlay.disabled = false;

    // Play
    try {
        Storage.addRecent(station); // Add to history
    } catch(e) { /* storage may fail */ }
    
    player.play(station.url_resolved || station.url);

    // Stop Idle Timer because we are listening
    Auth.stopIdleTimer();
}

// --- Player Callbacks ---
function setupPlayerCallbacks() {
    player.onPlay = () => {
        if (el.playerStatus) { el.playerStatus.textContent = "Reproduciendo"; el.playerStatus.style.color = "#0f0"; }
        if (el.playIcon) el.playIcon.textContent = "pause";
        if (el.btnPlay) el.btnPlay.classList.add('playing');
    };

    player.onPause = () => {
        if (el.playerStatus) { el.playerStatus.textContent = "Pausado"; el.playerStatus.style.color = "var(--text-muted)"; }
        if (el.playIcon) el.playIcon.textContent = "play_arrow";
        if (el.btnPlay) el.btnPlay.classList.remove('playing');
        Auth.startIdleTimer();
    };

    player.onError = () => {
        if (el.playerStatus) { el.playerStatus.textContent = "Error de conexión"; el.playerStatus.style.color = "var(--accent)"; }
        if (el.playIcon) el.playIcon.textContent = "error_outline";
        Auth.startIdleTimer();
    };

    player.onLoadStart = () => {
        if (el.playerStatus) el.playerStatus.textContent = "Buffering...";
        Auth.stopIdleTimer();
    };

    player.onTimerEnd = () => {
        if (el.playerStatus) { el.playerStatus.textContent = "Zzz... (Sleep)"; el.playerStatus.style.color = "var(--secondary)"; }
        if (el.btnSleep) el.btnSleep.classList.remove('active');
        Auth.startIdleTimer();
    };
}

// --- Helpers ---
function populateSelect(selectElement, items, defaultText = "Selecciona...", mode = null, context = null) {
    selectElement.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;
    let unique = [...new Set(items)];

    if (mode === 'country') {
        const favs = Storage.getFavoriteCountries();
        unique.sort((a, b) => {
            const isFavA = favs.includes(a);
            const isFavB = favs.includes(b);
            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;
            return a.localeCompare(b);
        });
    } else if (mode === 'city' && context) {
        // Sort favorite cities to top
        const allFavs = Storage.getFavoriteCities(); // [{name, country}, ...]
        // Filter favs for this country
        const countryFavs = allFavs.filter(f => f.country === context).map(f => f.name);

        unique.sort((a, b) => {
            const isFavA = countryFavs.includes(a);
            const isFavB = countryFavs.includes(b);
            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;
            return a.localeCompare(b);
        });
    } else {
        unique.sort();
    }

    unique.forEach(item => {
        const option = document.createElement('option');
        option.value = item;

        let label = item;
        if (mode === 'country' && Storage.isFavoriteCountry(item)) label = '⭐ ' + item;
        if (mode === 'city' && context && Storage.isFavoriteCity(item, context)) label = '⭐ ' + item;

        option.textContent = label;
        selectElement.appendChild(option);
    });
}

function showLoader(show) {
    if (el.loader) {
        if (show) {
            el.loader.classList.remove('hidden');
        } else {
            el.loader.classList.add('hidden');
        }
    }
}

function toggleSearch(enable) {
    if (enable) {
        el.searchWrap.classList.remove('disabled');
        el.searchInput.disabled = false;
    } else {
        el.searchWrap.classList.add('disabled');
        el.searchInput.disabled = true;
    }
}

function normalizeText(text) {
    if (!text) return '';
    return text.toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function updateFavCountryButton(countryName) {
    if (!el.btnFavCountry) return;

    // Show button only if country selected
    if (!countryName) {
        el.btnFavCountry.classList.add('hidden');
        return;
    }
    el.btnFavCountry.classList.remove('hidden');

    const isFav = Storage.isFavoriteCountry(countryName);
    const icon = el.btnFavCountry.querySelector('span');

    if (isFav) {
        el.btnFavCountry.classList.add('active');
        icon.textContent = 'star';
    } else {
        el.btnFavCountry.classList.remove('active');
        icon.textContent = 'star_border';
    }
}

function updateFavCityButton(cityName) {
    if (!el.btnFavCity) return;

    if (!cityName || !state.selectedCountry) {
        el.btnFavCity.classList.add('hidden');
        return;
    }
    el.btnFavCity.classList.remove('hidden');

    const isFav = Storage.isFavoriteCity(cityName, state.selectedCountry);
    const icon = el.btnFavCity.querySelector('span');

    if (isFav) {
        el.btnFavCity.classList.add('active');
        icon.textContent = 'star';
    } else {
        el.btnFavCity.classList.remove('active');
        icon.textContent = 'star_border';
    }
}

// --- Themes ---
function applyTheme(themeName) {
    const root = document.documentElement;
    const themes = {
        cyan: { primary: '#00f3ff', secondary: '#bc13fe', accent: '#ff0055' },
        purple: { primary: '#d946ef', secondary: '#8b5cf6', accent: '#06b6d4' },
        gold: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#ea580c' },
        neon_green: { primary: '#39ff14', secondary: '#ccff00', accent: '#ff00cc' }
    };

    const t = themes[themeName] || themes['cyan'];
    root.style.setProperty('--primary', t.primary);
    root.style.setProperty('--secondary', t.secondary);
    root.style.setProperty('--accent', t.accent);
}

// Start
init();
