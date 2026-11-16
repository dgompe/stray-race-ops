/* STRAY race-ops site — browser app. Reads window.RACE (public) and, after unlock, the decrypted page payload. */
(() => {
'use strict';
const R = window.RACE;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const OFF = 3600e3, MIN = 60e3, DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = n => String(n).padStart(2, '0');
const hm = ms => { const d = new Date(ms + OFF); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); };
const fmt = ms => { const d = new Date(ms + OFF); return DAYS[d.getUTCDay()] + ' ' + hm(ms); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem(k); } catch { } },
};
const now = () => Date.now();
const PAGE = document.body.dataset.page;
const ST = R.stations, IDX = Object.fromEntries(ST.map((s, i) => [s.id, i]));
const FIN = ST[ST.length - 1];

/* ---------- i18n: EN · DE · FR · ES ----------
   Text stays English in the HTML. Every text node is looked up in window.I18N (public)
   plus the page's private dictionary (inside the encrypted payload) and swapped in place.
   Times, km, station ids are tokens (#) kept from the original. */
const LANGS = ['en', 'de', 'fr', 'es'];
const DICT = Object.assign({}, (window.I18N && window.I18N.d) || {});
let FRAG = ((window.I18N && window.I18N.f) || []).slice();
const TOK = /(?:(?:Sat|Sun) )?\d{1,2}:\d\d|\b[AS]\d{1,2}\b|\d+(?:[.,]\d+)?/g;
const DAYN = { de: { Sat: 'Sa', Sun: 'So' }, fr: { Sat: 'sam.', Sun: 'dim.' }, es: { Sat: 'sáb', Sun: 'dom' } };
const LOCALE = { en: 'en-GB', de: 'de-CH', fr: 'fr-CH', es: 'es-ES' };
function pickLang() {
  const q = (location.search.match(/[?&]lang=(en|de|fr|es)/) || [])[1];
  const saved = store.get('stray-lang');
  if (saved && LANGS.includes(saved)) return saved;
  if (q) return q;
  const nav = (navigator.languages || [navigator.language || 'en']).map(x => String(x).slice(0, 2).toLowerCase());
  return nav.find(x => LANGS.includes(x)) || 'en';
}
let LANG = pickLang();
const dayT = tok => LANG === 'en' ? tok : tok.replace(/^(Sat|Sun)\b/, d => DAYN[LANG][d]);
function tr(s) {
  if (LANG === 'en' || !s) return s;
  const core = s.replace(/\s+/g, ' ').trim(); if (!core) return s;
  const li = LANGS.indexOf(LANG) - 1, toks = [];
  const key = core.replace(TOK, m => { toks.push(m); return '#'; });
  const e = DICT[key]; let out;
  if (e && e[li]) { let i = 0; out = e[li].replace(/#/g, () => i < toks.length ? dayT(toks[i++]) : '#'); }
  else {
    out = core;
    for (const [en, arr] of FRAG) if (out.includes(en)) out = out.split(en).join(arr[li]);
    out = out.replace(/\b(Sat|Sun) (\d{1,2}:\d\d)/g, (m, d, t) => DAYN[LANG][d] + ' ' + t);
    if (out === core) return s;
  }
  return (s.match(/^\s*/)[0] ? ' ' : '') + out + (s.match(/\s*$/)[0] ? ' ' : '');
}
const ORIG = new WeakMap(), MINE = new WeakMap();
const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1 };
function trText(n) {
  if (!ORIG.has(n)) ORIG.set(n, n.data);
  const t = tr(ORIG.get(n));
  if (n.data !== t) { n.data = t; }
  MINE.set(n, n.data);
}
function trTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!(root.parentNode && SKIP[root.parentNode.nodeName])) trText(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (SKIP[root.nodeName] || root.id === 'vault') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => SKIP[n.parentNode.nodeName] || (n.parentNode.closest && n.parentNode.closest('#vault,[data-notr]')) ? 2 : 1 });
  let n; while ((n = w.nextNode())) trText(n);
  const els = root.querySelectorAll ? root.querySelectorAll('[placeholder]') : [];
  els.forEach(el => { if (!el.dataset.ph) el.dataset.ph = el.getAttribute('placeholder'); el.setAttribute('placeholder', tr(el.dataset.ph)); });
}
const TITLE0 = document.title;
function setLang(l) {
  LANG = LANGS.includes(l) ? l : 'en'; store.set('stray-lang', LANG);
  document.documentElement.lang = LANG; document.title = tr(TITLE0);
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === LANG ? 'true' : 'false'));
  trTree(document.body);
  const d = document.getElementById('wDate'); if (d) d.value = new Date().toLocaleDateString(LOCALE[LANG], { day: '2-digit', month: 'long', year: 'numeric' });
}
new MutationObserver(ms => {
  for (const m of ms) {
    if (m.type === 'characterData') { const n = m.target; if (MINE.get(n) !== n.data) { ORIG.set(n, n.data); trText(n); } }
    else m.addedNodes.forEach(trTree);
  }
}).observe(document.body, { childList: true, subtree: true, characterData: true });
$$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.l)));
setLang(LANG);
const addDict = d => { if (!d) return; Object.assign(DICT, d.d || {}); FRAG = FRAG.concat(d.f || []).sort((a, b) => b[0].length - a[0].length); trTree(document.body); };

/* ---------- night mode ---------- */
function setNight(on) {
  document.documentElement.classList.toggle('night', on);
  $$('.night').forEach(b => b.setAttribute('aria-pressed', on ? 'true' : 'false'));
  store.set('stray-night', on);
}
setNight(!!store.get('stray-night', false));
$$('.night').forEach(b => b.addEventListener('click', () => setNight(!document.documentElement.classList.contains('night'))));

