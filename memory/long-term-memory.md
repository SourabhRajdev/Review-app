# Long-Term Memory — Distilled Facts, Preferences, Patterns

> Items in this file are durable. They survive across all conversations.
> Updated: 2026-05-07

---

## User profile
- Email: rajdevaru7@gmail.com
- Building a commercial SaaS product — gamified review capture for cafés/restaurants
- Communicates fast, terse, emotionally direct — frustration expressed clearly and honestly
- Wants fast execution, not explanations
- Judges UI quality against Stripe, Google, Meta, Apple standards
- Prefers light-mode, premium, clean UI — NOT dark mode

---

## Collaboration preferences
- **Action first** — never explain before doing unless direction is truly ambiguous
- **Terse responses** — no preambles, no "what I just did" summaries
- **Confirm scope** only for large rewrites where direction is unclear
- **Screenshots are authoritative** — read via Read tool before responding
- **"Stop right now"** = halt immediately, acknowledge, ask for direction
- **Light theme is the default** — user rejected dark glassmorphism ("inverted the freaking screen")
- **Design reference**: Stripe, Google, Meta, Apple — white/light, high contrast, premium feel

---

## Stack & code patterns (reviewapp-premium)
- React 18 + Framer Motion 11 + Tailwind CSS v3 + Zustand 5 + Vite + TypeScript
- **No new npm packages** — work within existing stack only
- Inline `style` props for multi-stop gradients (Tailwind can't do them cleanly)
- Both `backdropFilter` AND `WebkitBackdropFilter` needed for any backdrop blur
- Canvas color constants must be JS constants (e.g. `const RIM_COLOR = '#F59E0B'`) — CSS vars cannot be used in Canvas 2D `ctx` operations
- Font: `Outfit` — loaded via `@import` in globals.css
- Design tokens live in `tailwind.config.ts` as single source of truth
- CSS custom properties in `src/styles/globals.css` mirror Tailwind tokens

---

## Design system — "Warm Latte" (active as of 2026-05-07)

| Token | Value | Notes |
|-------|-------|-------|
| `bg` | `#FAF9F7` | Warm off-white background |
| `surface` | `#FFFFFF` | Card background |
| `surface-secondary` | `#FBF7F4` | Cream tinted |
| `surface-sunken` | `#F5EFE8` | Input background |
| `primary` | `#C67C4E` | Coffee brown accent |
| `primary-light` | `#E8B896` | Gradient start |
| `primary-hover` | `#A85E38` | Hover |
| `primary-muted` | `rgba(198,124,78,0.1)` | Badge bg |
| `ink` | `#1A0E08` | Primary text |
| `ink-secondary` | `#7A5C4A` | Secondary text |
| `ink-tertiary` | `#B09080` | Muted |
| `ink-ghost` | `#D8C8BB` | Dividers, disabled |
| `success` | `#0D9E6F` | Emerald |
| `error` | `#E53E3E` | Red |

Card: `#FFF white, 1px solid rgba(200,170,140,0.2), border-radius 20px, box-shadow 0 1px 3px rgba(0,0,0,0.04) 0 4px 20px rgba(0,0,0,0.07)`
Selected: `#FFF8F3, coffee border, 0 0 0 3px rgba(198,124,78,0.12) ring`
Primary button gradient: `#E8B896 → #C67C4E → #A05A32 → #8B4513`, white text
PLAYER GAME button (entry only): amber gradient kept for game energy, dark text

---

## Recurring decisions
- **Zero logic changes during UI work** — game logic, navigation, store, API calls never touched
- **Keep AssemblyAI STT** — pre-recorded REST, not streaming WebSocket (fixed duplicate word bug)
- **Keep Gemini Flash 2.5** — `thinkingBudget: 0`, `maxOutputTokens: 400`, `temperature: 0.85`
- **Auto-copy on ReviewScreen** — 400ms delay before clipboard write (lets page animation settle)
- **Framer Motion for all component animation** — CSS keyframes only for ambient/performance effects

---

## Things to NEVER do
- **Never commit or push** without explicit user instruction
- **Never hardcode secrets** — `.env` only (gitignored)
- **Never go dark mode** without explicit instruction — user rejected it strongly
- **Never change game logic, questions, API payloads, navigation** during visual work
- **Never add new npm packages**
- **Never skip `npx tsc --noEmit`** after major changes
- **Never reference old dark tokens** (`rgba(18,10,4,...)`, `rgba(232,217,196,0.1)`, `#080503`) — these are from the rejected dark theme

---

## Manual notes
<!-- Anything below this line is preserved verbatim by the consolidator. -->
# userEmail
rajdevaru7@gmail.com
