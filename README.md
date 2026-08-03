# Bus Services — Balangoda (Bus-Services-BLGD)

Overview
- A small progressive web app (PWA) that shows local bus routes for Balangoda with an interactive map, service filtering, language toggle (සිංහල / தமிழ் / English), GPX simulator and offline-capable behavior via a Service Worker.
- Key improvements made:
  - Enriched dummy bus data (short route IDs, route numbers, service types).
  - Service-type filtering and arrival time calculations (arrival at selected from & to stops).
  - Language switching that updates UI labels and route option text.
  - Accurate geolocation (high-accuracy getCurrentPosition + accuracy circle).
  - Single Leaflet map instance that expands to a full-screen map page when the Map nav icon is used.
  - GPX simulator: draw route and animate bus icon along track.
  - PWA fixes: valid manifest and robust service-worker caching strategy for offline use and installability.

Repository changes (commits)
- `app.js` — df42b1c1bd66675189d7653a226e6fc248d11324
  - Adds: enriched `busData`, translations, geolocation, full-screen map handling, improved result rendering and GPX simulator.
- `sw.js` — 26e21878fd6a9f1fcafa280d98aa043775be9020
  - Adds: corrected cache name, `skipWaiting`/`clients.claim`, network-first for navigation and safer caching.
- `manifest.json` — 8c8581e94c872712e1318439f85e4696816e380a
  - Replaced malformed JSON with a valid manifest (icons, screenshots, shortcuts).
- `style.css` — 68ad9fec458462517066e726c18182c1b32f5d4c
  - Adds: pill colors, user location icon style, full-map sizing and minor UI tweaks.

Quick start (local)
1. Clone the repository
   ```bash
   git clone https://github.com/2010rahula-ai/Bus-Services-BLGD.git
   cd Bus-Services-BLGD
   ```

2. Serve locally
   - For testing Service Worker & PWA features use localhost or HTTPS.
   - Quick test on localhost:
     ```bash
     python -m http.server 8000
     ```
     Open http://localhost:8000 in Chrome/Edge.

   - For HTTPS testing you can use a simple dev server (mkcert, local-ssl) or deploy to GitHub Pages (HTTPS).

3. Open the app in a browser (Chrome recommended) and test features described below.

Features & how to use them

1. Finding buses
- Select route (left panel) and optionally choose service type:
  - "normal" = show all, or choose "SLTB" (state) or "PRIVATE".
- Choose From and To stops (or tap Set From / Set To on the map to add a custom point).
- Enter a time (optional) then click Search.
- Result card displays:
  - First row: route short name + departure → destination.
  - Service pill (SLTB = red; PRIVATE = green).
  - From stop name and arrival time (arrival at selected from stop).
  - To stop name and arrival time.
  - Details block: departure/time, destination/time, route number, service type, route distance.

2. Map / Geolocation
- Map lives in the main UI and can be moved to a full-screen map page.
- Bottom nav → Map: opens the map page; the same Leaflet instance will move into the full-screen container (preserves state).
- Center/Locate button: prompts for location permission and, if allowed, shows a user marker + accuracy circle and recenters the map.
- Set From / Set To: click map buttons then click on the map to pick custom origin/destination points.

3. Language toggle
- Settings → Language: choose Sinhala (si), Tamil (ta), or English (en).
- UI labels and route select options will update to the selected language.

4. GPX simulator
- Upload a GPX file (left panel).
- The app draws the polyline, fits bounds and can animate a bus marker along the route using Start Simulation.

5. PWA (Installability & Offline)
- Manifest and service worker are configured for PWA installability:
  - Ensure the site is served on HTTPS or localhost.
  - Check Chrome DevTools → Application → Manifest for validity and installability hints.
  - Service Worker is registered and caches assets for offline use.

Testing & verification checklist
- Serve app on localhost or HTTPS.
- DevTools → Application:
  - Manifest: "Valid manifest". Icons and start_url in scope.
  - Service Worker: check SW registered/active. New cache name used (`bus-service-blgd-v1`).
  - Installability: shows "Installable" when Chrome heuristics are met.
- UI:
  - Bottom Map nav: click Map → map page opens and the same Leaflet map instance expands to full-screen.
  - Locate: click center button and allow permission — see user marker + accuracy circle.
  - Language: Settings → change language → labels and route names change.
  - Service filter: choose SLTB / PRIVATE → Search → results filtered and pill colored appropriately.
  - GPX: upload GPX and start simulation → polyline & animated icon.

Troubleshooting
- Manifest not valid or no install prompt:
  - Verify `manifest.json` is present at the root, icons referenced exist (`./images/icon.png` etc.), and `start_url` is in scope.
  - Serve over HTTPS (or use localhost).
- Service Worker not updating or caching stale assets:
  - In DevTools → Application → Service Workers, click "Update" or unregister then reload.
  - The service worker uses a cache name; changing the cache name forces a new cache.
- Map shows blank tiles:
  - Check network requests to tile server; ensure no CSP blocking or mixed-content problem (HTTPS page requesting HTTP tiles).
- Geolocation errors:
  - Browser must permit location for the page; on insecure origins geolocation may fail. Use HTTPS/localhost and verify device location settings.
- Duplicate map containers:
  - There must be a single Leaflet map instance; `index.html` has a `#map` (main) and `#map-full` (fullscreen container). Do not create multiple map instances— the app moves the existing container DOM node.

Extending the app (ideas and notes)
- Real-time vehicle tracking: add a small WebSocket server to push vehicle positions; display as moving markers on the map.
- Offline timetable & favorites: use IndexedDB to store timetables, saved stops, and cached routes for offline queries.
- Accessibility: add ARIA attributes, keyboard navigation and proper focus order.
- GTFS integration: replace dummy data with GTFS feeds and compute accurate stop sequences and times.
- ETA improvements: implement simple historical model or server-side ETA prediction using observed delays.

Developer notes (where to edit)
- bus data: `app.js` → `busData` object. Add new `serviceType` values (e.g., `express`, `AC`) and update the service select to match.
- translations: `app.js` → `translations` object; expand strings for more complete localization.
- service worker assets: `sw.js` → `ASSETS` list; add any additional files you want cached at install time.
- manifest icons/screenshots: `./images/` must contain referenced icons and screenshots.

License & author
- Author: repository owner (2010rahula-ai)
- License: add a LICENSE file as desired (MIT recommended for quick open-source use).

Contact / support
- If you want me to:
  - Connect a real-time feed (WebSocket) and show live buses on the map,
  - Integrate GTFS feeds for real timetables and stop sequences,
  - Localize more fully or adjust UI wording,
  I can implement the next steps; tell me which feature you prefer.

What I changed and next
- I updated the app to add dummy service data, language toggle, improved results layout, geolocation, PWA fixes and map behavior; please test using the checklist above.
- Next I can help wire a live data source (GTFS/realtime) or add features like saved favorites and offline storage. Tell me which one to do next or if you want this README expanded further.
