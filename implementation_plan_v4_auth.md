# Implementation Plan - GeoRadio V4 (Authentication)

We will implement a secure authentication system backed by Google Sheets.

## Goal Description
1.  **Login Screen**: A futuristic, glassmorphism-styled entry screen blocking access to the app until authenticated.
2.  **Registration**: Users can sign up with Email + Password. Data is sent to Google Sheets.
3.  **Password Reset**: A flow to trigger a reset (handled via email through Google Apps Script).
4.  **Persistence**: Keep user logged in via `localStorage`.

## Architecture
- **Frontend**: `js/auth.js` handles form submissions and state.
- **Backend / DB**: A Google Apps Script web app (deployed by user) connected to a Google Sheet.

## Proposed Changes

### [NEW] [js/auth.js](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/js/auth.js)
- `checkSession()`: Checks if user is already logged in.
- `login(email, password)`: Calls API.
- `register(email, password, name)`: Calls API.
- `logout()`: Clears session and shows login screen.

### [index.html](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/index.html)
- Add `#auth-overlay` container.
- Forms for Login, Register, Forgot Password.

### [css/style.css](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/css/style.css)
- Styles for the Auth Panel (Center screen, distinct from main UI).
- Input field styles (already exist but specific tweaks for auth forms).

### [UPDATE_GOOGLE_SCRIPT.txt](file:///Users/hjalmarmeza/Downloads/Antigravity/GeoRadio/UPDATE_GOOGLE_SCRIPT.txt)
- Contains the `Code.gs` for the user to copy into Google Apps Script.

## Verification
1.  Verify UI looks correct and blocks the main app.
2.  Verify switching between Login/Register tabs works visually.
3.  (Later) Verify connection to Sheet.