/* ---------- schedule maths ---------- */
function planAt(t) { // where the pack should be at time t
  if (t < R.start) return { state: 'pre', km: 0 };
  if (t >= FIN.arr) return { state: 'done', km: R.routeKm, st: FIN };
  for (let i = 0; i < ST.length - 1; i++) {
    const a = ST[i], b = ST[i + 1];
    if (a.arr && t >= a.arr && t < a.dep) return { state: 'stop', st: a, km: a.km, next: b };
    if (t >= a.dep && t < b.arr) {
      const f = (t - a.dep) / (b.arr - a.dep);
      return { state: 'run', from: a, to: b, km: a.km + f * (b.km - a.km), sec: 'S' + (i + 1) };
    }
  }
  return { state: 'done', km: R.routeKm };
}
function pointAtKm(k) {
  const P = R.route; if (k <= 0) return P[0]; if (k >= P[P.length - 1][3]) return P[P.length - 1];
  let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][3] <= k) lo = m; else hi = m; }
  const a = P[lo], b = P[hi], f = (k - a[3]) / ((b[3] - a[3]) || 1);
  return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2], k];
}

/* ---------- countdown / race clock ---------- */
function tickCountdown() {
  const t = now(), cd = $('#cd'), lab = $('#cdLabel'); if (!cd) return;
  let ms, label;
  if (t < R.start) { ms = R.start - t; label = 'Start in'; }
  else if (t < FIN.arr) { ms = t - R.start; label = 'Race clock'; }
  else { ms = FIN.arr - R.start; label = 'Finished'; }
  const s = Math.floor(ms / 1000), v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  lab.textContent = label;
  $$('b[data-u]', cd).forEach(b => b.textContent = pad(v[b.dataset.u]));
}
tickCountdown(); setInterval(tickCountdown, 1000);

/* ---------- route map + elevation ---------- */
const MAP = (() => {
  const P = R.route; let minLa = 90, maxLa = -90, minLo = 180, maxLo = -180;
  P.forEach(p => { minLa = Math.min(minLa, p[0]); maxLa = Math.max(maxLa, p[0]); minLo = Math.min(minLo, p[1]); maxLo = Math.max(maxLo, p[1]); });
  const c = Math.cos((minLa + maxLa) / 2 * Math.PI / 180), W = 1000;
  const k = W / ((maxLo - minLo) * c), H = (maxLa - minLa) * k, pd = 46;
  const xy = (la, lo) => [((lo - minLo) * c * k + pd), ((maxLa - la) * k + pd)];
  const cx = W / 2 + pd, cy = H / 2 + pd;
  return { xy, vb: `0 0 ${W + 2 * pd} ${Math.round(H + 2 * pd)}`, cx, cy };
})();
const pathD = pts => pts.map((p, i) => (i ? 'L' : 'M') + MAP.xy(p[0], p[1]).map(n => n.toFixed(1)).join(',')).join('');
function drawMap(svg, { doneKm = null, pack = null, runners = [], pins = [] } = {}) {
  if (!svg) return;
  svg.setAttribute('viewBox', MAP.vb);
  let h = `<path class="lake" d="${pathD(R.route)}Z" style="fill:var(--soft);opacity:.35"/>`;
  h += `<path class="trk" d="${pathD(R.route)}"/>`;
  if (doneKm != null && doneKm > 0) h += `<path class="trk-done" d="${pathD(R.route.filter(p => p[3] <= doneKm).concat([pointAtKm(doneKm)]))}"/>`;
  R.waypoints.forEach(w => { const [x, y] = MAP.xy(w.lat, w.lon); h += `<g class="wp"><circle cx="${x}" cy="${y}" r="3"/><text x="${x + 6}" y="${y + 12}">${esc(w.name)}</text></g>`; });
  ST.forEach(s => {
    if (s.id === 'FIN') return;
    const [x, y] = MAP.xy(s.lat, s.lon), dx = x < MAP.cx ? -1 : 1, dy = y < MAP.cy ? -1 : 1;
    const label = s.id === 'START' ? 'IMD · start/finish' : s.id;
    h += `<g class="stn${s.big ? ' big' : ''}"><circle cx="${x}" cy="${y}" r="${s.big ? 8 : 6}"/><text x="${x + dx * 12}" y="${y + dy * 16 + 4}" text-anchor="${dx < 0 ? 'end' : 'start'}">${label}</text></g>`;
  });
  pins.forEach(p => { const [x, y] = MAP.xy(p.lat, p.lon); h += `<g class="pin"><rect x="${x - 9}" y="${y - 9}" width="18" height="18" transform="rotate(45 ${x} ${y})"/><text x="${x + 16}" y="${y + 5}">${esc(p.label)}</text></g>`; });
  if (pack) { const [x, y] = MAP.xy(pack[0], pack[1]); h += `<g class="pack"><circle cx="${x}" cy="${y}" r="11"/></g>`; }
  runners.forEach((r, i) => { const [x, y] = MAP.xy(r.p[0], r.p[1]); const a = i / runners.length * Math.PI * 2; const ox = Math.cos(a) * 14, oy = Math.sin(a) * 14; h += `<g class="rn ${r.c}"><circle cx="${x + ox}" cy="${y + oy}" r="9"/><text x="${x + ox + 11}" y="${y + oy + 5}">${esc(r.id)}</text></g>`; });
  svg.innerHTML = h;
}
function drawElev(svg) {
  if (!svg) return;
  const P = R.route, W = 400, H = 150, pl = 26, pb = 18;
  let lo = 1e9, hi = -1e9; P.forEach(p => { lo = Math.min(lo, p[2]); hi = Math.max(hi, p[2]); });
  lo = Math.floor(lo / 50) * 50; hi = Math.ceil(hi / 50) * 50;
  const x = k => pl + k / R.routeKm * (W - pl - 4), y = e => (H - pb) - (e - lo) / (hi - lo) * (H - pb - 8);
  const line = P.map((p, i) => (i ? 'L' : 'M') + x(p[3]).toFixed(1) + ',' + y(p[2]).toFixed(1)).join('');
  let h = `<path class="a" d="${line}L${x(R.routeKm)},${H - pb}L${pl},${H - pb}Z"/><path class="l" d="${line}"/>`;
  [lo, hi].forEach(e => h += `<text x="0" y="${y(e) + 3}">${e}</text>`);
  ST.filter(s => /^A\d+$/.test(s.id)).forEach(s => { h += `<line x1="${x(s.km)}" x2="${x(s.km)}" y1="8" y2="${H - pb}"/>`; if (['A1', 'A4', 'A8', 'A11', 'A13'].includes(s.id)) h += `<text x="${x(s.km)}" y="${H - 4}" text-anchor="middle">${s.id}</text>`; });
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = h;
}
drawElev($('#elev'));

