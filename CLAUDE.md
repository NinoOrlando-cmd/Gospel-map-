# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

GospelMap is a ministry tool for street evangelists to find high-attendance events across Massachusetts — and eventually the entire US and world. The goal is a growing community of preachers using real-time crowd data to be strategic about reaching people with the Gospel.

**Mission:** Equip street preachers with real-time crowd data so they can go where the people are, preach the Word, and build a global network of evangelists doing the same.

**Creator:** Sora (@ninoorlando744 on TikTok)
**Live URL:** https://gospel-map.vercel.app
**GitHub:** https://github.com/NinoOrlando-cmd/Gospel-map-

## Architecture

- **Frontend:** Single file `index.html` (vanilla JS + Leaflet.js map)
- **Backend:** Vercel serverless functions in `api/`
- **Hosting:** Vercel — auto-deploys on every GitHub push to `main`
- **Map:** Leaflet.js with CartoDB dark tiles
- **Database (planned):** Supabase for user accounts + legacy/annual events

## API Functions

| File | Purpose | Env Variable |
|------|---------|-------------|
| `api/ticketmaster.js` | Sports, concerts, major venues in MA | `TICKETMASTER_API_KEY` |
| `api/serpapi` | Google Events scraper — 4 MA zones | `SERPAPI_KEY` |
| `api/searchapi` | Google Events scraper — 4 MA zones | `SEARCHAPI_KEY` |

All API keys are in Vercel environment variables — never hardcode them.

**4 MA Zone Strategy** — each Google Events API covers all of Massachusetts via 4 zones:
- **Boston Core** — Boston, Cambridge, Somerville, East Boston
- **North Shore** — Salem, Lynn, Gloucester, Beverly, Peabody
- **South Shore** — Quincy, Brockton, Plymouth, Weymouth
- **West MA** — Worcester, Springfield, Lowell, Lawrence

**Data flow:** Frontend calls all 3 endpoints in parallel via `Promise.allSettled`, merges and deduplicates by lowercased event name. If all APIs fail/return nothing, `getFallbackEvents()` returns hardcoded Boston-area events. Events missing coordinates are geocoded via OpenStreetMap Nominatim; zone center coords are used as fallback with a small random offset to prevent pin stacking.

**Event schema:** `{ id, name, category, date, time, location, lat, lng, crowd, capacity, description, source, url }`
- `category`: `festival` | `sports` | `concert` | `community` | `market`
- `crowd`: integer estimated attendance (drives map pin size, color, and sort order)
- Crowd color scale: green < 3K → blue < 10K → gold < 30K → orange < 100K → red ≥ 100K

All handlers set `Cache-Control: s-maxage=3600` (1-hour Vercel CDN cache).

## Deployment

Push to `main` → Vercel auto-deploys in ~60 seconds → live at gospel-map.vercel.app.

```bash
vercel dev        # local dev server with API functions at localhost:3000
vercel deploy     # manual preview deploy
vercel --prod     # manual production deploy
```

## Known Issues & Watch-outs

### File Corruption (Critical)

When files are transferred via email or Microsoft Teams, backtick (`` ``` ``) and ellipsis (`...`) characters get inserted as standalone lines in JavaScript files. This breaks code silently.

**Fix:** Check for and remove any lines containing ONLY backticks or ellipsis. Use direct GitHub editing or Claude Code — never transfer JS files through Teams/email.

### Case Sensitivity

Vercel is case-sensitive. API files must be lowercase:
- `api/ticketmaster.js` ✅  `api/serpapi` ✅  `api/searchapi` ✅
- `api/Serpapi` ❌ (will 404)

## Roadmap

### Immediate
- [ ] Test all 3 API endpoints returning real data
- [ ] Add hardcoded annual MA events (Marathon, parades, 4th of July)

### Week 1 — Foundations
- [ ] PWA setup (manifest.json + service worker) — fixes Chrome mobile browser bar issue
- [ ] Geolocation "Find Events Near Me" button — replace city dropdown
- [ ] Legacy Events DB in Supabase — annual events stored in DB, not hardcoded

### Week 2 — Utility
- [ ] Weather widget on each event card (OpenWeatherMap free API)
- [ ] Preachability Score — indoor/outdoor recommendation for preachers
- [ ] Mobile UI polish

### Week 3 — Intelligence & Scale
- [ ] Cloudflare CDN in front of Vercel for caching and scale
- [ ] Verify all 4 MA zone queries returning good data
- [ ] Analyze Boston Open Data API for parade/permit data

### Week 4 — Community Launch
- [ ] Supabase user accounts (Google OAuth)
- [ ] One-tap outreach logging — log where you preached, how many heard the Gospel
- [ ] Ministry network map — dots showing where other preachers have gone
- [ ] First TikTok video using GospelMap live in the field

### Month 2–3
- [ ] User-submitted events — let preachers add events APIs miss
- [ ] Multi-state expansion — Ticketmaster covers all 50 states
- [ ] Push notifications for big upcoming events
- [ ] App Store version (after 1,000+ active users)

## Scaling Plan

| Traffic | Solution | Cost |
|---------|----------|------|
| 0–10K/day | Vercel free tier | Free |
| 10K–100K/day | Vercel Pro + Cloudflare CDN | ~$20/mo |
| 100K–1M/day | Cloudflare Workers | ~$50/mo |
| 1M+/day | Dedicated infrastructure | ~$200+/mo |

Vercel + Cloudflare is plug-and-play — no rebuild required at any tier.

## Tech Stack

- **Frontend:** Vanilla JS, Leaflet.js, CartoDB dark map tiles
- **Backend:** Node.js serverless functions on Vercel
- **APIs:** Ticketmaster, SerpApi, SearchApi (Google Events), Nominatim (geocoding)
- **Payments:** Stripe (donation button live)
- **Database (planned):** Supabase (free tier)
- **Auth (planned):** Supabase Auth with Google OAuth
- **CDN (planned):** Cloudflare
- **Version control:** GitHub · **IDE:** PyCharm + Claude Code

---

*"Go into all the world and preach the Gospel to every creature." — Mark 16:15*
