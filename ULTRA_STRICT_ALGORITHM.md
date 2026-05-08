# Ultra-Strict Spin Wheel Algorithm

## Overview
Made the algorithm **extremely strict** - top prizes are nearly impossible to win. Most players will land on "Try Next Time" (80-95% chance depending on tier).

---

## New Prize Probabilities

### **HIGH TIER** (Best performance - scored basketball + positive answers)
| Prize | Weight | Probability | Odds |
|-------|--------|-------------|------|
| ☕ Free Coffee | 100 | **0.01%** | 1 in 10,000 |
| 🍰 Free Dessert | 500 | **0.05%** | 1 in 2,000 |
| 🎁 30% Off | 2,000 | **0.2%** | 1 in 500 |
| ✨ 20% Off | 7,000 | **0.7%** | 1 in 143 |
| 🏅 10% Off | 40,000 | **4.0%** | 1 in 25 |
| ⬆ Size Upgrade | 50,000 | **5.0%** | 1 in 20 |
| 🌟 5% Off | 100,400 | **10.04%** | 1 in 10 |
| 🔄 **Try Next Time** | 800,000 | **80.0%** | 4 in 5 |

**Total**: 1,000,000 (100%)

---

### **MID TIER** (Mixed performance)
| Prize | Weight | Probability | Odds |
|-------|--------|-------------|------|
| ☕ Free Coffee | 50 | **0.005%** | 1 in 20,000 |
| 🍰 Free Dessert | 300 | **0.03%** | 1 in 3,333 |
| 🎁 30% Off | 1,000 | **0.1%** | 1 in 1,000 |
| ✨ 20% Off | 4,000 | **0.4%** | 1 in 250 |
| 🏅 10% Off | 20,000 | **2.0%** | 1 in 50 |
| ⬆ Size Upgrade | 30,000 | **3.0%** | 1 in 33 |
| 🌟 5% Off | 44,650 | **4.465%** | ~1 in 22 |
| 🔄 **Try Next Time** | 900,000 | **90.0%** | 9 in 10 |

**Total**: 1,000,000 (100%)

---

### **LOW TIER** (Poor performance - missed basketball + negative answers)
| Prize | Weight | Probability | Odds |
|-------|--------|-------------|------|
| ☕ Free Coffee | 10 | **0.001%** | 1 in 100,000 |
| 🍰 Free Dessert | 100 | **0.01%** | 1 in 10,000 |
| 🎁 30% Off | 500 | **0.05%** | 1 in 2,000 |
| ✨ 20% Off | 2,000 | **0.2%** | 1 in 500 |
| 🏅 10% Off | 10,000 | **1.0%** | 1 in 100 |
| ⬆ Size Upgrade | 15,000 | **1.5%** | 1 in 67 |
| 🌟 5% Off | 22,390 | **2.239%** | ~1 in 45 |
| 🔄 **Try Next Time** | 950,000 | **95.0%** | 19 in 20 |

**Total**: 1,000,000 (100%)

---

## Key Changes from Previous Version

### Before (Generous):
- Free Coffee: 0.5% - 2.0%
- Try Next Time: 10% on all tiers
- Most players won something

### After (Ultra-Strict):
- Free Coffee: **0.001% - 0.01%** (100x harder!)
- Try Next Time: **80% - 95%** (most common result)
- Winning anything meaningful is rare

---

## Business Impact

### Expected Outcomes per 1,000 Spins (High Tier):
- Free Coffee: ~0.1 (1 in 10,000 players)
- Free Dessert: ~0.5 (1 in 2,000 players)
- 30% Off: ~2 players
- 20% Off: ~7 players
- 10% Off: ~40 players
- Size Upgrade: ~50 players
- 5% Off: ~100 players
- **Try Next Time: ~800 players** ← Most common

### Expected Outcomes per 1,000 Spins (Low Tier):
- Free Coffee: ~0.01 (1 in 100,000 players!)
- Free Dessert: ~0.1 (1 in 10,000 players)
- Any discount: ~50 players total
- **Try Next Time: ~950 players** ← Overwhelming majority

---

## Cost Analysis

Assuming 1,000 customers play (high tier):
- Free Coffee ($4 each): 0.1 × $4 = **$0.40**
- Free Dessert ($6 each): 0.5 × $6 = **$3.00**
- 30% Off (avg $3 discount): 2 × $3 = **$6.00**
- 20% Off (avg $2 discount): 7 × $2 = **$14.00**
- 10% Off (avg $1 discount): 40 × $1 = **$40.00**
- Size Upgrade ($1.50 each): 50 × $1.50 = **$75.00**
- 5% Off (avg $0.50 discount): 100 × $0.50 = **$50.00**

**Total cost per 1,000 players: ~$188.40** (less than $0.19 per player)

---

## Algorithm Details

### Server-Side (Secure):
```typescript
const roll = randomInt(0, 1_000_000);  // 0 to 999,999

// Example for HIGH tier:
if (roll < 100)           return 0;  // Free Coffee (0.01%)
if (roll < 600)           return 1;  // Free Dessert (0.05%)
if (roll < 2600)          return 2;  // 30% Off (0.2%)
if (roll < 9600)          return 3;  // 20% Off (0.7%)
if (roll < 49600)         return 4;  // 10% Off (4%)
if (roll < 99600)         return 5;  // Size Upgrade (5%)
if (roll < 200000)        return 6;  // 5% Off (10.04%)
return 7;                            // Try Next Time (80%)
```

### Client-Side Fallback:
Same logic using `Math.random()` if API fails.

---

## Transparency (RTP Info)

Players can tap the ℹ️ icon to see:
- "This wheel uses weighted probabilities"
- "Top prizes are rare by design"
- "Most spins result in 'Try Next Time'"
- "Your performance affects odds slightly"

---

## Summary

✅ **Free Coffee**: 0.01% chance (1 in 10,000) - virtually impossible  
✅ **Free Dessert**: 0.05% chance (1 in 2,000) - extremely rare  
✅ **30% Off**: 0.2% chance (1 in 500) - very rare  
✅ **Try Next Time**: 80-95% chance - **most common result**  
✅ **Cost per player**: Less than $0.20 on average  
✅ **Secure**: Server-side calculation prevents manipulation  

This is now a **house-favored** wheel where winning anything significant is exceptional, not expected.

---
**Status**: Ultra-strict mode enabled
**Date**: May 7, 2026
**Cost Impact**: Minimal (~$0.19 per player)