/* ---------- public live position ---------- */
function tickPublic() {
  const t = now(), p = planAt(t), el = $('#packNow');
  let msg;
  if (p.state === 'pre') msg = `<p class="note">Start Saturday 28.11 at 11:00 at IMD.</p>`;
  else if (p.state === 'stop') msg = `<p><b>By schedule the pack is at ${esc(p.st.id)} until ${hm(p.st.dep)} (hard departure).</b></p>`;
  else if (p.state === 'run') msg = `<p><b>By schedule the pack is on ${p.sec}, ${esc(p.from.id === 'START' ? 'IMD' : p.from.id)} → ${esc(p.to.id === 'FIN' ? 'IMD' : p.to.id)}, at about km ${p.km.toFixed(1)}. Next arrival ${hm(p.to.arr)}.</b></p>`;
  else msg = `<p><b>The pack finished at IMD on Sunday at ${hm(FIN.arr)}.</b></p>`;
  msg += `<p class="golink"><a href="https://dgompe.github.io/stray-race-ops/live/" target="_blank" rel="noopener">Follow the pack live on STRAY Live →</a></p>`;
  if (el) el.innerHTML = msg;
  const bar = $('#packProg'); if (bar) bar.style.width = (p.km / R.routeKm * 100).toFixed(2) + '%';
  drawMap($('#routeMap'), { doneKm: p.state === 'pre' ? null : p.km, pack: p.state === 'pre' ? null : pointAtKm(p.km) });
  // schedule rows
  $$('.sched tbody tr').forEach(tr => {
    const s = ST[IDX[tr.dataset.st]];
    tr.classList.toggle('past', p.state !== 'pre' && (s.dep ?? s.arr) < t);
    tr.classList.toggle('now', (p.state === 'stop' && p.st.id === s.id) || (p.state === 'run' && p.to.id === s.id));
  });
  const nb = $('#nowbar');
  if (nb) { if (p.state === 'pre') nb.hidden = true; else { nb.hidden = false; nb.textContent = p.state === 'done' ? 'Finished' : p.state === 'stop' ? `Now · at ${p.st.id} · departs ${hm(p.st.dep)}` : `Now · ${p.sec} · next ${p.to.id === 'FIN' ? 'finish' : p.to.id} ${hm(p.to.arr)}`; } }
}
tickPublic(); setInterval(tickPublic, 30e3);
if (R.poltrax) { const box = $('#poltrax'); if (box) { box.hidden = false; box.innerHTML = `<iframe src="${esc(R.poltrax)}" title="Live tracking" loading="lazy"></iframe>`; } }

/* ---------- vault / gate ---------- */
const vaultEl = $('#vault');
let PRIV = null;
const ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const tb64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
async function deriveKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}
async function decryptWith(key, V) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(V.i) }, key, ub64(V.c));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function tryStoredKey(V) {
  const raw = store.get('stray-k-' + PAGE); if (!raw || raw.s !== V.s) return null;
  try { const key = await crypto.subtle.importKey('raw', ub64(raw.k), 'AES-GCM', true, ['decrypt']); return await decryptWith(key, V); }
  catch { store.del('stray-k-' + PAGE); return null; }
}
const say = (el, msg, cls = '') => { if (!el) return; el.hidden = false; el.className = 'status ' + cls; el.innerHTML = msg; };

async function initGate() {
  if (!vaultEl) return;
  const V = JSON.parse(vaultEl.textContent);
  if (!window.crypto || !crypto.subtle) { say($('#pwStatus'), 'This browser cannot unlock the page. Open it over https in an up-to-date browser.', 'err'); return; }
  const payload = await tryStoredKey(V);
  if (payload) return afterDecrypt(payload);
  $('#pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = $('#pw').value.trim(); say($('#pwStatus'), 'Checking…');
    try {
      const key = await deriveKey(pw, ub64(V.s)); const p = await decryptWith(key, V);
      if ($('#pwRemember').checked) store.set('stray-k-' + PAGE, { s: V.s, k: tb64(await crypto.subtle.exportKey('raw', key)) });
      $('#pwStatus').hidden = true; afterDecrypt(p);
    } catch { say($('#pwStatus'), 'Wrong password. Check with the organizer.', 'err'); }
  });
}
// One signature per device counts for every page. Older per-page signatures are picked up too.
function getSigned(v) {
  for (const k of ['stray-w', 'stray-w-' + PAGE, 'stray-w-runners', 'stray-w-relay', 'stray-w-crew']) { const r = store.get(k); if (r && r.v === v) return r; }
  return null;
}
function saveSigned(rec) { store.set('stray-w', rec); store.set('stray-w-' + PAGE, rec); }
function waiverBody(rec) {
  const tmp = document.createElement('div'); tmp.innerHTML = PRIV.html;
  const wt = $('#waiverText');
  return { type: 'waiver', key: PRIV.key, page: PAGE, version: PRIV.waiverVersion, name: rec.name, email: rec.email, role: rec.role, signature: rec.signature, date: rec.date, copyTo: PRIV.copyTo, waiverHtml: wt ? wt.innerHTML : '', packHtml: buildPack(rec.role, tmp), ua: navigator.userAgent.slice(0, 120), lang: LANG };
}
// A signature made before the backend was connected is sent once, in the background. No re-signing.
function syncSigned(rec) {
  if (!PRIV.endpoint || rec.synced) return;
  const body = waiverBody(rec);
  post(body).then(r => { if (r && r.ok) { rec.synced = true; saveSigned(rec); } }).catch(() => { });
}
function afterDecrypt(p) {
  PRIV = p.data; PRIV.html = p.html; addDict(PRIV.i18n);
  const signed = getSigned(PRIV.waiverVersion);
  if (signed) { syncSigned(signed); return reveal(signed); }
  $('#gatePw').hidden = true; $('#gateWaiver').hidden = false;
  const sel = $('#wWho'); (PRIV.roster || []).concat('Other').forEach(n => { const o = document.createElement('option'); o.textContent = n; sel.appendChild(o); });
  $('#wDate').value = new Date().toLocaleDateString(LOCALE[LANG], { day: '2-digit', month: 'long', year: 'numeric' });
  $('#gateWaiver').scrollIntoView({ block: 'start' });
  $('#waiverForm').addEventListener('submit', submitWaiver);
}

