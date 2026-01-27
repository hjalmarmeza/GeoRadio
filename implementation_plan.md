# Implementation Plan - NeonRadio (Futuristic FM App)

We will build a modern, futuristic web application to listen to local FM radios globally, filtered by Country and City.

## Goal Description
Create a "NeonRadio" web app with a high-end, futuristic aesthetic (Cyberpunk/Glassmorphism).
- **Features**: Country selection, City selection, Station list, Persistent Audio Player.
- **Data Source**: Radio Browser API (public).
- **Tech Stack**: HTML5, Vanilla CSS (Variables, Flexbox/Grid), Vanilla JavaScript (ES6+ Modules).

## User Review Required
- **Design Direction**: Confirmed "futuristic, novel" (Dark mode, Neon accents).
- **Data Source**: Using public Radio Browser API (no API key needed).

## Proposed Changes

### Project Structure (NeonRadio/)
- Root directory for the application.

#### [NEW] [index.html](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/index.html)
- Main entry point.
- Semantic HTML5 structure.
- Imports `css/style.css` and `js/app.js` (module).
- Layout:
  - **Hero/Header**: Branding (Neon Text).
  - **Controls**: Dropdowns for Country/City (Styled custom selects).
  - **Main**: Grid of Radio Stations (Cards with glass effect).
  - **Footer/Player**: Fixed bottom player with visualizations.

#### [NEW] [css/style.css](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/css/style.css)
- **Variables**: HSL colors (Neon Blue, Purple, Dark background), Fonts.
- **Reset**: Standard box-sizing reset.
- **Glassmorphism**: Utilities for translucent backgrounds and blurs.
- **Animations**: Glows, hover effects, loading spinners.

#### [NEW] [js/app.js](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/js/app.js)
- Main orchestration.
- Import `API` and `Player` modules.
- Event listeners for DOM elements.
- State management (Current Country, City, Playing Station).

#### [NEW] [js/api.js](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/js/api.js)
- `fetchCountries()`
- `fetchCities(country)`
- `fetchStations(country, city)`
- Handles API endpoints (using `https://de1.api.radio-browser.info/` or dynamic DNS resolution).

#### [NEW] [js/audio.js](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/js/audio.js)
- `Audio` object wrapper.
- `play(url)`, `pause()`, `setVolume()`.
- Error handling (streams often fail).

## Verification Plan

### Manual Verification
- Open `index.html` in browser.
- Verify "Futuristic" look (colors, shadows).
- Select a Country (e.g., Spain) -> Verify City list loads.
- Select a City (e.g., Madrid) -> Verify Station list loads.
- Click a station -> Verify Audio plays.
- Check responsiveness on mobile view (devtools).
