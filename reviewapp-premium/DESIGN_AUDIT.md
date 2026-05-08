# Design Audit — reviewapp-premium

## Aesthetic Direction

Roasted warmth meets precision craft: cream-warm surfaces, espresso-dark ink, every tap has weight. Feels like it was built by people who actually care about coffee.

---

## Token System

### Colors

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#FAF8F5` | Warm cream page background |
| `--color-surface` | `#FFFFFF` | Card/modal surface |
| `--color-surface-secondary` | `#F2EFE9` | Subtle section differentiation |
| `--color-surface-sunken` | `#EEEBE4` | Inputs, recessed areas |
| `--color-primary` | `#B8622D` | Espresso accent — CTA, highlights |
| `--color-primary-light` | `#CF7A44` | Lighter accent for hover states |
| `--color-primary-hover` | `#A35424` | Darker hover state |
| `--color-primary-muted` | `rgba(184,98,45,0.12)` | Subtle tinted backgrounds |
| `--color-primary-glow` | `rgba(184,98,45,0.28)` | Focus rings |
| `--color-ink` | `#1C1612` | Near-black warm ink |
| `--color-ink-secondary` | `#6B5E54` | Body copy on cream |
| `--color-ink-tertiary` | `#B0A49B` | Hints, placeholders |
| `--color-ink-ghost` | `#DDD8D0` | Dividers, disabled states |
| `--color-success` | `#1A7A4A` | Positive confirmation |
| `--color-success-muted` | `rgba(26,122,74,0.12)` | Success tinted areas |
| `--color-error` | `#C0392B` | Errors, negative states |
| `--color-error-muted` | `rgba(192,57,43,0.1)` | Error tinted areas |
| `--color-accent-rgb` | `184, 98, 45` | For rgba() in inline styles |
| `--gradient-espresso` | `linear-gradient(135deg, ...)` | Hero entry button |
| `--gradient-glow-base` | `radial-gradient(...)` | Ambient glow overlays |

### Typography

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 32px / 2rem | 800 | Page titles, hero text |
| `heading` | 26px / 1.625rem | 700 | Section headings |
| `h2` | 20px / 1.25rem | 700 | Sub-headings |
| `body` | 16px / 1rem | 400 | Body copy |
| `body-sm` | 14px / 0.875rem | 400 | Supporting text |
| `caption` | 12px / 0.75rem | 500 | Labels, counts |
| `micro` | 11px / 0.6875rem | 600 | Hints, metadata |
| `button` | 15px / 0.9375rem | 600 | Interactive labels |
| `label` | 13px / 0.8125rem | 600 | Form labels, badges |

Font family: `Outfit` (variable weight 400–800) — NOT Inter.

### Spacing

Standard 4px grid. Key spacings:
- Screen padding: `px-5` (20px)
- Card padding: `p-5` (20px)
- Stack gap large: `mb-8` (32px)
- Stack gap medium: `mb-6` (24px)
- Stack gap small: `mb-3` (12px)

### Shadows

| Token | Value | Use |
|-------|-------|-----|
| `shadow-xs` | 0 1px 2px ink/0.05 | Subtle lift |
| `shadow-sm` | card-level | Default card |
| `shadow-md` | elevated-level | Hover states |
| `shadow-lg` | deeper | Hero elements |
| `shadow-xl` | maximum depth | Modals |
| `shadow-glow` | 0 0 0 3px primary/0.2, glow | Focus rings |
| `shadow-inner` | inset | Recessed inputs |
| `shadow-card` | (alias for sm) | Backward compat |
| `shadow-elevated` | (alias for md) | Backward compat |

### Border Radius

| Token | Value |
|-------|-------|
| `rounded-sm` | 6px |
| `rounded` | 4px (default Tailwind) |
| `rounded-button` | 12px |
| `rounded-card` | 16px |
| `rounded-2xl` | 16px (Tailwind) |
| `rounded-2xl-custom` / `rounded-[28px]` | 28px |
| `rounded-chip` | 100px (pill) |
| `rounded-full` | 9999px |

### Motion

| Token | Value | Use |
|-------|-------|-----|
| `ease.out` | `[0.16, 1, 0.3, 1]` | Most animations |
| `ease.spring` | `[0.34, 1.56, 0.64, 1]` | Bouncy reveals |
| `ease.inOut` | `[0.76, 0, 0.24, 1]` | Deliberate transitions |
| `duration.instant` | 80ms | Micro-feedback |
| `duration.fast` | 150ms | Quick transitions |
| `duration.base` | 250ms | Default |
| `duration.slow` | 400ms | Emphasis |
| `duration.deliberate` | 600ms | Full-screen transitions |
| `spring.gentle` | stiffness 300, damping 30 | Page-level |
| `spring.snappy` | stiffness 400, damping 30 | Button, chips |

