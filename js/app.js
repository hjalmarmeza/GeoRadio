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
const el = {
    countrySelect: document.getElementById('country-select'),
    citySelect: document.getElementById('city-select'),
    cityGroup: document.getElementById('city-group'),
    stationsGrid: document.getElementById('stations-grid'),
    favoritesGrid: document.getElementById('favorites-grid'),
    trendsGrid: document.getElementById('trends-grid'), // New Grid
    loader: document.getElementById('loader'),
    searchInput: document.getElementById('station-search'),
    totalStations: document.getElementById('total-stations'),
    gridTitle: document.getElementById('grid-title'),

    // Views
    viewExplore: document.getElementById('view-explore'),
    viewFavorites: document.getElementById('view-favorites'),
    viewTrends: document.getElementById('view-trends'), // New View
    filtersPanel: document.getElementById('filters-panel'),

    // Player
    playerStationName: document.getElementById('player-station-name'),
    playerStatus: document.getElementById('player-status'),
    playerLogo: document.getElementById('player-logo'),
    btnPlay: document.getElementById('btn-play-toggle'),
    btnSleep: document.getElementById('btn-sleep'), // New Btn
    playIcon: document.getElementById('play-icon'),
    volumeSlider: document.getElementById('volume-slider'),

    // Nav
    navExplore: document.getElementById('nav-explore'),
    navFavorites: document.getElementById('nav-favorites'),
    navTrends: document.getElementById('nav-trends'), // New Nav
    navFilterToggle: document.getElementById('nav-filter-toggle'),

    // Modals
    timerModal: document.getElementById('timer-modal'),
    btnCloseTimer: document.getElementById('btn-close-timer'),
    timerOptions: document.querySelectorAll('.btn-timer')
};

// --- Player Instance ---
const player = new RadioPlayer();

// --- Initialization ---
async function init() {
    Auth.init(); // Initialize Auth System

    setupEventListeners();
    setupPlayerCallbacks();

    // Load Countries
    showLoader(true);
    const countries = await API.getCountries();
    populateSelect(el.countrySelect, countries.map(c => c.name));
    showLoader(false);
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
        populateSelect(el.citySelect, cities.map(c => c.name), "Selecciona ciudad...");

        el.citySelect.disabled = false;
        el.cityGroup.classList.remove('disabled');
        // showLoader(false);
    });

    // City Change
    el.citySelect.addEventListener('change', async (e) => {
        const city = e.target.value;
        state.selectedCity = city;

        if (window.innerWidth <= 768) {
            toggleFilters(false);
        }

        loadStations(state.selectedCountry, city);
    });

    // Search Filter
    el.searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        if (state.currentView === 'explore') {
            const filtered = state.stations.filter(s => s.name.toLowerCase().includes(term));
            renderStationsList(el.stationsGrid, filtered);
        } else if (state.currentView === 'favorites') {
            const favs = Storage.getFavoriteStations();
            const filtered = favs.filter(s => s.name.toLowerCase().includes(term));
            renderStationsList(el.favoritesGrid, filtered);
        } else if (state.currentView === 'trends') {
            const filtered = state.trends.filter(s => s.name.toLowerCase().includes(term));
            renderStationsList(el.trendsGrid, filtered);
        }
    });

    // Player Controls
    el.btnPlay.addEventListener('click', () => {
        player.toggle();
    });

    el.volumeSlider.addEventListener('input', (e) => {
        player.setVolume(e.target.value);
    });

    // Navigation
    if (el.navExplore) {
        el.navExplore.addEventListener('click', () => switchView('explore'));
        el.navFavorites.addEventListener('click', () => switchView('favorites'));
        el.navTrends.addEventListener('click', () => switchView('trends'));
        el.navFilterToggle.addEventListener('click', () => toggleFilters());
    }

    // Timer Logic
    el.btnSleep.addEventListener('click', () => {
        el.timerModal.classList.remove('hidden');
    });

    el.btnCloseTimer.addEventListener('click', () => {
        el.timerModal.classList.add('hidden');
    });

    el.timerOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mins = parseInt(e.target.dataset.time);
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

