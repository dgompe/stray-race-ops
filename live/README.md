# STRAY Live

Public page to follow the Lake Tour Edition. One screen: a tilted panorama of the lake with the Alps on the horizon, times, join points, places, runners, vans, pledges, partners.

## Put it online

Copy the `live/` folder into the `stray-race-ops` repository, next to `assets/`. Push. The page is then at:

    https://dgompe.github.io/stray-race-ops/live/

It must sit there because it reads `../assets/js/race.js`, the fonts and the logos from the race-ops site.

## What updates by itself

| Change this | Where | Result on the live page |
|---|---|---|
| Station times, names, km, join points, route | `assets/js/race.js` (race-ops site) | Map, tags, panels, clock, ETAs |
| Pledges | the pledge Sheet of the main site | "Pledged so far" and the ranking, every minute |
| Tracker positions | the feed (below) | Runner photos and vans move on the map |
| Runner photo files | `charity-ultra/assets/runners/` | Large photo in the runner panel |
| Partner logos | `assets/logos/` (race-ops site) | Partner band |

## What you edit by hand

- `places.js`: the emoji stickers people see when they zoom in (Christmas markets, Chillon, IOC, Vidy and so on). One block per place: emoji, name, position, one line for the map, a paragraph, a link. Opening info was checked on 15 Nov 2026. Check it again the week before the race.
- `CONFIG` at the top of the script in `index.html`: runners, vans, partners, the pledge link behind the QR code.

## Connect the GPS trackers (Poltrax)

Until a feed is connected the page shows the planned position and says "By schedule". Vans stay hidden until they send a position.

1. Poltrax gives one URL with a private key in it. It goes in `POLTRAX_URL` in the script, never in the page.
2. Follow the five steps at the top of `backend/Tracker.gs`.
3. Paste the web-app URL into `CONFIG.feedUrl` in `index.html`.
4. In `CONFIG.runners` and `CONFIG.vehicles`, set each `tracker` to the id or bib Poltrax uses. If Poltrax has the full names (and the vans are called Sprinter, Van A, Van B), you can leave it empty: the page matches by name.

The page asks the feed every 20 s. If the feed fails, or a tracker is silent for 12 minutes, it falls back to the schedule or shows "Last seen".

The trackers send over the mobile network (LTE-M). Where there is no signal they keep logging and upload once back in range. On the page that shows as "Last seen" on a runner, or "Last signal hh:mm" in the top bar when every tracker is out of range.

Backup: Poltrax also runs the event on their own live map. If the feed has a bad moment, put that link in `"poltrax"` in `race.js`. A "Poltrax map" button appears and opens their map inside the panel.

## Test before race day

- `live/?view=flat` opens the flat, north-up map instead of the panorama. The 2D / 3D button does the same.
- `live/?demo` runs the whole race in about four minutes with simulated runners and vans.
- `live/?t=2026-11-28T21:30` shows the page at that moment.
- `live/#A4`, `live/#montreux`, `live/#L2` open one point directly. Good for sharing "join here" links.

## Files

- `index.html` the page (styles and script inside)
- `places.js` places along the route
- `vendor/` MapLibre GL 4 (the 3D map), QR generator, lake shape
- `runners/` small runner photos for the map
- `backend/Tracker.gs` the feed script for Google Apps Script
- `PROMPT.md` the build brief
