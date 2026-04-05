// List of Available Servers
const SERVERS = [
    'https://de1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://nl1.api.radio-browser.info/json',
    'https://api.radio-browser.info/json'
];

/**
 * Generic FetchWrapper that retries across servers if one fails.
 */
async function fetchWithFallback(endpoint) {
    for (const server of SERVERS) {
        try {
            const url = `${server}${endpoint}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per server (more robust for complex searches)

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                return await response.json();
            }
        } catch (err) {
            console.warn(`Server ${server} unreachable, trying next...`);
            continue;
        }
    }
    console.error("All API servers failed.");
    return []; // Return empty array if all fail
}

export async function getCountries() {
    return await fetchWithFallback('/countries?order=stationcount&reverse=true&limit=100'); // Limit to top 100 to load faster initially
}

export async function getCities(countryName) {
    if (!countryName) return [];

    // Fetch stations to extract cities/states (Radio-Browser doesn't have a clean cities endpoint by country)
    // Expanded limit to 1000 to catch more cities in larger countries (like Spain/USA)
    const stations = await fetchWithFallback(`/stations/search?country=${encodeURIComponent(countryName)}&hidebroken=true&order=clickcount&reverse=true&limit=1000`);

    if (!stations || !Array.isArray(stations)) return [];

    const cityMap = new Map();
    stations.forEach(station => {
        let city = station.city || station.state || '';
        city = city.trim();
        if (city.length > 2) {
            city = city.charAt(0).toUpperCase() + city.slice(1);
            cityMap.set(city, (cityMap.get(city) || 0) + 1);
        }
    });

    const citiesArray = Array.from(cityMap.entries()).map(([name, count]) => ({
        name: name,
        stationcount: count
    }));

    return citiesArray.sort((a, b) => b.stationcount - a.stationcount);
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
    const data = await fetchWithFallback(`/stations/search?hidebroken=true&order=clickcount&reverse=true&limit=${limit}`);
    return enrichWithWhatsApp(data || []);
}

export async function getTopCountryStations(countryName, limit = 10) {
    const data = await fetchWithFallback(`/stations/search?country=${encodeURIComponent(countryName)}&hidebroken=true&order=clickcount&reverse=true&limit=${limit}`);
    return enrichWithWhatsApp(data || []);
}

export async function getStations(countryName, cityName, limit = 100) {
    if (!countryName) return [];

    let endpoint = `/stations/search?country=${encodeURIComponent(countryName)}&hidebroken=true&order=clickcount&reverse=true&limit=500`;
    
    if (cityName) {
        // We try to search by city/state specifically at the API level
        // This is much better than local filtering on a slice of top stations
        endpoint += `&city=${encodeURIComponent(cityName)}`;
    }

    let stations = await fetchWithFallback(endpoint);
    stations = stations || [];

    // Fallback: If no stations found with exact city match in API, 
    // it's possible they are tagged differently. Let's do a broader search 
    // and filter locally as a secondary safety measure, but only if cityName was provided.
    if (cityName && stations.length === 0) {
        console.log(`No exact city matches for ${cityName}, trying broader state match...`);
        const broaderEndpoint = `/stations/search?country=${encodeURIComponent(countryName)}&state=${encodeURIComponent(cityName)}&hidebroken=true&order=clickcount&reverse=true&limit=500`;
        stations = await fetchWithFallback(broaderEndpoint);
    }

    return enrichWithWhatsApp(stations.slice(0, limit));
}


// --- MAINTENANCE API ---
// Using the same API_URL from auth.js if possible, or define it here.
// Since Auth.js has it, we should probably import it or duplicate it.
// To keep it simple and clean, let's hardcode it here or assume Auth handles it.
// Better: Let's export these from here, but they need the Google Script URL.
// We will use a shared constant file or just duplicate the URL for robustness.

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMr1zDSXijKHEF2gltuLOJTGAflMjQh90Z9tiwdARk3SfCCfg8ehTyhVa1vN5bTIzb/exec";

export async function checkMaintenanceStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s safety timeout for Google Script
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=check_status&t=${Date.now()}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        return data.maintenance === true;
    } catch (e) {
        console.warn("Maintenance check fail:", e);
        return false; // Fail open
    }
}

export async function setMaintenanceStatus(isAdminMode) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const val = isAdminMode ? "TRUE" : "FALSE";
        await fetch(`${GOOGLE_SCRIPT_URL}?action=set_maintenance&value=${val}`, { 
            method: 'POST',
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        return true;
    } catch (e) {
        console.error("Maint set fail:", e);
        return false;
    }
}
