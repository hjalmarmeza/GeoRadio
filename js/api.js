const SERVERS = [
    'https://de1.api.radio-browser.info/json',
    'https://fr1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://nl1.api.radio-browser.info/json',
    'https://api.radio-browser.info/json'
];

let activeBaseUrl = SERVERS[0];

/**
 * Check which server is alive.
 */
async function resolveBaseUrl() {
    activeBaseUrl = 'https://de1.api.radio-browser.info/json';
    // Potential robust check logic here
}

resolveBaseUrl();

export async function getCountries() {
    try {
        const response = await fetch(`${activeBaseUrl}/countries?order=stationcount&reverse=true`);
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
    } catch (error) {
        console.error('getCountries failed:', error);
        return [];
    }
}

export async function getCities(countryName) {
    if (!countryName) return [];

    try {
        const url = `${activeBaseUrl}/stations/search?country=${encodeURIComponent(countryName)}&hidebroken=true&order=clickcount&reverse=true&limit=500`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Stations fetch failed');
        const stations = await response.json();

        const cityMap = new Map();
        stations.forEach(station => {
            let city = station.city || station.state || '';
            city = city.trim();
            if (city.length > 2) {
                city = city.charAt(0).toUpperCase() + city.slice(1);
                if (!cityMap.has(city)) {
                    cityMap.set(city, 1);
                } else {
                    cityMap.set(city, cityMap.get(city) + 1);
                }
            }
        });
        const citiesArray = Array.from(cityMap.entries()).map(([name, count]) => ({
            name: name,
            stationcount: count
        }));
        return citiesArray.sort((a, b) => b.stationcount - a.stationcount);
    } catch (error) {
        console.error('getCities fallback failed:', error);
        return [];
    }
}

export async function getStations(countryName, cityName, limit = 100) {
    try {
        let url = `${activeBaseUrl}/stations/search?country=${encodeURIComponent(countryName)}&hidebroken=true&order=clickcount&reverse=true&limit=${limit}`;
        if (cityName) {
            url += `&city=${encodeURIComponent(cityName)}`;
        }
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('getStations failed:', error);
        return [];
    }
}

/**
 * NEW: Get Top Trending Stations Globally
 */
export async function getTopStations(limit = 50) {
    try {
        const url = `${activeBaseUrl}/stations/search?hidebroken=true&order=clickcount&reverse=true&limit=${limit}`;
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('getTopStations failed:', error);
        return [];
    }
}
