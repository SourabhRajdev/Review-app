// SPARK SLICE SCREEN — Round 3 of hard mode
//
// Captures the SENSORY_CHIPS signal via a fruit-ninja style slice mechanic.
// Sparks fly up from the bottom of the field carrying sensory words. The
// player swipes to slice them. Burnt tokens (bitter / stale / cold / burnt)
// are penalty targets — slicing one knocks a point off the score.
//
// Skill loop: aim + timing + restraint.
//   - Drag a finger / mouse across the field to draw a blade trail.
//   - Trail segments intersect spark hitboxes → slice.
//   - Survive ~22 seconds. Net score (good − burnt) maps to discount.
//
// Captured sensory chips = the top 2 most-frequently-sliced flavours.

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// --- CONFIG ---

const FIELD_W = 340;
const FIELD_H = 480;
const SPARK_R = 30;
const GAME_DURATION_MS = 22_000;
const SPAWN_MIN_MS = 480;
const SPAWN_MAX_MS = 900;
const TRAIL_LEN = 8;
const GRAVITY = 0.00038; // px / ms²

interface SensoryFlavour {
  id: string; // REVIEW_GENERATION_GUIDE.md sensory_chips enum
  label: string;
  good: true;
  color: string;
}

interface BurntFlavour {
  id: string;
  label: string;
  good: false;
  color: string;
}

type Flavour = SensoryFlavour | BurntFlavour;

const GOOD_FLAVOURS: SensoryFlavour[] = [
  { id: 'hot_fresh',  label: 'Hot & Fresh', good: true, color: '#C67C4E' },
  { id: 'crispy',     label: 'Crispy',      good: true, color: '#D4A574' },
  { id: 'creamy',     label: 'Creamy',      good: true, color: '#E8A87C' },
  { id: 'rich',       label: 'Rich',        good: true, color: '#8B5E3C' },
  { id: 'bold',       label: 'Bold',        good: true, color: '#A0522D' },
  { id: 'fragrant',   label: 'Fragrant',    good: true, color: '#D4756B' },
  { id: 'smoky',      label: 'Smoky',       good: true, color: '#9C6644' },
  { id: 'sweet',      label: 'Sweet',       good: true, color: '#E8B584' },
  { id: 'buttery',    label: 'Buttery',     good: true, color: '#F5C893' },
  { id: 'smooth',     label: 'Smooth',      good: true, color: '#C99373' },
];

const BURNT_FLAVOURS: BurntFlavour[] = [
  { id: 'bitter', label: 'Bitter', good: false, color: '#3C2415' },
  { id: 'burnt',  label: 'Burnt',  good: false, color: '#2A1810' },
  { id: 'cold',   label: 'Cold',   good: false, color: '#5C4A3F' },
  { id: 'stale',  label: 'Stale',  good: false, color: '#4A3528' },
];

interface Spark {
  id: number;
  flavour: Flavour;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  sliced: boolean;
  spawnedAt: number;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

type Phase = 'intro' | 'playing' | 'result';

// --- HELPERS ---

function pickFlavour(): Flavour {
  // ~75% good, ~25% burnt — burnt rate keeps the player honest
  if (Math.random() < 0.25) {
    return BURNT_FLAVOURS[Math.floor(Math.random() * BURNT_FLAVOURS.length)];
  }
  return GOOD_FLAVOURS[Math.floor(Math.random() * GOOD_FLAVOURS.length)];
}

function spawnSpark(id: number, now: number): Spark {
  const startX = 40 + Math.random() * (FIELD_W - 80);
  // vy is "px per ms" — small numbers because dt is in ms
  const vy = -(0.55 + Math.random() * 0.18);
  const vx = (Math.random() - 0.5) * 0.3;
  return {
    id,
    flavour: pickFlavour(),
    x: startX,
    y: FIELD_H + SPARK_R,
    vx,
    vy,
    rotation: Math.random() * 360,
    vr: (Math.random() - 0.5) * 0.4,
    sliced: false,
    spawnedAt: now,
  };
}

function segHitsCircle(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, r: number
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ddx = cx - ax;
    const ddy = cy - ay;
    return ddx * ddx + ddy * ddy <= r * r;
  }
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
  const px = ax + t * dx;
  const py = ay + t * dy;
  const ddx = cx - px;
  const ddy = cy - py;
  return ddx * ddx + ddy * ddy <= r * r;
}

