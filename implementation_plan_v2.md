# Implementation Plan - NeonRadio V2 (Favorites & Mobile UX)

We will enhance NeonRadio with a Favorites system (Stations & Cities) and optimize the UI for mobile-first experience.

## Goal Description
1. **Favorites System**: Allow users to "Heart" stations and cities. Store this preference in `localStorage` so it persists.
2. **Mobile Optimization**:
   - Refactor layout to be fully responsive.
   - Collapse filters into a bottom sheet or drawer on mobile.
   - Increase touch targets (buttons/cards).
   - Sticky Player at the bottom tailored for mobile usage.

## User Review Required
- **Storage**: Using `localStorage`. No cloud data needed? (Confirmed implicit usage).

## Proposed Changes

### [css/style.css](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/css/style.css)
- **Media Queries**: Add breakpoints (`@media (max-width: 768px)`).
- **Mobile Layout**:
  - `filters-panel`: Convert to a hidden drawer/modal on mobile.
  - `stations-grid`: Adjust grid columns for phone screens (1fr or 2fr).
  - `player-bar`: Simplified controls for mobile.
- **New Classes**: `.is-favorite` styles (glowing heart).

### [js/storage.js] (NEW)
- `saveFavoriteStation(station)`, `removeFavoriteStation(id)`.
- `getFavoriteStations()`.
- Same logic for Cities/Countries.

### [js/app.js](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/js/app.js)
- **Tabs Logic**: Add "Explorar" vs "Favoritos" tabs.
- **Render Logic**: Update `renderStations` to show a Heart icon.
- **Event Listeners**: Handle clicking the heart icon.
- **Mobile Handlers**: Toggle visibility of the filter panel.

### [index.html](file:///Users/hjalmarmeza/Downloads/Antigravity/NeonRadio/index.html)
- **Meta Viewport**: Ensure `user-scalable=no` for app-like feel.
- **Nav Bar**: Add a bottom navigation bar for mobile (Explorar, Favoritos, Ajustes).
- **Favorites Tab**: A new section to list saved items.

## Verification Plan
1. **Mobile Test**: Resize browser to 375px width.
   - Verify layout adapts (filters hidden/bottom sheet).
   - Check touch targets.
2. **Favorites Test**:
   - Click "Heart" on a station -> Reload -> Verify it's still marked.
   - Go to "Favorites" tab -> Verify station is listed.
