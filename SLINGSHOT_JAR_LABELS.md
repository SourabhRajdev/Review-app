# Slingshot Game - Jar Labels Added ✅

## Problem
- All 4 jars looked identical (just 🏺 emoji)
- Players didn't know which jar contained which answer
- Answer only revealed AFTER breaking the jar
- Made aiming feel random/unclear

## Solution
Added visible labels below each jar showing the answer text BEFORE shooting.

---

## Changes Made

### Visual Updates

**Before:**
```
🏺  🏺  🏺  🏺
(all identical - mystery jars)
```

**After:**
```
      🏺              🏺              🏺              🏺
Definitely      My new        Maybe         Once was
returning!      regular       someday       enough
```

### Implementation Details

1. **Label Component**
   - Small rounded box below each jar
   - Shows answer text in compact format
   - Warm Latte design (cream background, coffee text)
   - Max width 80px with text wrapping

2. **Interactive Feedback**
   - When aiming at a jar (target detected):
     - Label background changes to coffee tint
     - Text color becomes primary coffee brown
     - Subtle scale pulse animation
     - Border becomes more prominent
   
3. **Styling**
   ```typescript
   // Normal state
   background: 'rgba(255,255,255,0.9)'
   color: '#7A5C4A'
   border: '1px solid rgba(200,170,140,0.2)'
   
   // When targeted (aiming)
   background: 'rgba(198,124,78,0.15)'
   color: '#C67C4E'
   border: '1px solid rgba(198,124,78,0.3)'
   ```

4. **Typography**
   - Font size: `text-micro` (very small)
   - Font weight: `font-semibold`
   - Text alignment: centered
   - Line height: tight (for multi-line text)

---

## User Experience Improvements

### Before:
1. See 4 identical jars
2. Aim blindly at any jar
3. Break jar
4. Discover what answer it contained
5. Confirm or retry

### After:
1. See 4 jars with visible answer labels
2. **Read all options before shooting**
3. **Aim deliberately at desired answer**
4. Break the chosen jar
5. Confirm selection

---

## Example Round

**Question**: "Would you come back?"

**Jars displayed:**
```
Position 1 (12.5%):     Position 2 (37.5%):     Position 3 (62.5%):     Position 4 (87.5%):
     🏺                      🏺                      🏺                      🏺
Definitely              My new                  Maybe                   Once was
returning!              regular                 someday                 enough
```

Player can now:
- Read all 4 options
- Decide which answer they want
- Aim at that specific jar
- See visual feedback when targeting it

---

## Technical Details

### Code Changes
**File**: `src/screens/SlingshotGameScreen.tsx`

**Changed**:
- Renamed `_answer` to `answer` in map function (now used)
- Added label div below jar emoji
- Added conditional styling based on `isTarget`
- Added pulse animation when jar is targeted
- Wrapped jar + label in flex column with gap

### Layout
```tsx
<div className="flex flex-col items-center gap-2">
  {/* Jar emoji */}
  <span className="text-5xl">🏺</span>
  
  {/* Label below */}
  <div className="px-2 py-1 rounded-lg text-micro">
    {answer}
  </div>
</div>
```

---

## Design System Compliance

✅ **Warm Latte colors**
- Cream white backgrounds
- Coffee brown text and accents
- Warm tan borders

✅ **Interactive feedback**
- Hover/target state with coffee tint
- Smooth transitions
- Pulse animation on target

✅ **Typography**
- Consistent with design system
- Readable at small size
- Proper text wrapping

✅ **Spacing**
- 2-unit gap between jar and label
- Proper padding in label boxes
- Maintains visual hierarchy

---

## Testing Checklist

- [x] TypeScript compiles with no errors
- [ ] Labels visible below all 4 jars
- [ ] Text wraps properly for long answers
- [ ] Target highlighting works when aiming
- [ ] Labels disappear when jar breaks
- [ ] Readable on mobile devices
- [ ] Doesn't interfere with slingshot mechanics
- [ ] Maintains Warm Latte design aesthetic

---

## Benefits

✅ **Clarity**: Players know what they're aiming for  
✅ **Intent**: Shooting becomes deliberate, not random  
✅ **UX**: No surprises after breaking jar  
✅ **Engagement**: Players can strategize their choice  
✅ **Accessibility**: Visual information before action  

---

**Status**: Complete and ready for testing
**Date**: May 7, 2026
**Impact**: Significantly improved game clarity and user experience