function buildPack(role, tmp) {
  const abs = html => html.replace(/(src|href)="(?!https?:|mailto:|tel:|#)([^"]+)"/g, (m, a, u) => `${a}="${new URL(u, location.href).href}"`);
  let h = `<h1>STRAY – Lake Tour Edition · your race pack</h1><p>Start Saturday 28.11.2026, 11:00, IMD Lausanne. Finish Sunday 29.11, ${hm(FIN.arr)}, IMD.</p>`;
  if (PRIV.cards && PRIV.cards[role]) h += PRIV.cards[role];
  $$('section.pack, #safety', tmp).forEach(s => { const c = s.cloneNode(true); $$('form,button,select,.picker,.card-slot', c).forEach(x => x.remove()); h += c.innerHTML; });
  const sched = $('.sched'); if (sched) h += '<h2>Hard-time schedule</h2>' + sched.outerHTML;
  h += `<p><span>Site:</span> <a href="${location.href.split('#')[0]}">${location.href.split('#')[0]}</a></p>`;
  const box = document.createElement('div'); box.innerHTML = h; trTree(box);
  return abs(box.innerHTML);
}
async function submitWaiver(e) {
  e.preventDefault();
  const f = e.target, st = $('#wStatus');
  const rec = { name: $('#wName').value.trim(), email: $('#wEmail').value.trim(), role: $('#wWho').value, signature: $('#wSig').value.trim(), date: $('#wDate').value, v: PRIV.waiverVersion, t: now() };
  if (!$('#wAccept').checked) return say(st, 'Tick the box to accept the terms.', 'err');
  if (rec.signature.toLowerCase().replace(/\s+/g, ' ') !== rec.name.toLowerCase().replace(/\s+/g, ' ')) return say(st, 'Type your full name exactly as above to sign.', 'err');
  const body = waiverBody(rec);
  const btn = $('button[type=submit]', f); btn.disabled = true;
  if (!PRIV.endpoint) {
    say(st, 'Signed. Note: the email backend is not connected yet, so no email was sent. Your signature is saved on this device.', 'ok');
    saveSigned(rec); setTimeout(() => reveal(rec), 1400); return;
  }
  say(st, 'Sending your waiver and race pack…');
  try {
    const r = await post(body);
    if (!r || !r.ok) throw new Error(r && r.error || 'Server error');
    rec.synced = true; saveSigned(rec);
    say(st, `<span>Signed. A copy and your race pack are on their way to</span> <b>${esc(rec.email)}</b> <span>and to the organizer.</span>`, 'ok');
    setTimeout(() => reveal(rec), 1400);
  } catch (err) { btn.disabled = false; say(st, '<span>Could not send. Check your connection and try again.</span> <small>(' + esc(err.message) + ')</small>', 'err'); }
}

function reveal(rec) {
  const gate = $('#gate'); if (gate) gate.remove();
  $('#private').innerHTML = PRIV.html;
  document.body.classList.remove('locked');
  initPrivate(rec);
  tickPublic();
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
}

/* ---------- backend ---------- */
async function post(obj) {
  const r = await fetch(PRIV.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(obj) });
  return r.json();
}
async function getRemote(action) {
  const u = PRIV.endpoint + (PRIV.endpoint.includes('?') ? '&' : '?') + 'action=' + action + '&key=' + encodeURIComponent(PRIV.key);
  const r = await fetch(u); return r.json();
}

/* ---------- private: shared ---------- */
function initPrivate(rec) {
  // personal card picker
  const pk = $('#picker');
  if (pk) {
    const show = n => { const slot = $('#card'); slot.innerHTML = n && PRIV.cards[n] ? PRIV.cards[n] : '<p class="note">Pick your name to see your card.</p>'; store.set('stray-pick-' + PAGE, n); syncStationFromPick(n); };
    pk.addEventListener('change', () => show(pk.value));
    const pre = store.get('stray-pick-' + PAGE) || (rec && rec.role !== 'Other' ? rec.role : '');
    if (pre && PRIV.cards[pre]) { pk.value = pre; show(pre); }
  }
  // checklists
  $$('.checklist').forEach(cl => {
    const k = 'stray-cl-' + cl.dataset.key, v = store.get(k, {});
    $$('input', cl).forEach(i => { i.checked = !!v[i.dataset.i]; i.addEventListener('change', () => { v[i.dataset.i] = i.checked; store.set(k, v); }); });
  });
  // print
  $$('[data-print]').forEach(b => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.print), sec = el && el.closest('section');
    if (!sec) return; sec.setAttribute('data-printing', ''); el.classList.add('printable'); document.body.dataset.print = b.dataset.print;
    const done = () => { sec.removeAttribute('data-printing'); delete document.body.dataset.print; };
    window.addEventListener('afterprint', done, { once: true });
    try { window.print(); } catch { done(); }
    setTimeout(() => { if (document.body.dataset.print) done(); }, 60e3);
  }));
  const am = $('#airbnbMap'); if (am && PRIV.airbnb) drawMap(am, { pins: [{ lat: PRIV.airbnb.lat, lon: PRIV.airbnb.lon, label: 'Airbnb' }] });
  initRunnerForm(); initIncident(); initCrew();
}

