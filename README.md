# Geo-Note

A small geo-note app that lets you attach notes to GPS coordinates, view them on a Leaflet map, filter by radius and draw simple routes between points.

## Features
- Check-in: save a note with the current location (latitude/longitude) and timestamp.
- List all saved notes (stored in browser `localStorage`).
- Display markers on a Leaflet map and draw a polyline connecting saved points.
- Filter notes by radius around a chosen center (set center to current location).
- Draw routes (straight-line polylines) between two saved check-in points, or from a saved point to a custom latitude/longitude.

The app is intentionally lightweight to work in the browser during development. For native builds you can enable Capacitor plugins to use native geolocation behavior.

## Files of interest
- `src/GeoNotes.jsx` — main component implementing map, check-ins, filtering and routing.
- `src/App.jsx` — mounts the `GeoNotes` component.
- `package.json` — dependencies and scripts. The project uses Leaflet for mapping.

## Quick start (development)
These commands assume PowerShell on Windows and that you're in the project root.

```powershell
cd 'd:\Hoc_Tap\Di dong da nen tang\geo-note'
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173/ in your browser. Allow the page to use your location when prompted. Note: browser geolocation requires secure contexts (localhost or HTTPS).

## How to use
- Enter a note text and click `Check-in` to save your current location.
- Saved notes appear in the left list; use `Zoom` to center the map on a note, or `Delete` to remove it.
- Set a filter center to your current location and enter a radius in meters to see only nearby notes.
- In the Routing section:
	- Choose a Start note and an End note, then click `Draw route between notes` to draw a straight red line between them.
	- Or choose a Start note, enter a target `lat` and `lng`, then click `Draw to target` to draw a dashed orange line to that point.
	- Use `Clear route` to remove the drawn route.

## Notes about geolocation & native builds
- The app currently uses the browser `navigator.geolocation` API for location during development.
- If you build the app with Capacitor for Android/iOS and want native geolocation, install and configure the Capacitor Geolocation plugin (for example `@capacitor/geolocation`) and replace `getCurrentPosition()` in `src/GeoNotes.jsx` to use the plugin when running natively.

Example (native usage outline):

1. Install plugin and sync:

```powershell
npm install
npx cap sync
```

2. Run it with:

```powershell
npm run dev
npx cap open android
```

Be careful to match plugin versions to your installed Capacitor version and add the required Android/iOS permissions.

## Routing vs. Turn-by-turn navigation
- The built-in routing draws straight-line polylines between points (useful for visual planning or simple direction markers).
- For road-following routes (turn-by-turn), integrate a routing provider (OSRM, Mapbox Directions, GraphHopper, etc.). That requires either a routing server or an API key and additional code to fetch route geometry and draw it on the map.

## Troubleshooting
- If the dev server fails because `@capacitor/geolocation` or other native-only packages are imported but not installed, remove the import or install the package. The shipped code uses browser geolocation so the dev server should start without adding native plugins.
- If geolocation fails in the browser, ensure you are using `http://localhost` or `https://` and that you allowed location access in the browser.

## Author
- Name: Le Dinh Phuc
- Class: 22GIT
- School: Vietnam – Korea University of Information and Communications Technology


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