---

## Component Inventory — Before/After

### PrimaryButton

**Before:** No hover state. No focus ring. No loading state. `active:bg-primary-light` only. `pointer-events-none` on disabled (not cursor-not-allowed).

**After:** Full state matrix — hover (translateY -1px + shadow-md), active (scale 0.97), focus-visible (shadow-glow ring), loading (3-dot stagger animation), disabled (bg-ink-ghost, cursor-not-allowed). Secondary and ghost variants both polished.

### ProgressBar

**Before:** Flat static colored bars. "X of Y" counter styled with full text-micro.

**After:** Framer Motion width animation on active segment. Active bar `h-1.5` (taller). Right-edge glow on current. Counter styled `text-micro text-ink-ghost/60 tracking-wider tabular-nums`.

### AnimatedChip

**Before:** Inline `style={{ opacity: disabled ? 0.4 : 1 }}`. No hover. Checkmark not spring-animated.

**After:** Tailwind `opacity-40` for disabled. Framer `whileHover` hover state. Checkmark spring-animates in with `initial scale 0 → animate scale 1`.

### BackHeader

**Before:** "Back" text label visible. No chevron animation.

**After:** Text removed (icon only). Chevron `whileHover={{ x: -2 }}`. Better touch target `py-3 -ml-2 px-2`.

### GameIntro

**Before:** Instructions card has border. Steps use plain "1. " prefix. Round label is `text-caption`.

**After:** Instructions card `bg-surface-sunken border-0 shadow-inner`. Numbered steps use absolute-positioned accent number markers. Round label upgraded to `text-label uppercase tracking-widest`.

### GameResult

**Before:** Flat primary rectangle with "+X%". No animation on the percentage. Entry is a flat fade.

**After:** Container bounces in with spring. Discount badge has gradient + ring glow. The percentage count-ups from 0 using `requestAnimationFrame`. "Earned" label styled `text-micro uppercase tracking-widest text-white/60`.

### SwipeCard

**Before:** Hardcoded `#DC2626`, `#4CAF50`, `rgba(220,38,38,0.1)`, `rgba(76,175,80,0.1)` scattered inline.

**After:** Named constants at top (`ERROR_RGB`, `SUCCESS_RGB`). All inline style values use the named constants. Zero scattered hex.

### VoiceExpansion

**Before:** Idle button looks completely foreign from the rest of the app. Processing uses a simple CSS border spinner. Hardcoded `border-primary border-t-transparent`.

**After:** Idle matches secondary PrimaryButton style. Microphone icon pulses subtly. "Speak your review" label with subtext. Processing spinner replaced with SVG arc spinner in brand color. No hardcoded hex.

### ScreenShell

**Before:** `pageSlide` variant always slides from below (y: 8→0). Direction-agnostic.

**After:** Reads `direction` from useNavigation store. Forward: x 24→0. Back: x -24→0. Exit: opposite direction. Horizontal slide feels natural with the left-to-right navigation flow.

### EntryScreen

**Before:** `background: 'linear-gradient(135deg, #2D1507 ...)'` inline in JSX. `#C67C4E55` ring color inline.

**After:** Gradient defined as `--gradient-espresso` CSS variable. Glow ring uses `rgba(var(--color-accent-rgb), 0.33)`.

### AboutYouScreen

**Before:** `text-[28px] font-bold`, `text-[15px]`, `text-[13px] font-bold`, `text-[17px] font-semibold` scattered everywhere. `ring-2 ring-primary` on selection cards. Raw `motion.button` for CTA.

**After:** All replaced with proper scale tokens. Selection cards use `shadow-glow` focus state. CTA replaced with `<PrimaryButton>`.

### OrderSelectionScreen

**Before:** `text-[26px]`, `text-[15px]`, `text-[17px]`. `from-background` (wrong token). Emoji 🚀 in CTA.

**After:** Tokens applied. `from-bg`. Emoji removed. `<PrimaryButton>` for CTA.

### ProductGameScreen

**Before:** `text-[28px]`, `text-[15px]`. Round badge uses `text-caption`.

**After:** `text-display`, `text-body`. Badge uses `text-label`.

### Round2Screen

**Before:** Native range input with `accent-primary` + inline gradient style. `text-[28px]`, `text-[15px]`, `text-[17px]`. Raw `motion.button`.

**After:** Native range uses global CSS custom styling (thumb + track from globals.css). Dynamic track gradient via CSS variable references. Token fonts applied. `<PrimaryButton>` used.

### VibeGameScreen

**CRITICAL BUG FIXED:** `absolute top-2 right-2` checkmark rendered incorrectly because parent button lacked `relative`. Fixed.

