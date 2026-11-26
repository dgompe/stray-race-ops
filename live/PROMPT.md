# Build prompt: STRAY Live

The brief the page in this folder was built from. Use it to rebuild or extend the page.

---

Build **STRAY Live**: one public web page where anyone can follow the STRAY Lake Tour Edition (167.9 km around Lac Léman, start Sat 28 Nov 2026 11:00 at IMD Lausanne, finish Sun 29 Nov about 12:34).

## Who it is for

Friends, family, donors and people who want to join along the route. They open it on a phone, often outdoors and at night, or see it on a big screen at IMD. They want four answers fast: where is the pack now, when does it reach a place near me, where can I join and what is there, how much is pledged.

## Layout

- One screen. The page never scrolls. The map fills it.
- Top bar: STRAY logo, "Lake Tour Edition · Live", data status, race clock (countdown before the start), night toggle.
- On the map: a "Now" card top left, layer switches bottom left, a "Pledged so far" card with a QR code bottom right (large screens).
- Under the map: the full-loop runners with photos and the three vans, a "Runners" button, a "Make a pledge" button that carries the live total.
- Last row: partners, always moving.
- Details open in a panel (right side on desktop, bottom sheet on phone). The panel may scroll inside. The page does not.
- Spacing on a 4 · 8 · 12 · 16 · 24 scale. Nothing touches an edge or another element.

## Map

- A tilted panorama, not a street map. The camera looks south-east across the lake from above Lausanne, so IMD is in the foreground and the Alps are at the back.
- A horizon band on top: line-drawn ranges with snow caps, each peak at its true bearing with name and height (Mont Blanc, Dents du Midi, Dent d'Oche, Grammont, Les Diablerets). It slides when the map turns. Clouds drift. Sun by day, moon at night.
- The ground: paper land, lilac lake with an ink shoreline, the route as a thick ink line, a purple grid that tilts with the map.
- It moves: a fly-in on load, a slow sway when nobody touches it, a steamer crossing the lake, sailboats and swans bobbing. Drag with two fingers or the right mouse button to turn. A 2D button gives a flat, north-up map.
- The part already run is drawn in green. Small km marks every 10 km.
- Aid stations: a dot and a tag with id and arrival time only. Click for everything.
- Join points: red diamonds. 50K, 30K, 20K, last 5 km from St-Sulpice, last 2 km, last 1 km, each with the time the pack passes. The last 5, 2 and 1 km say: you are welcome to run along or follow by bike, bring your reflective vest.
- Places: emoji stickers in square ink-ruled tiles (🎄 🏰 🍇 🍴 ⛲ 💧 🏅). They appear as people zoom in, then a name, then one line of current info. Click to fly there and read a paragraph, the time the pack passes, directions and the official link.
- Runners: their photos. Runners close together merge into one stack with a count.
- Vans: 🚐 Sprinter, Van A, Van B with their names. Hidden until they send a position.
- Labels never overlap each other or the cards. The lower-priority label hides until the user zooms in.
- Real street detail fades in only when zoomed in close.
- Every point has its own link (`#A4`, `#montreux`).
- Partners: one band that never stands still. All logos move; the two main partners come round larger, in inverted blocks.

## Data: must stay up to date without edits to this page

- Schedule, stations, join points and route: `../assets/js/race.js`, shared with the race-ops site.
- Pledges: the leaderboard endpoint of the main site's Google Sheet. Total pledged, total received, ranking. Refresh every minute. The QR code opens the pledge form.
- Live positions of runners and vans: one URL, `CONFIG.feedUrl`, polled every 20 s. Tracker-agnostic. Poltrax goes behind `backend/Tracker.gs`.
- With no feed, a failed feed, or stale data: planned position from the schedule, labelled "By schedule". Never show a guessed position as live.
- When live: minutes ahead or behind plan, and an estimated arrival at the next station.

## Style

Match the STRAY sites exactly: ink `#2e2452`, paper `#f6efe9`, Stick No Bills for display type, Archivo for text, IBM Plex Mono for labels. Square corners, 1 px ink rules, no shadows, no gradients. Night mode uses the race-ops tokens and turns on by itself after dark.

## Voice

Short, plain, specific. Times in 24 h, Europe/Zurich. No marketing copy.

## Test hooks

`?demo` runs the whole race in about four minutes with simulated trackers. `?t=2026-11-28T21:30` shows the page at that time.

## Not in scope

Private ops data, payment, sign-up forms. Those stay on the existing sites.
