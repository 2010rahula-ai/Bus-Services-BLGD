// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}

/* --- Dummy dataset with service types, short names and route numbers --- */
const busData = {
  "BL-01": {
    short: "BL-01",
    name: { si: "බලංගොඩ-වේලිඔය-හම්බෙගමුව", en: "Balangoda - Welioya - Hambegamuwa", ta: "பலங்கொடா - வேலியோயா - ஹம்பெகமுவா" },
    distance: 34,
    routeNumber: "BL-01",
    down: [
      { departure: 'Balangoda', depTime: '06:00', destination: 'Welioya', endTime: '07:30', serviceType: 'sltb' },
      { departure: 'Balangoda', depTime: '07:30', destination: 'Welioya', endTime: '09:00', serviceType: 'sltb' },
      { departure: 'Balangoda', depTime: '08:30', destination: 'Welioya', endTime: '10:00', serviceType: 'private' },
      { departure: 'Balangoda', depTime: '09:00', destination: 'Welioya', endTime: '10:30', serviceType: 'sltb' },
      { departure: 'Balangoda', depTime: '09:30', destination: 'Welioya', endTime: '11:00', serviceType: 'private' },
      { departure: 'Balangoda', depTime: '13:30', destination: 'Welioya', endTime: '15:00', serviceType: 'sltb' }
    ],
    up: [
      { departure: 'Welioya', depTime: '06:00', destination: 'Balangoda', endTime: '07:30', serviceType: 'sltb' },
      { departure: 'Welioya', depTime: '08:30', destination: 'Balangoda', endTime: '10:00', serviceType: 'private' },
      { departure: 'Welioya', depTime: '13:30', destination: 'Balangoda', endTime: '15:00', serviceType: 'sltb' }
    ]
  },
  "BL-02": {
    short: "BL-02",
    name: { si: "බලංගොඩ-වැලිපතයාය-කල්තොට", en: "Balangoda - Kaltota", ta: "பலங்கொடா - கால்தொட்டா" },
    distance: 39,
    routeNumber: "BL-02",
    down: [{ departure: 'Balangoda', depTime: '07:30', destination: 'Kaltota', endTime: '09:00', serviceType: 'sltb' }],
    up: [{ departure: 'Kaltota', depTime: '07:30', destination: 'Balangoda', endTime: '09:00', serviceType: 'sltb' }]
  },
  "BL-03": {
    short: "BL-03",
    name: { si: "බලංගොඩ-රජවක-මුල්ගම", en: "Balangoda - Mulgama", ta: "பலங்கொடா - முல்கமா" },
    distance: 17,
    routeNumber: "BL-03",
    down: [{ departure: 'Balangoda', depTime: '08:30', destination: 'Mulgama', endTime: '10:00', serviceType: 'private' }],
    up: [{ departure: 'Mulgama', depTime: '08:30', destination: 'Balangoda', endTime: '10:00', serviceType: 'private' }]
  }
};

const busStops = {
  "Balangoda": 0, "Kirimatitenna": 3.2, "Depalamulla": 8.1, "Bowatta": 10,
  "Rajavaka": 12, "Nawaneliya": 17, "Molamure": 18, "Tanjantenna": 22,
  "Kaltota": 29, "Welioya": 34
};

const balangodaCenter = { lat: 6.6610, lng: 80.7700 };
let map, fromMarker, toMarker, mapMode = null;
let simPolyline = null, simMarker = null, simCoords = [], simTimer = null, simIndex = 0;
let currentResult = null;
let userLocationMarker = null, userAccuracyCircle = null, watchId = null;

/* Translations for labels + placeholders */
const translations = {
  si: {
    route: "බස් මාර්ගය",
    service: "බස් සේවාව",
    from: "ගමනාරමිභය",
    to: "ගමනාන්තය",
    time: "වේලාව",
    search: "සොයන්න",
    result: "ප්‍රතිපල",
    buses: "බස්",
    map: "සිතියම",
    saved: "Saved",
    settings: "Settings"
  },
  ta: {
    route: "வழி",
    service: "சேவை வகை",
    from: "புறப்பாடு",
    to: "இலக்கு",
    time: "நேரம்",
    search: "தேடுக",
    result: "முடிவுகள்",
    buses: "பஸ்கள்",
    map: "வரைபடம்",
    saved: "Saved",
    settings: "Settings"
  },
  en: {
    route: "Route",
    service: "Service",
    from: "From",
    to: "To",
    time: "Time",
    search: "Search",
    result: "Results",
    buses: "Buses",
    map: "Map",
    saved: "Saved",
    settings: "Settings"
  }
};