**Before:** `text-[26px]`, `text-[15px]`, `text-[14px]`, `text-[13px]`. `text-ink-muted` (non-existent class). Raw `motion.button` for CTA.

**After:** All tokens applied. `text-ink-secondary` used correctly. `<PrimaryButton>` for CTA.

### SlingshotGameScreen

**Before:** `text-[28px]`, `text-[13px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`. `text-ink/60`, `text-ink/40` (opacity utilities that collide with color role). `bg-ink/8` (invalid class). `bg-primary/8`.

**After:** Tokens applied throughout. `text-ink-secondary`, `text-ink-tertiary`. `bg-ink-ghost/40` and `bg-primary/10` used correctly.

### BasketballScreen

**CRITICAL:** Canvas `ctx.font` used `'Karla, ...'` — font not loaded. Fixed to `'Outfit, ...'`.

**Before:** Canvas colors (`#C67C4E18`, `#C67C4E33`, `#4CAF5033`, `#4CAF50`) inline in canvas draw calls. Confetti colors array inline with hardcoded hex. `text-ink-muted` (non-existent).

**After:** Named canvas constants `BRAND_RIM`, `BRAND_BACKBOARD`, `BRAND_TRAIL_RGB`, `SUCCESS_RGB` defined at top. Confetti colors array at top of Confetti function. `text-ink-secondary` used.

### GeneratingScreen

**Before:** `animate-spin-slow` SVG arc — zero brand personality.

**After:** `BrandedSpinner` — ring of 8 dots, each animating `opacity` and `scale` with staggered delay. Feels like a "thinking" indicator (like Linear's deployment status).

### ReviewScreen — THE PAYOFF

**Before:** A green circle and two buttons. Flat. No celebration.

**After:** 
1. `ReviewConfetti` fires on mount (40 particles, Framer Motion only, brand colors)
2. Success badge `w-20 h-20`, ring glow, spring scale entrance
3. BlurFade heading
4. Review card gets gradient top border (from-primary to amber-300)
5. Subtle radial gradient overlay on card surface
6. Mount animation sequence: confetti → badge (100ms) → heading (200ms) → card (350ms) → buttons (500ms)
7. `<PrimaryButton>` for copy button (full states including copied)
8. Google link: `whileHover={{ y: -1 }}`, `hover:shadow-md` transition

---

## Changes Log

| File | Type | Summary |
|------|------|---------|
| `globals.css` | Rewrite | Outfit font, CSS variables, keyframes (shimmer, float, pulse-dot, count-in, spin-ring), custom range input styling |
| `tailwind.config.ts` | Major update | Outfit font, expanded color tokens, new type scale (label, h2), new shadows, new border radius values, new animations |
| `design/motion.ts` | Expand | spring.spring, ease.inOut, duration.instant/slow/deliberate, slideUp, staggerContainer, scaleIn |
| `components/PrimaryButton.tsx` | Full surgery | loading prop, icon prop, all 3 variants × 5 states |
| `components/ProgressBar.tsx` | Visual surgery | Framer Motion fill animation, height variants for active/inactive |
| `components/AnimatedChip.tsx` | Polish | whileHover, Tailwind disabled, spring checkmark |
| `components/BackHeader.tsx` | Polish | Remove "Back" text, chevron hover animation, better touch target |
| `components/GameIntro.tsx` | Polish | Styled instructions card, accent number markers |
| `components/GameResult.tsx` | Surgery | Spring entry, count-up discount number, gradient badge |
| `components/SwipeCard.tsx` | Token fix | Named constants, zero scattered hex |
| `components/VoiceExpansion.tsx` | Surgery | Idle state polished, SVG spinner |
| `screens/ScreenShell.tsx` | Enhancement | Directional slide based on navigation direction |
| `screens/EntryScreen.tsx` | Token fix | CSS variable gradients |
| `screens/AboutYouScreen.tsx` | Fix | Token fonts, PrimaryButton CTA, shadow-glow selection |
| `screens/OrderSelectionScreen.tsx` | Fix | Token fonts, PrimaryButton CTA, remove emoji |
| `screens/ProductGameScreen.tsx` | Fix | Token fonts |
| `screens/Round2Screen.tsx` | Fix | Custom range styling, token fonts, PrimaryButton |
| `screens/VibeGameScreen.tsx` | Critical fix + tokens | `relative` on card, token fonts, text-ink-secondary, PrimaryButton |
| `screens/SlingshotGameScreen.tsx` | Fix | Token fonts, correct utility classes |
| `screens/BasketballScreen.tsx` | Critical fix + tokens | Outfit in canvas, named constants, text-ink-secondary |
| `screens/GeneratingScreen.tsx` | Branded loader | 8-dot ring spinner |
| `screens/ReviewScreen.tsx` | Full reconstruction | Confetti, animation sequence, gradient card border, PrimaryButton |
