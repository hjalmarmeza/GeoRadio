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

// --- WHATSAPP DIRECTORY (Local Override) ---
const WHATSAPP_DIRECTORY = {
    // Format: 'Station Name': 'Phone Number' (International format without +)
    // Spain
    'Los 40 Principales': '34626196799', // LOS40 Urban
    'Kiss FM': '34606388224', // Music Box
    'Europa FM': '34682525252', // Me Pones
    'MegaStar FM': '34900100016',

    // Argentina
    'Radio Disney': '541122779430',
    'Radio Mitre': '5491130030790', // Radio Mitre Buenos Aires

    // Peru
    'Radio Moda': '51993505506',
    'RPP Noticias': '51999001800',
    'Radio RPP Noticias': '51999001800', // Exact API match
    '320f8ba3-2d7b-422c-af88-09b0b526eca5': '51999001800', // RPP UUID (Definitive)
    'Radio Exitosa': '51940800800',
    'Radio Planeta': '51943748745',
    'Ritmo Romántica': '51958938400',
    'Radio Románticas Inolvidables (FMLima)': '51938239747', // La Inolvidable
    'Boleros Inolvidables (FMLima)': '51938239747', // La Inolvidable
    'La Inolvidable': '51938239747', // Fallback for fuzzy match
    'Radiomar': '51984123251',
    'Radio Nueva Q': '51920139996',
    'Radio Mágica 88.3 FM': '51945194220', // Exact match
    'Radio Mágica': '51945194220', // Fallback
    'Radio Inca': '51958731870',
    'Radio Inca Sat': '51958731870',

    // USA
    'Mega 97.9': '12123159790', // WSKQ-FM New York
    // Many US stations use SMS shortcodes (e.g. Z100 is 55100), not WhatsApp.

    // Add more here manually as needed
};

function enrichWithWhatsApp(stations) {
    return stations.map(station => {
        // MATCHING LOGIC:
        // Check exact match first, then partial match if needed.
        // We iterate over the directory keys to find if the station name includes the key.
        let wa = null;

        // Direct Map Check (Fastest)
        if (WHATSAPP_DIRECTORY[station.name]) {
            wa = WHATSAPP_DIRECTORY[station.name];
        }
        // UUID Check
        else if (WHATSAPP_DIRECTORY[station.stationuuid]) {
            wa = WHATSAPP_DIRECTORY[station.stationuuid];
        }
        // Partial Name Check (Case Insensitive - More flexible)
        else {
            for (const [key, num] of Object.entries(WHATSAPP_DIRECTORY)) {
                // Skip if key is a UUID (approx check) to avoid false text matches
                if (key.length > 30 && key.includes('-')) continue;

                if (station.name.toLowerCase().includes(key.toLowerCase())) {
                    wa = num;
                    break;
                }
            }
        }

        if (wa) {
            return { ...station, whatsapp: wa };
        }

        return station;
    });
}

export async function getTopStations(limit = 50) {
    try {
        const url = `${activeBaseUrl}/stations/search?hidebroken=true&order=clickcount&reverse=true&limit=${limit}`;
        const response = await fetch(url);
        const data = await response.json();
        return enrichWithWhatsApp(data);
    } catch (error) {
        console.error('getTopStations failed:', error);
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
        const data = await response.json();
        return enrichWithWhatsApp(data);
    } catch (error) {
        console.error('getStations failed:', error);
        return [];
    }
}