/* helpers */
function haversine(a, b) {
  const R = 6371;
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const c = 2 * Math.atan2(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2), Math.sqrt(1 - (Math.sin(dLat / 2) ** 2)));
  return R * c;
}

function parseTimeToDate(tStr) {
  const [hh, mm] = tStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

/* Map init and helpers */
function initMap(containerId = 'map') {
  if (map) return;
  map = L.map(containerId).setView([balangodaCenter.lat, balangodaCenter.lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  map.on('click', (e) => {
    if (mapMode === 'from') {
      if (fromMarker) map.removeLayer(fromMarker);
      fromMarker = L.marker(e.latlng).addTo(map).bindPopup('From (map)').openPopup();
      addCustomStop('fromSelect', e.latlng, `From (map)`);
    } else if (mapMode === 'to') {
      if (toMarker) map.removeLayer(toMarker);
      toMarker = L.marker(e.latlng).addTo(map).bindPopup('To (map)').openPopup();
      addCustomStop('toSelect', e.latlng, `To (map)`);
    }
    setMapMode(null);
  });

  // double-tap fullscreen behavior
  let lastTap = 0;
  map.getContainer().addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 350) {
      document.body.classList.toggle('fullscreen');
      setTimeout(() => map.invalidateSize(), 350);
    }
    lastTap = now;
  });
}

/* Move map DOM container to full-screen map page container when needed */
function moveMapToFull() {
  // If the full container exists, move map's container
  const full = document.getElementById('map-full');
  const small = document.getElementById('map');
  if (!map || !full || !small) return;
  // ensure the map container is a child of the target
  if (map.getContainer().parentNode !== full) {
    full.appendChild(map.getContainer());
    setTimeout(() => map.invalidateSize(), 200);
  }
}

function setMapMode(mode) {
  mapMode = mode;
  document.getElementById('setFromBtn').classList.toggle('active', mode === 'from');
  document.getElementById('setToBtn').classList.toggle('active', mode === 'to');
}

function addCustomStop(selectId, latlng, labelText) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const val = `CUSTOM_${latlng.lat}_${latlng.lng}`;
  const opt = document.createElement('option');
  opt.value = val;
  opt.textContent = labelText;
  opt.selected = true;
  select.appendChild(opt);
}

