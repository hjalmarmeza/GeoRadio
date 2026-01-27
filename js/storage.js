const KEYS = {
    FAV_STATIONS: 'neon_fav_stations',
    FAV_CITIES: 'neon_fav_cities'
};

export const Storage = {
    // --- Stations ---
    getFavoriteStations() {
        const data = localStorage.getItem(KEYS.FAV_STATIONS);
        return data ? JSON.parse(data) : [];
    },

    isFavoriteStation(stationId) {
        const favs = this.getFavoriteStations();
        return favs.some(s => s.stationuuid === stationId);
    },

    toggleFavoriteStation(station) {
        let favs = this.getFavoriteStations();
        const existingIndex = favs.findIndex(s => s.stationuuid === station.stationuuid);

        if (existingIndex >= 0) {
            // Remove
            favs.splice(existingIndex, 1);
        } else {
            // Add (limit to essentials)
            favs.push({
                stationuuid: station.stationuuid,
                name: station.name,
                url: station.url,
                url_resolved: station.url_resolved,
                favicon: station.favicon,
                tags: station.tags
            });
        }
        localStorage.setItem(KEYS.FAV_STATIONS, JSON.stringify(favs));
        return existingIndex === -1; // returns true if added
    },

    // --- Cities ---
    getFavoriteCities() {
        const data = localStorage.getItem(KEYS.FAV_CITIES);
        return data ? JSON.parse(data) : [];
    },

    toggleFavoriteCity(cityObj) { // { name, country }
        let favs = this.getFavoriteCities();
        // Use composite key Name+Country
        const existingIndex = favs.findIndex(c => c.name === cityObj.name && c.country === cityObj.country);

        if (existingIndex >= 0) {
            favs.splice(existingIndex, 1);
        } else {
            favs.push(cityObj);
        }
        localStorage.setItem(KEYS.FAV_CITIES, JSON.stringify(favs));
        return existingIndex === -1;
    },

    isFavoriteCity(cityName, countryName) {
        const favs = this.getFavoriteCities();
        return favs.some(c => c.name === cityName && c.country === countryName);
    }
};