function aggregateSensory(slicedGood: string[]): string[] {
  const counts: Record<string, number> = {};
  for (const id of slicedGood) counts[id] = (counts[id] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

function scoreToDiscount(net: number): number {
  if (net <= 0) return 1;
  if (net <= 4) return 2;
  if (net <= 7) return 4;
  if (net <= 10) return 6;
  if (net <= 14) return 8;
  if (net <= 18) return 9;
  return 10;
}

// --- MAIN SCREEN ---

export default function SparkSliceScreen() {
  const go = useNavigation((s) => s.go);
  const addHardGameResult = useGameStore((s) => s.addHardGameResult);
  const [phase, setPhase] = useState<Phase>('intro');
  const [hud, setHud] = useState({ good: 0, burnt: 0, timeLeft: GAME_DURATION_MS });
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [topFlavours, setTopFlavours] = useState<SensoryFlavour[]>([]);

  // Game state in refs — avoids re-rendering on every spark frame
  const sparksRef = useRef<Spark[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);
  const idRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const nextSpawnDelayRef = useRef<number>(SPAWN_MIN_MS);
  const slicedGoodRef = useRef<string[]>([]);
  const goodCountRef = useRef<number>(0);
  const burntCountRef = useRef<number>(0);
  /** Count of good slices in the current swipe — fires combo feel at 3+ */
  const swipeStreakRef = useRef<number>(0);
  /** Timestamp of last successful slice — resets streak after a gap */
  const lastSliceAtRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [, forceRender] = useState(0);

  const finishGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const goodCount = goodCountRef.current;
    const burntCount = burntCountRef.current;
    const net = goodCount - burntCount;
    const discount = scoreToDiscount(net);
    const scorePercent = Math.max(
      0,
      Math.min(100, Math.round((net / 20) * 100))
    );
    const top = aggregateSensory(slicedGoodRef.current);
    const topFlavourObjs = top
      .map((id) => GOOD_FLAVOURS.find((f) => f.id === id))
      .filter((x): x is SensoryFlavour => !!x);

    addHardGameResult({
      gameId: 'sparkSlice',
      signalKey: 'sensory_chips',
      signalValue: top.length > 0 ? top : ['hot_fresh'],
      scorePercent,
      discount,
    });

    setFinalDiscount(discount);
    setTopFlavours(topFlavourObjs);
    audio.bullseye();
    haptics.jackpot();
    setTimeout(() => setPhase('result'), 500);
  }, [addHardGameResult]);

  // --- GAME LOOP ---
  useEffect(() => {
    if (phase !== 'playing') return;
    let running = true;
    let lastFrame = performance.now();
    startedAtRef.current = lastFrame;
    lastSpawnRef.current = lastFrame;
    nextSpawnDelayRef.current = SPAWN_MIN_MS;
    sparksRef.current = [];
    slicedGoodRef.current = [];
    goodCountRef.current = 0;
    burntCountRef.current = 0;
    swipeStreakRef.current = 0;
    lastSliceAtRef.current = 0;
    trailRef.current = [];

    function loop(now: number) {
      if (!running) return;
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;

      // Spawn sparks
      if (now - lastSpawnRef.current >= nextSpawnDelayRef.current) {
        sparksRef.current.push(spawnSpark(idRef.current++, now));
        lastSpawnRef.current = now;
        nextSpawnDelayRef.current =
          SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
      }

      // Physics + cull
      sparksRef.current = sparksRef.current.filter((s) => {
        if (!s.sliced) {
          s.vy += GRAVITY * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rotation += s.vr * dt;
        }
        // Cull when fully off-screen below
        return s.y < FIELD_H + 80 && s.y > -200;
      });

      // Trail decay
      const cutoff = now - 220;
      trailRef.current = trailRef.current.filter((p) => p.t > cutoff);

      // Slice detection — only against the most recent trail segments
      const trail = trailRef.current;
      if (trail.length >= 2) {
        for (const spark of sparksRef.current) {
          if (spark.sliced) continue;
          for (let i = trail.length - 1; i > 0; i--) {
            const a = trail[i];
            const b = trail[i - 1];
            if (segHitsCircle(a.x, a.y, b.x, b.y, spark.x, spark.y, SPARK_R)) {
              spark.sliced = true;
              spark.vy = Math.min(spark.vy, -0.4);
              spark.vx *= 1.4;
              if (spark.flavour.good) {
                goodCountRef.current += 1;
                slicedGoodRef.current.push(spark.flavour.id);
                // Reset streak if too long since last slice
                if (now - lastSliceAtRef.current > 700) {
                  swipeStreakRef.current = 0;
                }
                swipeStreakRef.current += 1;
                lastSliceAtRef.current = now;
                // Combo feel kicks in at 3+ consecutive
                if (swipeStreakRef.current >= 3) {
                  audio.combo();
                  haptics.combo();
                } else {
                  audio.slice();
                  haptics.slice();
                }
              } else {
                burntCountRef.current += 1;
                swipeStreakRef.current = 0;
                audio.miss();
                haptics.miss();
              }
              break;
            }
          }
        }
      }

      // HUD update — once per frame, throttled by React batching
      const elapsed = now - startedAtRef.current;
      const timeLeft = Math.max(0, GAME_DURATION_MS - elapsed);
      setHud({
        good: goodCountRef.current,
        burnt: burntCountRef.current,
        timeLeft,
      });
      forceRender((n) => n + 1);

      if (elapsed >= GAME_DURATION_MS) {
        running = false;
        finishGame();
        return;
      }
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [phase, finishGame]);

  // --- INPUT ---
  function getPos(e: React.TouchEvent | React.PointerEvent): { x: number; y: number } | null {
    const el = fieldRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = (e as React.PointerEvent).clientX;
      cy = (e as React.PointerEvent).clientY;
    }
    const sx = FIELD_W / rect.width;
    const sy = FIELD_H / rect.height;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  }

  function pushTrail(p: { x: number; y: number }) {
    const now = performance.now();
    trailRef.current.push({ x: p.x, y: p.y, t: now });
    if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    e.preventDefault();
    const p = getPos(e);
    if (p) pushTrail(p);
    fieldRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    e.preventDefault();
    const p = getPos(e);
    if (p) pushTrail(p);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    fieldRef.current?.releasePointerCapture(e.pointerId);
    trailRef.current = [];
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (phase !== 'playing') return;
    const p = getPos(e);
    if (p) pushTrail(p);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (phase !== 'playing') return;
    e.preventDefault();
    const p = getPos(e);
    if (p) pushTrail(p);
  };
  const onTouchEnd = () => {
    trailRef.current = [];
  };

  function startGame() {
    audio.tap();
    haptics.press();
    setHud({ good: 0, burnt: 0, timeLeft: GAME_DURATION_MS });
    setPhase('playing');
  }

  function continueToNext() {
    audio.tap();
    haptics.press();
    go('basketball');
  }

  // Build trail polyline for rendering
  const trailPoints = trailRef.current
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <ScreenShell className="justify-center">
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            className="flex-1 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.p
              className="text-[12px] uppercase tracking-widest text-brand font-semibold mb-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
            >
              Round 3 — Slice
            </motion.p>
            <motion.h2
              className="text-[26px] font-bold font-display text-ink mb-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle, delay: 0.05 }}
            >
              How was the food?
            </motion.h2>
            <motion.p
              className="text-ink-muted text-[14px] mb-8 max-w-[300px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              Slice the flavours that fit. Avoid the burnt ones — they cost you points.
            </motion.p>

            <motion.div
              className="flex gap-2 mb-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-white"
                style={{ backgroundColor: '#C67C4E' }}
              >
                Crispy ✓
              </span>
              <span
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-white"
                style={{ backgroundColor: '#3C2415' }}
              >
                Burnt ✗
              </span>
            </motion.div>

            <motion.button
              className="w-full max-w-[300px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={startGame}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Start slicing
            </motion.button>
          </motion.div>
        )}

        {phase === 'playing' && (
          <motion.div
            key="playing"
            className="flex-1 flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.gentle}
          >
            {/* HUD */}
            <div className="flex items-center gap-4 mb-3 text-[13px] font-semibold tabular-nums">
              <span className="text-ink-soft">
                <span className="text-brand">{hud.good}</span> sliced
              </span>
              <span className="text-ink-soft">
                <span className="text-red-600">{hud.burnt}</span> burnt
              </span>
              <span className="text-ink-soft">
                <span className="text-ink">{Math.ceil(hud.timeLeft / 1000)}s</span>
              </span>
            </div>

            <div
              ref={fieldRef}
              className="rounded-2xl bg-gradient-to-b from-amber-50/60 to-white border border-ink-ghost/10 shadow-card-lg overflow-hidden relative"
              style={{
                width: FIELD_W,
                height: FIELD_H,
                touchAction: 'none',
                userSelect: 'none',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Sparks */}
              {sparksRef.current.map((s) => (
                <div
                  key={s.id}
                  className="absolute rounded-full flex items-center justify-center font-semibold text-white pointer-events-none"
                  style={{
                    left: s.x - SPARK_R,
                    top: s.y - SPARK_R,
                    width: SPARK_R * 2,
                    height: SPARK_R * 2,
                    backgroundColor: s.flavour.color,
                    transform: `rotate(${s.rotation}deg) scale(${s.sliced ? 0.6 : 1})`,
                    opacity: s.sliced ? 0.4 : 1,
                    fontSize: 11,
                    boxShadow: s.flavour.good
                      ? `0 4px 14px ${s.flavour.color}55`
                      : '0 4px 14px rgba(60,36,21,0.4)',
                    transition: s.sliced ? 'opacity 0.3s, transform 0.3s' : 'none',
                  }}
                >
                  {s.flavour.label}
                </div>
              ))}

              {/* Blade trail */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={FIELD_W}
                height={FIELD_H}
                viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
              >
                {trailRef.current.length >= 2 && (
                  <polyline
                    points={trailPoints}
                    fill="none"
                    stroke="#C67C4E"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.7"
                  />
                )}
              </svg>
            </div>

            {/* Time bar */}
            <div className="w-[300px] h-1 bg-ink-ghost/15 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-brand"
                style={{
                  width: `${(hud.timeLeft / GAME_DURATION_MS) * 100}%`,
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            className="flex-1 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.bouncy}
          >
            <motion.p
              className="text-[12px] uppercase tracking-widest text-ink-quiet font-semibold mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Flavours captured
            </motion.p>
            <motion.h2
              className="text-[24px] font-bold font-display text-ink mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {hud.good} good · {hud.burnt} burnt
            </motion.h2>

            <motion.div
              className="flex flex-wrap justify-center gap-2 max-w-[300px] mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {topFlavours.length > 0 ? (
                topFlavours.map((f) => (
                  <span
                    key={f.id}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-white"
                    style={{ backgroundColor: f.color }}
                  >
                    {f.label}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-ink-muted">No flavours captured</span>
              )}
            </motion.div>

            <motion.div
              className="rounded-2xl bg-gradient-brand px-6 py-4 mb-6 shadow-glow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.4 }}
            >
              <p className="text-white/80 text-[12px] uppercase tracking-wider mb-1">Earned</p>
              <p className="text-white text-[36px] font-bold font-display leading-none">
                +{finalDiscount}%
              </p>
            </motion.div>

            <motion.button
              className="w-full max-w-[300px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={continueToNext}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Final round
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