/* Geolocation functions: high-accuracy locate + optional watch */
function locateUserOnce() {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition((pos) => {
    const coords = pos.coords;
    showUserLocation(coords.latitude, coords.longitude, coords.accuracy);
  }, (err) => {
    console.warn('locate error', err);
    alert('Location error: ' + (err.message || err.code));
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
}

function watchUserLocation() {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    return;
  }
  watchId = navigator.geolocation.watchPosition((pos) => {
    showUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
  }, (err) => console.warn('watch error', err), { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 });
}

function showUserLocation(lat, lng, accuracy) {
  const latlng = [lat, lng];
  if (!map) initMap();
  if (userLocationMarker) userLocationMarker.setLatLng(latlng);
  else userLocationMarker = L.marker(latlng, { icon: L.divIcon({ className: 'user-loc', html: '<i class="fa fa-map-marker-alt"></i>' }) }).addTo(map);
  if (userAccuracyCircle) userAccuracyCircle.setLatLng(latlng).setRadius(accuracy);
  else userAccuracyCircle = L.circle(latlng, { radius: accuracy, color: '#3b82f6', fillColor: 'rgba(59,130,246,0.1)' }).addTo(map);
  map.setView(latlng, 15, { animate: true });
}

/* Core algorithm with service filtering */
function doFindBus() {
  const routeKey = document.getElementById('routeSelect').value;
  const fromVal = document.getElementById('fromSelect').value;
  const toVal = document.getElementById('toSelect').value;
  const timeInput = document.getElementById('timeInput').value;
  const serviceFilter = document.getElementById('bus-service').value; // e.g. 'sltb' or 'private' or 'normal'

  let fromDist = fromVal.startsWith('CUSTOM_') ? haversine(balangodaCenter, { lat: parseFloat(fromVal.split('_')[1]), lng: parseFloat(fromVal.split('_')[2]) }) : busStops[fromVal];
  let toDist = toVal.startsWith('CUSTOM_') ? haversine(balangodaCenter, { lat: parseFloat(toVal.split('_')[1]), lng: parseFloat(toVal.split('_')[2]) }) : busStops[toVal];

  const direction = fromDist > toDist ? 'up' : 'down';
  const route = busData[routeKey];
  if (!route || !route[direction]) return;

  const compareTime = timeInput ? parseTimeToDate(timeInput) : new Date();

  // map each bus and compute arrival at 'from' stop based on proportion along route
  let arrivals = route[direction].map((b, idx) => {
    const dep = parseTimeToDate(b.depTime);
    const end = parseTimeToDate(b.endTime);
    const tripMs = end - dep;
    const proportion = (fromDist / route.distance);
    const arrivalAtFrom = new Date(dep.getTime() + (proportion * tripMs));
    const arrivalAtTo = new Date(dep.getTime() + ((toDist / route.distance) * tripMs));
    return { index: idx, bus: b, arrivalAtFrom, arrivalAtTo };
  });

  // apply service filter if not 'normal' (normal = all)
  if (serviceFilter && serviceFilter !== 'normal') {
    arrivals = arrivals.filter(a => a.bus.serviceType === serviceFilter);
  }

  // sort and pick next
  arrivals.sort((a, b) => a.arrivalAtFrom - b.arrivalAtFrom);
  let foundIndex = arrivals.findIndex(a => a.arrivalAtFrom >= compareTime);
  if (foundIndex === -1) foundIndex = Math.max(0, arrivals.length - 1);

  currentResult = { routeKey, fromVal, toVal, arrivals, idx: foundIndex, direction };
  renderResult();
}

/* Render improved result card according to requirements */
function renderResult() {
  const resultTitleEl = document.getElementById('resultShort');
  const mainTimeEl = document.getElementById('resultTime');
  const pill = document.getElementById('servicePill');
  const fromNameEl = document.getElementById('fromName');
  const toNameEl = document.getElementById('toName');
  const fromTimeEl = document.getElementById('fromTime');
  const toTimeEl = document.getElementById('toTime');
  const detailsEl = document.getElementById('resultDetails');

  if (!currentResult || currentResult.arrivals.length === 0) {
    resultTitleEl.textContent = '--';
    pill.style.display = 'none';
    mainTimeEl.textContent = '--:--';
    detailsEl.innerHTML = '';
    return;
  }
  const route = busData[currentResult.routeKey];
  const item = currentResult.arrivals[currentResult.idx];
  const b = item.bus;

  // Short title: short route + departure → destination
  resultTitleEl.innerHTML = `<span class="route-short">${route.short}</span> &nbsp; ${b.departure} → ${b.destination}`;

  // Service pill
  pill.style.display = 'inline-block';
  pill.textContent = (b.serviceType === 'sltb') ? 'SLTB' : (b.serviceType === 'private') ? 'PRIVATE' : b.serviceType.toUpperCase();
  pill.className = `pill ${b.serviceType === 'private' ? 'private' : 'sltb'}`;

  // From & To stop names + times
  fromNameEl.textContent = currentResult.fromVal;
  toNameEl.textContent = currentResult.toVal;
  fromTimeEl.textContent = item.arrivalAtFrom.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  toTimeEl.textContent = item.arrivalAtTo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Large main time show next arrival at 'from' stop
  mainTimeEl.textContent = item.arrivalAtFrom.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Details block: departure/time, destination/time, route number, service type, distance
  const depTime = parseTimeToDate(b.depTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = parseTimeToDate(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  detailsEl.innerHTML = `
    <div><strong>Departure:</strong> ${b.departure} — ${depTime}</div>
    <div><strong>Destination:</strong> ${b.destination} — ${endTime}</div>
    <div><strong>Route:</strong> ${route.routeNumber} &nbsp; <strong>Service:</strong> ${pill.textContent}</div>
    <div><strong>Distance:</strong> ${route.distance} km</div>
  `;
}

/* Simulator (GPX) */
function handleGpx(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    const parser = new DOMParser();
    const xml = parser.parseFromString(reader.result, "application/xml");
    const pts = Array.from(xml.querySelectorAll('trkpt'));
    simCoords = pts.map(p => [parseFloat(p.getAttribute('lat')), parseFloat(p.getAttribute('lon'))]);

    if (simPolyline) map.removeLayer(simPolyline);
    simPolyline = L.polyline(simCoords, { color: '#ff6b6b' }).addTo(map);
    map.fitBounds(simPolyline.getBounds());
  };
  reader.readAsText(file);
}

function startSimulator() {
  if (simCoords.length < 2) return alert('Please select a GPX file first.');
  if (simMarker) map.removeLayer(simMarker);
  simIndex = 0;

  simMarker = L.marker(simCoords[0], {
    icon: L.divIcon({ html: '<i class="fa fa-bus"></i>', className: 'bus-sim-icon', iconSize: [24, 24] })
  }).addTo(map);

  runSimulationStep();
}

function runSimulationStep() {
  if (simIndex >= simCoords.length - 1) return;
  simTimer = setTimeout(() => {
    simIndex++;
    simMarker.setLatLng(simCoords[simIndex]);
    runSimulationStep();
  }, 300);
}

/* UI & lifecycle wiring */
document.addEventListener('DOMContentLoaded', () => {
  initMap('map'); // create map once inside main layout
  // Attach events
  document.getElementById('searchBtn').addEventListener('click', doFindBus);
  document.getElementById('setFromBtn').addEventListener('click', () => setMapMode('from'));
  document.getElementById('setToBtn').addEventListener('click', () => setMapMode('to'));
  document.getElementById('centerBtn').addEventListener('click', locateUserOnce);
  document.getElementById('gpxFile').addEventListener('change', handleGpx);
  document.getElementById('startSimBtn').addEventListener('click', startSimulator);
  document.getElementById('stopSimBtn').addEventListener('click', () => clearTimeout(simTimer));
  document.getElementById('prevBusBtn').addEventListener('click', () => {
    if (currentResult && currentResult.idx > 0) { currentResult.idx--; renderResult(); }
  });
  document.getElementById('nextBusBtn').addEventListener('click', () => {
    if (currentResult && currentResult.idx < currentResult.arrivals.length - 1) { currentResult.idx++; renderResult(); }
  });

  // Language selector
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    setLanguage(langSelect.value || 'si');
  }

  // When the bottom nav map is clicked, show the map page and move the map container there
  // The HTML showPage function should call moveMapToFull() or we call it here via delegated event
  document.querySelectorAll('.bottom-nav .nav-item').forEach(n => {
    n.addEventListener('click', (ev) => {
      const label = n.textContent.trim();
      if (label.toLowerCase().includes('map') || n.getAttribute('onclick')?.includes('map-page')) {
        // showPage will make the map-page active; after that, move the map DOM
        setTimeout(() => moveMapToFull(), 250);
      }
    });
  });
});

/* Language switching helper that updates UI text and route names */
function setLanguage(lang) {
  const t = translations[lang] || translations.si;
  document.getElementById('label-route').textContent = t.route;
  document.getElementById('label-service').textContent = t.service;
  document.getElementById('label-from').textContent = t.from;
  document.getElementById('label-to').textContent = t.to;
  document.getElementById('label-time').textContent = t.time;
  document.getElementById('searchBtn').textContent = t.search;
  document.getElementById('label-result').textContent = t.result;

  // translate route select options using busData.name
  const routeSel = document.getElementById('routeSelect');
  if (routeSel) {
    for (let i = 0; i < routeSel.options.length; i++) {
      const opt = routeSel.options[i];
      const key = opt.value;
      if (busData[key]) {
        opt.textContent = busData[key].name[lang] || busData[key].name.si;
      }
    }
  }

  // update bottom nav text if desired (optional)
  document.querySelectorAll('.bottom-nav .nav-item').forEach((el) => {
    const txt = el.querySelector('div:last-child');
    if (!txt) return;
    const role = txt.textContent.trim().toLowerCase();
    if (role === 'map' || role === 'සිතිඅම' || role === 'Map') txt.textContent = t.map;
    if (role === 'buses') txt.textContent = t.buses;
    if (role === 'settings') txt.textContent = t.settings;
  });
}
