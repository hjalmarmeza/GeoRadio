# Implementation Plan - GeoRadio V3 (Features & PWA)

We will implement "Top 50 Trends", "Sleep Timer", and convert the application into a PWA (Progressive Web App). Note: The Interactive Map is postponed to V4 due to complexity relative to DOM performance, sticking to listing trends first.

## Goal Description
1.  **Trends Tab**: A new view showing highest-click stations globally.
2.  **Sleep Timer**: A timer that stops playback after X minutes.
3.  **PWA**: `manifest.json` and `sw.js` (Service Worker) to allow installation and offline fallback layout.

## User Review Required
- **PWA Icons**: We will need to generate icon assets or use placeholders. (Will use a generic radio icon URL for now).

## Proposed Changes

### [NEW] [pwa/manifest.json](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/manifest.json)
- App Name: "GeoRadio"
- Theme Color: #050510
- Display: standalone

### [NEW] [sw.js](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/sw.js)
- Minimal cache strategy for UI assets (HTML, CSS, JS).
- Network-first for API calls (Radio streams obviously need network).

### [js/api.js](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/js/api.js)
- Add `getTopStations(limit = 50)` function interfacing with `/stations/topclick`.

### [js/audio.js](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/js/audio.js)
- Add `startSleepTimer(minutes)` method.

### [index.html](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/index.html)
- Add PWA meta tags in `<head>`.
- Add "Trends" button in Mobile Nav.
- Add "Sleep Timer" icon in Player Bar.

### [js/app.js](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/js/app.js)
- Register Service Worker.
- Implement "Trends" view logic.
- Implement Sleep Timer modal or simple prompt.

## Verification Plan
1.  **Trend Test**: Click "Trends" -> Verify high-profile stations load.
2.  **Timer Test**: Set timer for 1 min -> Wait -> Verify audio stops.
3.  **PWA Test**: Open in Chrome (Desktop) -> Check "Install" icon in URL bar.
