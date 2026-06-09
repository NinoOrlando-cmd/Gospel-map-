# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

GospelMap is a ministry tool for street evangelists to find high-attendance events across Massachusetts — and eventually the entire US and world.

**Creator:** Sora (@ninoorlando744 on TikTok)
**Live URL:** https://gospel-map.vercel.app
**GitHub:** https://github.com/NinoOrlando-cmd/Gospel-map-

## Architecture

- **Frontend:** Single file `index.html` — all CSS, HTML, and JS in one file. No build step, no bundler.
- **Backend:** Vercel serverless functions in `api/`
- **Hosting:** Vercel — auto-deploys on every GitHub push to `main`
- **Map:** Leaflet.js with CartoDB dark tiles
- **PWA:** `manifest.json` + `service-worker.js`

## Development

```bash
vercel dev        # local dev server with API functions at localhost:3000
vercel deploy     # manual preview deploy
vercel --prod     # manual production deploy
```

No build step, no tests, no linter. Edit → push to `main` → live in ~60 seconds.

## API Functions

| File | Purpose | Env Variable |
|------|---------|-------------|
| `api/ticketmaster.js` | Sports, concerts, major venues in MA | `TICKETMASTER_API_KEY` |
| `api/serpapi.js` | Google Events scraper — 4 MA zones | `SERPAPI_KEY` |
| `api/searchapi.js` | Google Events scraper — 4 MA zones | `SEARCHAPI_KEY` |

All API keys are in Vercel environment variables — never hardcode them. All handlers set `Cache-Control: s-maxage=3600`.

**4 MA Zone Strategy** — each Google Events API covers Massachusetts via 4 zone queries:
- **Boston Core** — Boston, Cambridge, Somerville, East Boston
- **North Shore** — Salem, Lynn, Gloucester, Beverly, Peabody
- **South Shore** — Quincy, Brockton, Plymouth, Weymouth
- **West MA** — Worcester, Springfield, Lowell, Lawrence

**`serpapi.js` vs `searchapi.js`** — nearly identical zone strategy, but differ in response shape: SerpAPI returns `data.events_results`; SearchAPI returns `data.events`. SearchAPI also appends `", Massachusetts, USA"` to the Nominatim geocode query. They are kept as separate fallbacks, not alternatives.

**Ticketmaster** — returns events pre-geocoded (lat/lng from venue). Events with null coordinates are filtered out (`.filter(ev => ev.lat && ev.lng)`). Google Events APIs return `null` coordinates and rely on Nominatim geocoding.

**Geocoding** — both Google Events APIs call Nominatim sequentially (Nominatim rate-limits parallel requests). Zone center coordinates are used as fallback with a small random offset to prevent pin stacking.

**Event ID prefixes:** `tm_` (Ticketmaster), `serp_` (SerpAPI), `sapi_` (SearchAPI).

## Data Flow

1. `loadEvents()` checks localStorage for a cache ≤ 24 h old (`CACHE_KEY` / `CACHE_TIME_KEY` / `CACHE_MAX_AGE`)
2. If cached events exist, render them immediately (stale-while-revalidate); spinner stays up during background refresh
3. If no cache, show `showSkeletonList()` (5 animated placeholder cards) while fetching
4. Frontend calls all 3 endpoints in parallel via `Promise.allSettled`
5. Results are merged and deduplicated by `(ev.name || '').toLowerCase().trim()`
6. Fresh results are saved to localStorage via `saveEventsCache()`; `renderAll()` replaces the stale view
7. If all APIs return nothing AND no cache exists, `showNoDataState()` renders an error message

**Event schema:** `{ id, name, category, date, time, location, lat, lng, crowd, capacity, description, source, url }`
- `category`: `festival` | `sports` | `concert` | `community` | `market`
- `crowd`: integer estimated attendance — drives pin size, color, and sort order
- Crowd color scale: green < 3K → blue < 10K → gold < 30K → orange < 100K → red ≥ 100K

## Frontend JS Structure (`index.html`)

Key globals:
- `map`, `markers[]` — Leaflet map instance and active marker array
- `allEvents[]` — merged event list from all APIs
- `activeFilter` — current category filter (`'all'` or a category string)
- `activeSort` — `'crowd'` (default), `'date'`, `'weekend'` (filters to Fri–Sun), or `'free'` (filters by empty URL or "free" in description). Note: `weekend` and `free` are filters, not sorts — they still sort by crowd.
- `loadingLive` — boolean; true while the background API fetch is in flight; keeps the spinner visible even when cached events are already displayed