function initRunnerForm() {
  const f = $('#runnerForm'); if (!f) return;
  f.addEventListener('submit', async e => {
    e.preventDefault(); const st = $('#rfStatus');
    const data = Object.fromEntries(new FormData(f).entries());
    if (!PRIV.endpoint) return say(st, 'The backend is not connected yet, so this form cannot be sent. Nothing was saved. Send these details to the medical lead directly.', 'err');
    say(st, 'Sending…');
    try { const r = await post({ type: 'runnerform', key: PRIV.key, ...data }); if (!r.ok) throw new Error(r.error || 'Server error'); f.reset(); say(st, 'Sent to the medical leads. Thank you.', 'ok'); }
    catch (err) { say(st, '<span>Could not send. Try again when you have signal.</span> <small>(' + esc(err.message) + ')</small>', 'err'); }
  });
}

/* ---------- events (check-ins, incidents) ---------- */
const EVK = 'stray-events', QK = 'stray-queue';
let EVENTS = store.get(EVK, []);
const uid = () => Math.random().toString(36).slice(2, 10) + now().toString(36);
function addEvent(ev) {
  ev.id = ev.id || uid(); ev.at = now(); ev.by = store.get('stray-pick-' + PAGE) || '';
  EVENTS.push(ev); store.set(EVK, EVENTS);
  const q = store.get(QK, []); q.push(ev); store.set(QK, q);
  flush(); renderDash();
}
let flushing = false;
async function flush() {
  if (!PRIV || !PRIV.endpoint || flushing) return; flushing = true;
  try {
    let q = store.get(QK, []);
    while (q.length) { const r = await post({ type: 'event', key: PRIV.key, event: q[0] }); if (!r || !r.ok) break; q.shift(); store.set(QK, q); }
  } catch { } finally { flushing = false; }
}
async function pull() {
  if (!PRIV || !PRIV.endpoint) return;
  try {
    const r = await getRemote('state'); if (!r.ok) throw 0;
    const have = new Set(EVENTS.map(e => e.id)); r.events.forEach(e => { if (!have.has(e.id)) EVENTS.push(e); });
    store.set(EVK, EVENTS); REMOTE = r; renderDash();
    const q = store.get(QK, []).length;
    const s = $('#dSync'); if (s) s.textContent = q ? `Shared data · last sync ${hm(now())} · ${q} check-ins waiting to send.` : `Shared data · last sync ${hm(now())}.`;
  } catch { const s = $('#dSync'); if (s) s.textContent = `Offline · showing data on this phone · ${store.get(QK, []).length} waiting to send.`; }
}
let REMOTE = null;

function initIncident() {
  const f = $('#incidentForm'); if (!f) return;
  f.addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(f).entries()), st = $('#incStatus');
    addEvent({ k: 'incident', st: d.where, r: d.runners, v: d.type + ' · ' + d.action + ' · ' + d.outcome, note: d.what, t: now(), when: d.when, follow: d.follow });
    if (PRIV.endpoint) { try { await post({ type: 'incident', key: PRIV.key, ...d }); } catch { } }
    f.reset(); say(st, PRIV.endpoint ? 'Logged and sent to the organizer.' : 'Logged on this device. Connect the backend to share it.', 'ok');
  });
}

/* ---------- crew: check-in + dashboard ---------- */
function syncStationFromPick(n) {
  const sel = $('#ciStation'); if (!sel || !n) return;
  const nm = n.replace(/\s*\(.*\)$/, '');
  const ids = Object.entries(PRIV.leads || {}).filter(([, v]) => v.lead === nm).map(([k]) => k);
  if (ids.length) { const t = now(); const best = ids.find(id => ST[IDX[id]].arr > t - 3 * 3600e3) || ids[0]; sel.value = best; renderCheckin(); }
}
function evTime(stId) {
  const v = $('#ciTime').value; if (!v) return now();
  const [h, m] = v.split(':').map(Number), plan = ST[IDX[stId]].arr || R.start;
  const d = new Date(plan + OFF); let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m) - OFF;
  if (t - plan > 12 * 3600e3) t -= 86400e3; if (plan - t > 12 * 3600e3) t += 86400e3; return t;
}
function runnerEvents(r) { return EVENTS.filter(e => (e.r === r || e.r === '*') && (e.k === 'in' || e.k === 'out') && IDX[e.st] != null); }
function runnerState(r, t = now()) {
  const ev = runnerEvents(r); const cond = EVENTS.filter(e => e.r === r && e.k === 'cond').sort((a, b) => a.t - b.t).pop();
  let best = null;
  ev.forEach(e => { const i = IDX[e.st], rank = i * 2 + (e.k === 'out' ? 1 : 0); if (!best || rank > best.rank || (rank === best.rank && e.t > best.e.t)) best = { rank, e }; });
  const res = { id: r, cond: cond ? cond.v : '', last: null, c: 'x', margin: null, eta: null, km: 0, note: '' };
  if (!best) {
    if (t < R.start) { res.note = 'Not started'; return res; }
    best = { e: { st: 'START', k: 'out', t: R.start }, rank: 1, assumed: true };
  }
  const e = best.e, i = IDX[e.st], s = ST[i];
  res.last = e; res.inT = (ev.find(x => x.st === e.st && x.k === 'in') || {}).t; res.outT = (ev.find(x => x.st === e.st && x.k === 'out') || {}).t;
  if (e.k === 'in') {
    res.km = s.km;
    if (s.id === 'FIN') { res.c = 'g'; res.note = 'Finished ' + hm(e.t); return res; }
    res.margin = Math.round((s.dep - t) / MIN); res.eta = null;
    res.c = t > s.dep ? 'r' : res.margin < 5 ? 'o' : 'g'; res.note = `At ${s.id}`;
  } else {
    const nx = ST[i + 1]; if (!nx) { res.c = 'g'; return res; }
    const runMs = (nx.km - s.km) * R.pace * MIN; const eta = Math.max(e.t + runMs, t);
    res.eta = eta; res.km = Math.min(nx.km, s.km + (t - e.t) / (R.pace * MIN));
    const hard = nx.dep || nx.arr; res.margin = Math.round((hard - eta) / MIN);
    res.c = eta > hard ? 'r' : res.margin < 5 ? 'o' : 'g'; res.note = `${s.id === 'START' ? 'IMD' : s.id} → ${nx.id === 'FIN' ? 'IMD' : nx.id}`; res.late = Math.round((eta - nx.arr) / MIN); res.next = nx;
  }
  if (res.cond === 'Difficult' && res.c === 'g') res.c = 'o';
  return res;
}
function renderCheckin() {
  const grid = $('#ciGrid'); if (!grid) return;
  const sid = $('#ciStation').value, s = ST[IDX[sid]];
  grid.innerHTML = PRIV.runners.map(r => {
    const inE = EVENTS.filter(e => (e.r === r || e.r === '*') && e.st === sid && e.k === 'in').pop(), outE = EVENTS.filter(e => (e.r === r || e.r === '*') && e.st === sid && e.k === 'out').pop();
    const cond = (EVENTS.filter(e => e.r === r && e.k === 'cond').pop() || {}).v;
    return `<div class="ci" data-r="${r}"><div class="top"><b>${r}</b><span class="mono"><span>${inE ? 'in ' + hm(inE.t) : '—'}</span> · <span>${outE ? 'out ' + hm(outE.t) : '—'}</span></span></div>
    <div class="btns"><button class="btn ${inE ? 'on' : 'ghost'}" data-k="in">In</button><button class="btn ${outE ? 'on' : 'ghost'}" data-k="out"${sid === 'FIN' ? ' disabled' : ''}>Out</button></div>
    <div class="cond">${['Good', 'Moderate', 'Difficult'].map(c => `<button data-c="${c}" class="${cond === c ? 'on' : ''}">${c}</button>`).join('')}</div></div>`;
  }).join('');
  $$('.ci', grid).forEach(card => {
    const r = card.dataset.r;
    $$('[data-k]', card).forEach(b => b.addEventListener('click', () => { addEvent({ k: b.dataset.k, st: sid, r, t: evTime(sid) }); renderCheckin(); ciSaid(`<b>${r}</b> <span>${b.dataset.k === 'in' ? 'In' : 'Out'} · ${sid} · ${hm(evTime(sid))}</span>`); }));
    $$('[data-c]', card).forEach(b => b.addEventListener('click', () => { addEvent({ k: 'cond', st: sid, r, v: b.dataset.c, t: now() }); renderCheckin(); ciSaid(`<b>${r}</b> <span>${b.dataset.c}</span>`); }));
  });
}
const ciSaid = m => say($('#ciStatus'), m + ' · <span>' + (PRIV.endpoint ? 'saved, syncing' : 'saved on this phone') + '</span>', 'ok');

