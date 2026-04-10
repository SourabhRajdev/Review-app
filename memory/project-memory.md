# Project Memory — Active State

> Snapshot of where the `reviewapp` project currently stands. Updated by
> the consolidator on every run; safe to read at the top of any session
> to get oriented quickly.

_Last consolidated: never_

## What this project is
A gamified Google review capture web app for restaurants and cafés.
Customer scans a QR code on the table, plays three short games (darts /
bowling / putt golf), taps through a few chip-selection screens, and
gets a ready-to-paste, SEO-optimized review on their clipboard. Goal:
generate reviews that are keyword-rich, location-anchored, and snippet-
worthy so the business ranks in Google's local 3-pack and Review
Justifications.

## Current architecture
- **Backend**: `server.js` — Node 22 + Express, ESM. Serves the static
  SPA from `public/`, exposes `POST /api/generate` (proxies Gemini),
  `POST /api/session` (writes to `data/sessions.json`), and
  `GET /api/sessions` (analytics).
- **AI provider**: Google Gemini Flash 2.5 (`gemini-2.5-flash`) via
  direct REST call to `generativelanguage.googleapis.com/v1beta`.
  `thinkingBudget: 0`, `maxOutputTokens: 400`, `temperature: 0.85`.
- **Frontend**: vanilla JS SPA in `public/`. Single `index.html` with
  9 screens, swapped via display toggling in `app.js`. Mobile-first
  dark theme in `styles.css`. No build step, no framework.
- **Games**: HTML5 Canvas — `public/games/{darts,bowling,putt}.js`.
  Each exports a global `start*Game(canvas, onComplete)` and returns
  a teardown closure.

## Flow (post-split)
1. landing → 2A visit type (auto) → 2B occasion (auto) → 2C menu →
   3 darts → 4 bowling → 5 putt → 6 bonus vibe → 7 generated review

## Key files
- `server.js` — backend + literal spec system prompt + Gemini call
- `public/index.html` — 9-screen SPA shell
- `public/app.js` — state, screen routing, chip logic, AI call
- `public/styles.css` — mobile-first dark theme
- `public/menu.js` — sample categorized menu (would be per-business in prod)
- `public/games/*.js` — three canvas games
- `.env` — `GEMINI_API_KEY` (gitignored)
- `data/sessions.json` — append-only analytics log (gitignored)

## What's done
- Backend with Gemini call + local fallback
- All 7 → 9 screens with split personalization
- Three working canvas games
- Copy-to-clipboard + Google / TripAdvisor deep links
- Session persistence + analytics endpoint

## What's open
- Possible "no numeric scores" rule for the AI prompt to fix the
  "8 out of 10" leakage observed with Gemini 2.5 Flash.
- Premium React/TS/Three.js redesign — scope not yet confirmed.
- Auth on `GET /api/sessions` before production.
- Real per-business menu fetching (currently hardcoded sample).

## Manual notes
<!-- Anything below this line is preserved verbatim by the consolidator. -->
