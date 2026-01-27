const fetch = require('node-fetch');

const BASE_URL = 'https://de1.api.radio-browser.info/json';

async function testCities(country) {
    try {
        const url = `${BASE_URL}/cities?country=${encodeURIComponent(country)}&order=stationcount&reverse=true`;
        console.log(`Fetching: ${url}`);
        const resp = await fetch(url);
        const data = await resp.json();
        console.log(`Found ${data.length} cities for ${country}`);
        if (data.length > 0) {
            console.log('Sample city:', data[0]);
        }
    } catch (e) {
        console.error(e);
    }
}

testCities('Spain');