let wxCache = { t: 0, key: '', txt: '—' };
async function weather(lat, lon) {
  const k = lat.toFixed(2) + lon.toFixed(2); if (now() - wxCache.t < 10 * MIN && wxCache.key === k) return wxCache.txt;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation`);
    const j = await r.json(); const c = j.current;
    wxCache = { t: now(), key: k, txt: `${Math.round(c.temperature_2m)}° · ${Math.round(c.wind_speed_10m)} km/h${c.precipitation > 0 ? ' · rain' : ''}` };
  } catch { wxCache = { t: now(), key: k, txt: 'n/a' }; }
  return wxCache.txt;
}

function renderDash() {
  if (!$('#runnerTbl')) return;
  const t = now(), p = planAt(t), states = PRIV.runners.map(r => runnerState(r, t));
  // top
  $('#dClock').textContent = t < R.start ? 'Pre-race' : t < FIN.arr ? (() => { const m = Math.floor((t - R.start) / MIN); return `${Math.floor(m / 60)}:${pad(m % 60)}`; })() : 'Done';
  $('#dSec').textContent = p.state === 'run' ? p.sec : p.state === 'stop' ? 'At ' + p.st.id : p.state === 'pre' ? 'S1 at 11:00' : 'Finished';
  const nextDep = ST.find(s => s.dep && s.dep > t);
  $('#dNext').textContent = nextDep ? `${nextDep.id === 'START' ? 'Start' : nextDep.id} ${hm(nextDep.dep)} · ${Math.round((nextDep.dep - t) / MIN)} min` : '—';
  const wxSt = p.st || p.to || ST[0]; weather(wxSt.lat, wxSt.lon).then(x => { const el = $('#dWx'); if (el) el.textContent = x; });
  // runners table
  $('#runnerTbl tbody').innerHTML = states.map(s => `<tr><td><span class="dot ${s.c}"></span><b class="st">${s.id}</b></td><td>${esc(s.note)}</td><td class="n">${s.inT ? hm(s.inT) : '—'}</td><td class="n">${s.outT ? hm(s.outT) : '—'}</td><td class="n">${s.margin == null ? '—' : s.margin + ' min'}</td><td>${esc(s.cond || '—')}</td><td class="n">${s.eta ? hm(s.eta) : '—'}</td></tr>`).join('');
  // stations table
  $('#stationTbl tbody').innerHTML = ST.filter(s => s.id !== 'START').map(s => {
    const evs = EVENTS.filter(e => e.st === s.id), status = (evs.filter(e => e.k === 'status').pop() || {}).v || '—', last = evs.filter(e => e.k === 'in' || e.k === 'out' || e.k === 'status').sort((a, b) => a.at - b.at).pop();
    const L = (PRIV.leads || {})[s.id] || {};
    return `<tr><td>${s.id === 'FIN' ? 'Finish' : s.id}</td><td>${esc(L.lead || '—')}</td><td>${esc(status)}</td><td class="n">${last ? hm(last.at || last.t) : '—'}</td></tr>`;
  }).join('');
  // map
  drawMap($('#dashMap'), { doneKm: p.state === 'pre' ? null : p.km, pack: p.state === 'pre' ? null : pointAtKm(p.km), runners: t < R.start ? [] : states.map(s => ({ id: s.id, c: s.c, p: pointAtKm(s.km) })) });
  // alerts
  const A = [];
  if (t >= R.start && t < FIN.arr + 3 * 3600e3) {
    states.forEach(s => {
      if (s.c === 'r') A.push(['r', `<b>${s.id}</b> <span>will miss or has missed a hard departure. Race director decides: continue with support or withdraw.</span>`]);
      if (s.late >= 30) A.push(['o', `<b>${s.id}</b> <span>is ${s.late} min behind section pace. Check in: “How are you feeling?”</span>`]);
      if (s.cond === 'Difficult') A.push(['o', `<b>${s.id}</b> <span>condition Difficult. Medical check at the next station; hydration and calories.</span>`]);
    });
    ST.filter(s => s.id !== 'START').forEach(s => {
      const anyIn = EVENTS.some(e => e.st === s.id && e.k === 'in');
      if (!anyIn && t > s.arr + 20 * MIN && t < (s.dep || s.arr) + 60 * MIN) A.push(['o', `<span>${s.id === 'FIN' ? `No check-in from the finish 20 min after expected arrival (${hm(s.arr)}). Call the station lead:` : `No check-in from ${s.id} 20 min after expected arrival (${hm(s.arr)}). Call the station lead:`}</span> <b>${esc(((PRIV.leads || {})[s.id] || {}).lead || '')}</b>`]);
    });
  }
  EVENTS.filter(e => e.k === 'incident').slice(-5).reverse().forEach(e => A.push(['r', `<span>Incident</span> · ${esc(e.when || hm(e.t))} · ${esc(e.st)} · ${esc(e.v)}`]));
  $('#alerts').innerHTML = A.length ? A.map(([c, m]) => `<li class="${c}">${m}</li>`).join('') : '<li class="note">No alerts.</li>';
  // forms + waivers
  const fs = $('#formsStatus'); if (fs) fs.innerHTML = PRIV.runners.map(r => { const ok = REMOTE && REMOTE.forms && REMOTE.forms.includes(r); return `<span class="${REMOTE ? (ok ? 'yes' : 'no') : ''}" title="${ok ? 'form received' : 'missing'}">${r}${REMOTE ? (ok ? ' ✓' : '') : ''}</span>`; }).join('') + (REMOTE ? '' : '<p class="note">Connect the backend to see which forms arrived.</p>');
  renderPeople(); bcCount();
  const wc = $('#waiverCount'); if (wc) wc.textContent = REMOTE && REMOTE.waivers != null ? `${REMOTE.waivers.total} total · ${REMOTE.waivers.runners} runners · ${REMOTE.waivers.relay} relay · ${REMOTE.waivers.crew} crew` : '—';
}

const normName = s => String(s || '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();
let onlyMissing = false;
function renderPeople() {
  const tb = $('#peopleTbl tbody'); if (!tb) return;
  const signed = (REMOTE && REMOTE.signed) || [];
  const byRole = {}, byName = {}, used = new Set();
  const put = (m, k, x) => { if (k && k !== 'other' && (!m[k] || x.t > m[k].t)) m[k] = x; };
  signed.forEach(x => { put(byRole, normName(x.role), x); put(byName, normName(x.name), x); });
  let s = 0, m = 0, f = 0; const missing = [];
  $$('tr', tb).forEach(tr => {
    const n = tr.dataset.person, hit = byRole[normName(n)] || byName[normName(n)]; if (hit) used.add(hit);
    const w = $('.w', tr);
    if (!REMOTE) w.textContent = '—';
    else if (hit) { s++; w.innerHTML = `<span class="dot g"></span>${esc(fmt(hit.t))}<span class="sub">${esc(hit.name)} · ${esc(hit.page)}</span>`; }
    else { m++; missing.push(n); w.innerHTML = '<span class="dot r"></span><span>Not signed</span>'; }
    if (tr.dataset.runner) { const ok = REMOTE && REMOTE.forms && REMOTE.forms.includes(tr.dataset.runner); if (ok) f++; $('.rf', tr).innerHTML = REMOTE ? (ok ? '<span class="dot g"></span><span>Received</span>' : '<span class="dot r"></span><span>Missing</span>') : '—'; }
    tr.hidden = onlyMissing && !!hit;
  });
  if (REMOTE) { $('#pSigned').textContent = s; $('#pMissing').textContent = m; $('#pForms').textContent = f + '/' + $$('#peopleTbl tr[data-runner]:not([data-runner=""])').length; const nt = $('#pNote'); if (nt) nt.hidden = true; }
  tb.dataset.missing = missing.join(', ');
  const ex = $('#pExtra'); if (ex) { const seen = new Set(), list = signed.filter(x => !used.has(x) && !seen.has(normName(x.name)) && seen.add(normName(x.name)) && !signed.some(y => used.has(y) && (normName(y.name) === normName(x.name) || (normName(x.role) !== 'other' && normName(y.role) === normName(x.role))))); ex.hidden = !REMOTE || !list.length; ex.innerHTML = list.length ? '<b>Signed, not matched to the list:</b> ' + list.map(x => `<span class="dot g"></span>${esc(x.name)} <small>(${esc(x.page)}${x.role && x.role !== 'Other' ? ' · ' + esc(x.role) : ''} · ${esc(fmt(x.t))})</small>`).join(' &nbsp; ') : ''; }
}

const TPL = {
  start: ['Race starts Saturday 28.11 at 11:00', 'Hi all,\n\nQuick reminder before race day:\n- Start: Saturday 28.11, 11:00 at IMD Lausanne. Finish Sunday 29.11, 12:34 at IMD.\n- Your section, start time, station and ride are on your personal card (in the email you got when you signed, or on the race page).\n- Departure times are hard times.\n- Reflective vest and headlamp are mandatory in the dark.\n- Bring ID or passport: the route crosses into France.\n- Sleeping in a van? Bring a sleeping bag. Airbnb? Bring your own towel.\n\nSee you at the lake!\nDavid'],
  change: ['Schedule change', 'Hi all,\n\nSchedule change: [what changed].\nNew time: [time] at [station].\nEverything else stays the same.\n\nDavid'],
  weather: ['Weather update for race day', 'Hi all,\n\nWeather for race day: [forecast].\nPlease bring [warm layers / rain jacket / gloves].\n\nDavid'],
};
function bcCount() {
  const el = $('#bcCount'); if (!el) return;
  if (!REMOTE) { el.textContent = 'Connecting to the backend…'; return; }
  const aud = $('#bcAud').value, rows = (REMOTE.signed || []).filter(x => aud === 'all' || x.page === aud);
  const n = new Set(rows.map(x => normName(x.name) + '|' + normName(x.role))).size;
  el.textContent = `About ${n} people will receive it.` + (REMOTE.quota != null ? ` Emails left today: ${REMOTE.quota}.` : '');
}
function initBroadcast() {
  const f = $('#bcForm'); if (!f) return;
  $$('[data-tpl]', f).forEach(b => b.addEventListener('click', () => { const t = TPL[b.dataset.tpl]; $('#bcSubj').value = t[0]; $('#bcMsg').value = t[1]; }));
  $('#bcAud').addEventListener('change', bcCount);
  const st = $('#bcStatus'), go = $('#bcGo'), ok = $('#bcConfirm'), no = $('#bcCancel');
  const reset = () => { go.hidden = false; ok.hidden = true; no.hidden = true; };
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!PRIV.endpoint) return say(st, 'The backend is not connected yet.', 'err');
    bcCount(); go.hidden = true; ok.hidden = false; no.hidden = false;
    say(st, 'Check the text, then press “Confirm: send now”. Emails cannot be recalled.');
  });
  no.addEventListener('click', () => { reset(); st.hidden = true; });
  ok.addEventListener('click', async () => {
    ok.disabled = true; say(st, 'Sending…');
    try {
      const r = await post({ type: 'broadcast', key: PRIV.key, admin: PRIV.adminKey, audience: $('#bcAud').value, subject: $('#bcSubj').value.trim(), message: $('#bcMsg').value.trim(), site: new URL('../index.html', location.href).href });
      if (!r || !r.ok) throw new Error(r && r.error || 'Server error');
      say(st, `Sent to ${r.sent} people. Emails left today: ${r.quota}.`, 'ok'); if (REMOTE) REMOTE.quota = r.quota; f.reset();
    } catch (err) { say(st, 'Not sent: ' + esc(err.message), 'err'); }
    ok.disabled = false; reset();
  });
  bcCount();
}
function csv() {
  const head = ['id', 'event_time', 'station', 'runner', 'kind', 'value', 'note', 'by', 'logged_at'];
  const rows = EVENTS.slice().sort((a, b) => a.t - b.t).map(e => [e.id, fmt(e.t), e.st, e.r, e.k, e.v || '', (e.note || '').replace(/\n/g, ' '), e.by || '', fmt(e.at || e.t)]);
  return [head, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}
function initCrew() {
  if (!$('#ciGrid')) return;
  $('#ciStation').addEventListener('change', renderCheckin);
  // default station: the one the pack is heading to
  const p = planAt(now()); const target = p.state === 'stop' ? p.st.id : p.state === 'run' ? p.to.id : 'A1'; if (!store.get('stray-pick-' + PAGE)) $('#ciStation').value = target;
  $$('[data-status]').forEach(b => b.addEventListener('click', () => { const sid = $('#ciStation').value; addEvent({ k: 'status', st: sid, r: '', v: b.dataset.status, t: now() }); ciSaid(`<b>${sid}</b> <span>${b.dataset.status}</span>`); }));
  $('#allIn').addEventListener('click', () => { const sid = $('#ciStation').value, t = evTime(sid); PRIV.runners.forEach(r => { if (!EVENTS.some(e => e.r === r && e.st === sid && e.k === 'in')) addEvent({ k: 'in', st: sid, r, t }); }); renderCheckin(); ciSaid(`<span>All in at ${sid} ${hm(t)}</span>`); });
  $('#allOut').addEventListener('click', () => { const sid = $('#ciStation').value, t = evTime(sid); if (sid === 'FIN') return; PRIV.runners.forEach(r => { if (!EVENTS.some(e => e.r === r && e.st === sid && e.k === 'out')) addEvent({ k: 'out', st: sid, r, t }); }); renderCheckin(); ciSaid(`<span>All out at ${sid} ${hm(t)}</span>`); });
  $('#csvCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(csv()); say($('#ciStatus'), 'Log copied as CSV.', 'ok'); } catch { say($('#ciStatus'), 'Copy was blocked by the browser.', 'err'); } });
  $('#csvDl').addEventListener('click', e => { const b = new Blob([csv()], { type: 'text/csv' }); e.currentTarget.href = URL.createObjectURL(b); });
  $('#syncNow').addEventListener('click', () => { flush().then(pull); });
  initBroadcast();
  $('#pOnlyMissing').addEventListener('click', e => { onlyMissing = !onlyMissing; e.currentTarget.classList.toggle('on', onlyMissing); renderPeople(); });
  $('#pCopyMissing').addEventListener('click', async () => { const t = $('#peopleTbl tbody').dataset.missing || ''; try { await navigator.clipboard.writeText(t); say($('#ciStatus'), 'Log copied as CSV.'.replace('Log copied as CSV.', 'Names copied.'), 'ok'); } catch { } });
  if (PRIV.poltrax) { const box = $('#dashPoltrax'); box.hidden = false; box.innerHTML = `<iframe src="${esc(PRIV.poltrax)}" title="Live tracking" loading="lazy"></iframe>`; }
  renderCheckin(); renderDash(); flush().then(pull);
  setInterval(() => { renderDash(); }, 30e3);
  setInterval(() => { flush().then(pull); }, 45e3);
  window.addEventListener('online', () => flush().then(pull));
}

initGate();

/* ---------- offline cache (published site only) ---------- */
try {
  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
    navigator.serviceWorker.register((PAGE === 'info' ? '' : '../') + 'sw.js').catch(() => { });
  }
} catch { }
})();
