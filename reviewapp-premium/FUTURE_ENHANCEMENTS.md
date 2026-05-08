# Future Enhancements Backlog

Ranked by impact-to-effort ratio. Exact file paths and implementation notes included.

---

## Priority 1 — High impact, achievable in one session

### 1. ProgressBar glow burst at 100% fill
**File:** `src/components/ProgressBar.tsx`  
When the last segment fills, fire a `motion.div` positioned at the right edge: `scale(1.4)` + `opacity(0)` over 300ms, color `bg-primary`. Triggers via `useEffect` watching whether `idx === total - 1`.

### 2. ReviewScreen: confetti physics improvement
**File:** `src/screens/ReviewScreen.tsx`  
Current confetti uses linear spread. Upgrade to spiral burst: particles spawn at center, each gets an angle assigned as `(i / 40) * 360` degrees with slight randomization. This makes it look intentional rather than scattered. Add `shape: 'line'` variant for 40% of particles (thin rect `2px × 12px`).

### 3. GameResult count-up easing
**File:** `src/components/GameResult.tsx`  
Current count-up is linear (frame / total). Upgrade to ease-out: `Math.round(easeOut(frame / total) * discount)` where `easeOut(t) = 1 - (1 - t) ** 3`. Feels more like a slot machine stopping.

### 4. VoiceExpansion: waveform color dynamic
**File:** `src/components/VoiceExpansion.tsx`  
The waveform bars currently all use `bg-primary`. Add a gentle hue variation: bars at the center use `bg-primary`, bars at edges use `bg-primary-light`. Implement via inline style with `opacity` interpolated from center distance. No new deps.

### 5. AboutYouScreen: selection card micro-animation
**File:** `src/screens/AboutYouScreen.tsx`  
When a Resident/Tourist card is selected, the emoji inside should `scale(1.0 → 1.3 → 1.0)` with a spring over 400ms. Currently it just changes border color. Use `AnimatePresence` + `motion.span` on the emoji.

---

## Priority 2 — Meaningful polish, requires careful implementation

### 6. ProgressBar: completion sparkle
**File:** `src/components/ProgressBar.tsx`  
At full completion (all rounds done), render 3 particle spans that animate from the final bar's position upward and fade out. Each: `w-1 h-1 rounded-full bg-primary`, `y: 0 → -16`, `opacity: 1 → 0`, stagger 0.1s. Fixed position relative to the ProgressBar wrapper.

### 7. ScreenShell: safe area gradient fade
**File:** `src/screens/ScreenShell.tsx`  
Add a fixed bottom gradient overlay `fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-bg to-transparent pointer-events-none` when scroll depth exceeds viewport. Use `useRef` + scroll listener on the container. Prevents content from looking truncated on short screens.

### 8. OrderSelectionScreen: item selection micro-feedback
**File:** `src/screens/OrderSelectionScreen.tsx`  
When an item is selected, briefly show a `+1` floating label that animates `y: 0 → -20`, `opacity: 1 → 0` over 500ms at the position of the tapped row. This requires tracking position via `useRef` on the tapped element. No new deps — Framer Motion portal + `motion.div` with `position: fixed`.

### 9. BasketballScreen: score flash overlay
**File:** `src/screens/BasketballScreen.tsx`  
When `scoredRef.current` becomes true, render a React-layer overlay (not canvas) with a green radial glow `fixed inset-0 pointer-events-none`. Use `AnimatePresence` + `motion.div` with `opacity: [0, 0.4, 0]` over 600ms. Currently the canvas draws the success state but a React-layer overlay would be more vivid.

### 10. SlingshotGameScreen: jar shake before smash
**File:** `src/screens/SlingshotGameScreen.tsx`  
When `isTarget` is true (slingshot aimed at a jar), add a `scale: [1, 1.06, 1]` repeating animation on that jar every 400ms. Currently only does `rotate + scale` when aiming. This "nervous jar" feeling adds anticipation.