// --- Logic ---
async function loadStations(country, city) {
    el.gridTitle.textContent = city + ", " + country;
    showLoader(true);

    const stations = await API.getStations(country, city);
    state.stations = stations;

    el.totalStations.textContent = stations.length;
    renderCurrentView();
    showLoader(false);
}

async function loadTrends() {
    if (state.trends.length > 0) {
        renderStationsList(el.trendsGrid, state.trends);
        return;
    }

    showLoader(true);
    const trends = await API.getTopStations(50);
    state.trends = trends;
    renderStationsList(el.trendsGrid, trends);
    showLoader(false);
}

function switchView(viewName) {
    state.currentView = viewName;

    // Update Nav UI
    el.navExplore.classList.toggle('active', viewName === 'explore');
    el.navFavorites.classList.toggle('active', viewName === 'favorites');
    el.navTrends.classList.toggle('active', viewName === 'trends');

    // Default hiding
    el.viewExplore.classList.add('hidden');
    el.viewFavorites.classList.add('hidden');
    el.viewTrends.classList.add('hidden');

    // Update Content UI & Logic
    if (viewName === 'explore') {
        el.viewExplore.classList.remove('hidden');
        el.gridTitle.textContent = state.selectedCity ? `${state.selectedCity}, ${state.selectedCountry}` : 'Explora el mundo';
        renderStationsList(el.stationsGrid, state.stations); // Re-render to ensure state
    } else if (viewName === 'favorites') {
        el.viewFavorites.classList.remove('hidden');
        el.gridTitle.textContent = 'Mis Favoritos';
        loadFavorites();
    } else if (viewName === 'trends') {
        el.viewTrends.classList.remove('hidden');
        el.gridTitle.textContent = 'Top 50 Global';
        loadTrends();
    }

    toggleFilters(false);
}

function loadFavorites() {
    const favs = Storage.getFavoriteStations();
    renderStationsList(el.favoritesGrid, favs, true);
}

function toggleFilters(forceState) {
    const newState = forceState !== undefined ? forceState : !state.isFiltersVisible;
    state.isFiltersVisible = newState;

    if (newState) {
        el.filtersPanel.style.display = 'flex';
        el.navFilterToggle.classList.add('active');
    } else {
        if (window.innerWidth <= 768) {
            el.filtersPanel.style.display = 'none';
        } else {
            el.filtersPanel.style.display = 'flex';
        }
        el.navFilterToggle.classList.remove('active');
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

function playStation(station) {
    state.currentStation = station;

    // Update UI
    el.playerStationName.textContent = station.name;
    el.playerStatus.textContent = "Conectando...";
    el.playerStatus.style.color = "var(--primary)";

    if (station.favicon) {
        el.playerLogo.innerHTML = `<img src="${station.favicon}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;">`;
    } else {
        el.playerLogo.innerHTML = `<span class="material-icons-round">radio</span>`;
    }

    el.btnPlay.disabled = false;

    // Play
    player.play(station.url_resolved || station.url);
}

// --- Player Callbacks ---
function setupPlayerCallbacks() {
    player.onPlay = () => {
        el.playerStatus.textContent = "Reproduciendo";
        el.playerStatus.style.color = "#0f0"; // Greenish
        el.playIcon.textContent = "pause";
        el.btnPlay.classList.add('playing');
    };

    player.onPause = () => {
        el.playerStatus.textContent = "Pausado";
        el.playerStatus.style.color = "var(--text-muted)";
        el.playIcon.textContent = "play_arrow";
        el.btnPlay.classList.remove('playing');
    };

    player.onError = () => {
        el.playerStatus.textContent = "Error de conexión";
        el.playerStatus.style.color = "var(--accent)";
        el.playIcon.textContent = "error_outline";
    };

    player.onLoadStart = () => {
        el.playerStatus.textContent = "Buffering...";
    };

    player.onTimerEnd = () => {
        el.playerStatus.textContent = "Zzz... (Sleep)";
        el.playerStatus.style.color = "var(--secondary)";
        el.btnSleep.classList.remove('active');
    };
}

// --- Helpers ---
function populateSelect(selectElement, items, defaultText = "Selecciona...") {
    selectElement.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;
    const unique = [...new Set(items)].sort();
    unique.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
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

// Start
init();