Key functions:
- `loadEvents()` — checks localStorage cache, shows stale events or skeleton, fetches all 3 APIs in parallel, saves and re-renders fresh results
- `showSkeletonList()` — renders 5 animated placeholder cards while waiting for first fetch
- `showNoDataState()` — renders an error message when APIs return nothing and no cache exists
- `renderAll()` — clears markers and list, re-renders filtered+sorted events
- `getFiltered()` — applies `activeFilter` and `activeSort` to `allEvents`
- `filterEvents(type, el)` / `sortEvents(type, el)` — update state and call `renderAll()`
- `focusEvent(ev)` — pans map to event, opens popup, scrolls sidebar card into view
- `makeIcon(crowd)` — returns a sized/colored Leaflet `DivIcon` based on crowd number
- `initMap()` — initializes Leaflet with CartoDB dark tiles
- `locateMe()` — geolocation button handler; falls back gracefully if denied
- `changeCity(val)` — dropdown fallback for manual city selection
- `switchTab(tab)` — mobile tab toggle between list view and map view

CSS design tokens are in `:root` — `--gold`, `--dark`, `--surface`, `--surface2`, `--surface3`, `--text`, `--text-muted`, `--green`.

## Known Issues & Watch-outs

### Hardcoded Production URLs in Frontend

The fetch calls in `index.html` are hardcoded to `https://gospel-map.vercel.app/api/...` — not relative paths. Running `vercel dev` locally will still call the **production** API, not your local functions. To test local API changes, temporarily change those URLs to `http://localhost:3000/api/...`.

Two stale constants in `index.html`:
- `APP_URL` points to the old GitHub Pages URL (`ninoorlando-cmd.github.io/Gospel-map-`), not the live Vercel URL. Update when fixing share/copy features.
- `API_URL` is defined but never used — actual fetches use inline hardcoded strings (`https://gospel-map.vercel.app/api/...`).

### Service Worker Cache

`service-worker.js` uses cache name `gospelmap-v1`. When deploying breaking changes to `index.html` or static assets, bump the version (e.g. `gospelmap-v2`) so returning users get the updated app shell.

Service worker strategy: network-first for `gospel-map.vercel.app` API calls; cache-first for same-origin assets; network-with-cache-fallback for external resources (Leaflet, fonts), but map tiles (`cartocdn`) are never cached.

### File Corruption (Critical)

When files are transferred via email or Microsoft Teams, backtick (`` ``` ``) and ellipsis (`...`) characters get inserted as standalone lines in JavaScript files. This breaks code silently.

**Fix:** Check for and remove any lines containing ONLY backticks or ellipsis. Use direct GitHub editing or Claude Code — never transfer JS files through Teams/email.

### iPhone Notch / Dynamic Island

`<meta name="viewport" content="..., viewport-fit=cover">` and `padding: env(safe-area-inset-top) 0 0 24px` on `header` extend the header background into the notch/Dynamic Island. The `html` element has `background: #141414` (same as `--surface`) to fill any gap behind the status bar. `body` uses `height: 100dvh` (no padding-top). The mobile tab bar uses `padding-bottom: env(safe-area-inset-bottom)` for the home indicator. If you change the header color, update both `--surface` and the `html { background }` rule.

### Case Sensitivity

Vercel is case-sensitive. API files must be lowercase:
- `api/ticketmaster.js` ✅  `api/serpapi.js` ✅  `api/searchapi.js` ✅
- `api/Serpapi.js` ❌ (will 404)

## Tech Stack

- **Frontend:** Vanilla JS, Leaflet.js, CartoDB dark map tiles
- **Backend:** Node.js serverless functions on Vercel
- **APIs:** Ticketmaster, SerpApi, SearchApi (Google Events), Nominatim (geocoding)
- **Payments:** Stripe (donation button — live key in `STRIPE_LINK` constant)
- **Database (planned):** Supabase (free tier)
- **Auth (planned):** Supabase Auth with Google OAuth

---

*"Go into all the world and preach the Gospel to every creature." — Mark 16:15*