---

## Priority 3 — Nice to have, architectural or experimental

### 11. PrimaryButton: icon slot animation
**File:** `src/components/PrimaryButton.tsx`  
The `icon` prop is accepted but not animated. When an icon is present, it should `rotate(0 → 12deg)` on `whileHover` and return on `whileHover` end. Gives arrows/chevrons a visual "nudge" feel.

### 12. EntryScreen: particle shape variety
**File:** `src/screens/EntryScreen.tsx`  
Current floating particles are all emojis. Add 3 non-emoji particles (small golden dots `w-1.5 h-1.5 rounded-full bg-amber-300`) that animate upward with slight horizontal drift. These should be behind the emoji layer (`z-0` vs emoji `z-10`). Creates a layered depth effect.

### 13. AnimatedChip: deselect animation
**File:** `src/components/AnimatedChip.tsx`  
Currently the checkmark only animates *in* (spring scale 0→1). Add `exit` animation for `AnimatePresence`: scale `1 → 0` over 150ms. This requires wrapping the checkmark SVG in `<AnimatePresence>` and adding `exit={{ scale: 0, transition: { duration: 0.15 } }}`.

### 14. Round2Screen: slider thumb label
**File:** `src/screens/Round2Screen.tsx`  
Show the current emoji floating above the slider thumb. Position: `absolute` element with `left: calc(${waitFeeling}% + ...)` corrected for thumb width. Animates with `transition: left 0.1s ease`. Currently the emoji is in the card above — duplicating it as a small floating label on the thumb adds delight.

### 15. GeneratingScreen: status message dots
**File:** `src/screens/GeneratingScreen.tsx`  
The cycling status messages (`'Crafting your review'`, etc.) currently just fade in/out. Add trailing animated dots: `...` that appear one by one with stagger (250ms each), then reset when message changes. Use `Array.from({ length: 3 })` with Framer Motion stagger. Pure animation, no logic change.

### 16. VibeGameScreen: card selection ripple
**File:** `src/screens/VibeGameScreen.tsx`  
On card tap, render a temporary `motion.div` at tap position (centered on card) that animates from `scale(0) opacity(0.4)` to `scale(2.5) opacity(0)` over 500ms. This is a CSS ripple effect done in Framer Motion. Requires `overflow-hidden` on the card (already has `rounded-2xl` — add overflow-hidden) and tracking tap position.

### 17. Skeleton screens for OrderSelectionScreen
**File:** `src/screens/OrderSelectionScreen.tsx`  
If `menuData` were async (future), show skeleton cards using the `.skeleton` utility class defined in globals.css. Pre-implement: add a `loading` prop to the screen, render 4 skeleton cards at `h-16` with `className="skeleton rounded-2xl"` when loading. The shimmer animation is already defined in globals.css.

### 18. ReviewScreen: share sheet on mobile
**File:** `src/screens/ReviewScreen.tsx`  
Use `navigator.share()` on mobile alongside the copy button. Detect with `if (navigator.share)`. Show a "Share" button variant that calls `navigator.share({ text: displayText })`. This is a progressive enhancement — button only shows on devices that support it. No new deps.

### 19. BackHeader: swipe-back gesture support
**File:** `src/components/BackHeader.tsx` + `src/screens/ScreenShell.tsx`  
Add a touch gesture detector on the left 20px edge of ScreenShell. If user swipes right by > 60px with velocity > 0.3, call `back()`. Implement with `onPointerDown/Move/Up` on a `div` with `position: fixed left-0 top-0 w-[20px] h-full z-50`. This mirrors iOS swipe-back.

### 20. EntryScreen: PLAYER GAME button haptic preview
**File:** `src/screens/EntryScreen.tsx`  
On first render (after 1.5s delay), call `haptics.tick()` once to remind the user the button is there. Use `setTimeout` in `useEffect`. This is a single one-time haptic — not a loop. On devices that support vibration, it draws attention to the CTA without being annoying.
