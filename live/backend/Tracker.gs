/**
 * STRAY Live · tracker feed (Google Apps Script)
 *
 * What it does: asks the tracker provider (Poltrax) for the runners' latest positions,
 * keeps the API key private, caches the answer for 15 s, and returns one fixed JSON shape
 * that live/index.html reads:
 *
 *   { ok:true, updated:"2026-11-28T20:41:07Z",
 *     positions:[ { id:"12", name:"David Gomez Pereda", lat:46.40227, lon:6.60731,
 *                   ts:1795894867000, speed:7.4, battery:81 } ] }
 *
 * Runners and vans come through the same feed. The page tells them apart by name or id:
 * a tracker named "Sprinter", "Van A" or "Van B" (or with the id set in CONFIG.vehicles) is drawn as a van.
 *
 * Set-up (5 minutes, once you have API access from Poltrax):
 * Poltrax gives one URL with a private key in it. Put that URL in POLTRAX_URL and leave
 * POLTRAX_KEY empty. Never paste the Poltrax URL into the page itself: the page is public.
 *
 *   1. script.google.com → New project → paste this file. Do NOT paste it into the pledge
 *      Sheet's script: that one already has its own doGet.
 *   2. Project Settings → Script properties:
 *        POLTRAX_URL     the positions endpoint Poltrax gives you for this event
 *        POLTRAX_KEY     your API key                         (optional if the URL carries it)
 *        POLTRAX_HEADER  header name for the key              (default: Authorization)
 *        POLTRAX_PREFIX  text before the key in the header    (default: "Bearer ")
 *   3. Run test() once and check the log: you should see your trackers with lat/lon.
 *      If fields are missing, adjust mapRow() below. It is the only provider-specific part.
 *   4. Deploy → New deployment → Web app · Execute as: Me · Who has access: Anyone.
 *   5. Copy the /exec URL into CONFIG.feedUrl in live/index.html.
 */

const CACHE_SECONDS = 15;

function doGet() {
  const cache = CacheService.getScriptCache();
  let body = cache.get('positions');
  if (!body) {
    try {
      body = JSON.stringify({ ok: true, updated: new Date().toISOString(), positions: fetchPositions() });
      cache.put('positions', body, CACHE_SECONDS);
      cache.put('positions_last_good', body, 21600);
    } catch (err) {
      // Provider down: serve the last good answer. The page marks old signals as "last seen".
      body = cache.get('positions_last_good') || JSON.stringify({ ok: false, error: String(err), positions: [] });
    }
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function fetchPositions() {
  const p = PropertiesService.getScriptProperties();
  const url = p.getProperty('POLTRAX_URL');
  if (!url) throw new Error('POLTRAX_URL is not set.');
  const headers = {};
  const key = p.getProperty('POLTRAX_KEY');
  if (key) headers[p.getProperty('POLTRAX_HEADER') || 'Authorization'] = (p.getProperty('POLTRAX_PREFIX') ?? 'Bearer ') + key;
  const res = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Provider answered ' + res.getResponseCode());
  const data = JSON.parse(res.getContentText());
  return listOf(data).map(mapRow).filter(r => isFinite(r.lat) && isFinite(r.lon));
}

/* Finds the array of participants in the provider's answer. */
function listOf(d) {
  if (Array.isArray(d)) return d;
  const hit = ['positions', 'participants', 'runners', 'devices', 'data', 'items', 'results'].find(k => Array.isArray(d[k]));
  if (hit) return d[hit];
  if (Array.isArray(d.features)) return d.features.map(f => Object.assign({}, f.properties, { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
  return Object.values(d);
}

/* Provider row -> STRAY row. Edit the field names here once you see Poltrax's real answer. */
function mapRow(o) {
  const g = o.position || o.lastPosition || o.last || o.location || o.gps || o;
  const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== '');
  const t = pick(g.ts, g.time, g.timestamp, g.updated, g.updatedAt, g.date, o.ts, o.time, o.timestamp);
  let ts = 0;
  if (typeof t === 'number') ts = t < 1e11 ? t * 1000 : t; else if (t) ts = Date.parse(t) || 0;
  return {
    id: String(pick(o.id, o.bib, o.number, o.device, o.deviceId, o.imei, '')),
    name: String(pick(o.name, o.fullName, o.participant, [o.firstName, o.lastName].filter(Boolean).join(' '), '')),
    lat: Number(pick(g.lat, g.latitude, g.y)),
    lon: Number(pick(g.lon, g.lng, g.long, g.longitude, g.x)),
    ts: ts,
    speed: Number(pick(g.speed, o.speed, NaN)),
    battery: Number(pick(g.battery, o.battery, NaN)),
    km: Number(pick(o.km, o.routeKm, o.route_km, g.km, NaN)),   // Poltrax's km on the route, from our GPX
  };
}

function test() { Logger.log(JSON.stringify(fetchPositions(), null, 2)); }
