# GeoRadio 📻

Una aplicación web futurista para escuchar radios FM de todo el mundo, filtradas por País y Ciudad.

## Características

- 🌍 **Sintonizador Global**: Conecta con la API de Radio Browser para acceder a miles de emisoras.
- 🎨 **Diseño Neon/Future**: Interfaz oscura con acentos de neón, glassmorphism y animaciones suaves.
- 🔊 **Player Persistente**: Control de volumen y reproducción continua.
- 📱 **Responsive**: Se adapta a escritorio y móvil.

## Cómo ejecutar

Esta aplicación es Vanilla HTML/JS, por lo que no requiere compilación complicada, pero necesita un servidor local para cargar los Módulos ES6 correctamente (CORS/Modules policy).

**Opción 1: Con VS Code Live Server**
1. Abre este archivo `index.html` con "Open with Live Server".

**Opción 2: Con Python**
```bash
# En esta carpeta:
python3 -m http.server 8000
# Abre http://localhost:8000 en tu navegador
```

**Opción 3: Con Node.js/Vite (si quisieras configurarlo)**
- Ejecutar `npx vite .`

## Tecnologías

- **Core**: HTML5, Vanilla JavaScript (ES Modules).
- **Estilos**: Vanilla CSS3 (Variables, Flexbox, Grid, Backdrop-Filter).
- **API**: [Radio Browser API](https://www.radio-browser.info/).
