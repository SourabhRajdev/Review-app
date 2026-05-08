# Project Memory — Active State

> Snapshot of where the `reviewapp` project currently stands.
> Updated: 2026-05-07

## What this project is

A gamified Google review capture web app for cafés/restaurants. Customer scans a QR code on the table → plays mini-games → taps through a few chip-selection screens → gets a ready-to-paste AI-generated review copied to clipboard. Goal: produce keyword-rich, location-anchored, snippet-worthy reviews that help the business rank in Google's local 3-pack.

---

## Repository structure

```
reviewapp/                         ← repo root
├── server.js                      ← Node 22 + Express backend (ESM)
├── public/                        ← legacy vanilla JS SPA
│   ├── index.html                 ← 9-screen SPA shell
│   ├── app.js                     ← routing, chips, AI call
│   ├── styles.css                 ← mobile-first dark theme
│   ├── menu.js                    ← hardcoded sample menu
│   └── games/{darts,bowling,putt}.js  ← canvas games
├── reviewapp-premium/             ← React/Vite/TS premium track (ACTIVE)
│   ├── src/
│   │   ├── App.tsx                ← screen router via AnimatePresence
│   │   ├── screens/               ← all screen components
│   │   ├── components/            ← shared UI components
│   │   ├── architecture/game/store.ts  ← Zustand game state
│   │   ├── design/                ← audio, haptics, motion tokens
│   │   └── styles/globals.css     ← global CSS + design tokens
│   ├── tailwind.config.ts         ← design system tokens
│   └── vite.config.ts             ← build config
├── memory/                        ← Claude memory layer
└── .env                           ← GEMINI_API_KEY (gitignored)
```

---

## Premium track (reviewapp-premium) — current state

### Tech stack
- React 18 + Vite + TypeScript
- Framer Motion 11 (animations)
- Tailwind CSS v3 (utility styling)
- Zustand 5 (game state)
- AssemblyAI (voice transcription via `/api/voice-transcribe`)
- Google Gemini Flash 2.5 (review generation via `/api/voice-generate` and `/api/generate`)

### Active game flow
```
entry → aboutYou → orderSelection → productGame → round2 → basketball 
→ vibeGame → slingshotGame → swipeGame → bubblePop → serviceGame 
→ sparkSlice (hard mode only) → generating → review
```

### Design system — "Warm Latte" (current, as of 2026-05-07)

**Palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#FAF9F7` | Screen background |
| `surface` | `#FFFFFF` | Cards |
| `surface-secondary` | `#FBF7F4` | Cream tinted areas |
| `surface-sunken` | `#F5EFE8` | Input backgrounds |
| `primary` | `#C67C4E` | Coffee brown — main accent |
| `primary-light` | `#E8B896` | Gradient start |
| `primary-hover` | `#A85E38` | Hover state |
| `primary-muted` | `rgba(198,124,78,0.1)` | Badge backgrounds |
| `ink` | `#1A0E08` | Primary text (dark on light) |
| `ink-secondary` | `#7A5C4A` | Secondary text |
| `ink-tertiary` | `#B09080` | Muted text |
| `ink-ghost` | `#D8C8BB` | Dividers, disabled |
| `success` | `#0D9E6F` | Emerald |
| `error` | `#E53E3E` | Red |

**Card style:**
```
background: #FFFFFF
border: 1px solid rgba(200,170,140,0.2)
border-radius: 20px
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.07)
```

**Selected card:**
```
background: #FFF8F3
border: 1px solid rgba(198,124,78,0.45)
box-shadow: 0 0 0 3px rgba(198,124,78,0.12), 0 4px 20px rgba(0,0,0,0.06)
```

**Primary button:**
```
background: linear-gradient(135deg, #E8B896 0%, #C67C4E 40%, #A05A32 75%, #8B4513 100%)
color: #FFFFFF
box-shadow: 0 4px 20px rgba(198,124,78,0.4), 0 1px 3px rgba(0,0,0,0.1)
```

**Screen background:**
```
radial-gradient(ellipse 80% 50% at 50% -5%, rgba(198,124,78,0.06) 0%, transparent 55%),
radial-gradient(ellipse 40% 30% at 85% 90%, rgba(232,184,150,0.04) 0%, transparent 50%),
#FAF9F7
```

**PLAYER GAME button (entry screen only):**
- Keeps amber gradient `linear-gradient(135deg, #FCD34D, #F59E0B, #D97706, #B45309)` with dark `#1A0E08` text — game energy preserved

### Key component behaviors
- **PrimaryButton**: coffee gradient, white text, shimmer sweep, `whileHover: y: -2`
- **AnimatedChip**: white unselected → `#FFF8F3` + coffee ring on select
- **ProgressBar**: warm track, coffee gradient fill for active segment
- **BackHeader**: arrow hovers to coffee primary, `whileHover: x: -2`
- **MascotRobot**: cream white body `#FFF8F3`, coffee strokes `#C67C4E`, amber antenna `#F59E0B`, animated float, bobbing, screen-aware eye positions
- **VoiceExpansion**: white idle button with coffee border; white expanded card; waveform bars in coffee color
- **SwipeCard**: swipe-left = error glow, swipe-right = success glow (JS color constants)

### Screen-specific notes
- **Round2Screen**: reactive card border/shadow that lerps emerald→amber→rose with slider position via `glowColor()` function
- **BasketballScreen**: canvas uses JS color constants (can't use CSS vars in Canvas 2D context) — updated to warm cream palette
- **SlingshotGameScreen**: warm cream arena bg, coffee/amber projectile, spilled phrase pills are white+coffee

### Backend API endpoints
- `POST /api/generate` — game-flow review generation (Gemini)
- `POST /api/voice-generate` — voice transcript → polished review (Gemini)
- `POST /api/voice-transcribe` — audio blob → transcript (AssemblyAI)
- `GET /api/sessions` — analytics log reader

### AI config
- Model: `gemini-2.5-flash`
- `thinkingBudget: 0`, `maxOutputTokens: 400`, `temperature: 0.85`
- Known issue: sometimes leaks numeric scores into prose ("8 out of 10") — candidate fix: add "never mention numeric scores" rule to RULES block

---

## Legacy track (public/) — current state
- Vanilla JS SPA, 9 screens
- Canvas games: darts, bowling, putt
- Same Gemini backend
- Not actively being developed — premium track is the focus

---

## What's done (premium track)
- Full "Warm Latte" light design system (tailwind + CSS vars)
- All 14 active screens styled with white cards, coffee accents, proper contrast
- Framer Motion directional page transitions (x-axis slide)
- Voice entry flow: record → AssemblyAI transcribe → Gemini polish → ReviewScreen
- Game flow: 6 rounds → Generating → ReviewScreen
- Auto-copy review to clipboard on ReviewScreen load (400ms delay)
- Confetti on ReviewScreen
- MascotRobot: screen-aware, tappable, animated

## What's open / next possible work
- SparkSliceScreen light mode audit (complex, not fully verified)
- "Never mention numeric scores" Gemini prompt fix
- Per-business customization (menu, business name, neighbourhood via URL params)
- Auth on analytics endpoint
- Real menu data (currently hardcoded in `legacyData.ts`)
- User has not yet given feedback on the "Warm Latte" redesign

## Manual notes
<!-- Anything below this line is preserved verbatim by the consolidator. -->
