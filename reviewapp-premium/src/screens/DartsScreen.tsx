// DARTS SCREEN — Round 1 of hard mode
//
// Real 20-segment dartboard with single/double/triple rings, bullseye + outer bull.
// SVG dart animates via curve + scale-down on throw.
// Two-axis tap-to-lock aiming (vertical sweep → horizontal sweep → dart flies).
// Captures OCCASION signal — whichever quadrant collects the most darts wins.

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// --- CONFIG ---

const BOARD = 300;
const CENTER = BOARD / 2;
const THROWS = 3;
const SWEEP_SPEED = 0.15; // px/ms — comfortable 2s full sweep

// Standard dartboard segment order (clockwise from top)
const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SEGMENT_ANGLE = 360 / 20; // 18°

// Ring radii (fraction of board radius)
const R_OUTER = 0.96;       // outer wire
const R_DOUBLE_OUT = 0.96;
const R_DOUBLE_IN = 0.88;
const R_TRIPLE_OUT = 0.58;
const R_TRIPLE_IN = 0.50;
const R_SINGLE_OUTER = 0.88; // between double and triple
const R_SINGLE_INNER = 0.58; // between triple and bull area
const R_OUTER_BULL = 0.16;
const R_BULLSEYE = 0.065;
const BOARD_R = CENTER - 4; // pixel radius

// Occasion quadrants mapped to board halves
interface Quadrant {
  id: 'morning_routine' | 'passing_by' | 'catching_up' | 'treating_myself';
  label: string;
  hint: string;
  color: string;
}

const QUADRANTS: Quadrant[] = [
  { id: 'morning_routine', label: 'Morning ritual', hint: 'Daily stop', color: '#C67C4E' },
  { id: 'catching_up', label: 'Catching up', hint: 'With friends', color: '#E8A87C' },
  { id: 'treating_myself', label: 'Treating myself', hint: 'Special day', color: '#D4A574' },
  { id: 'passing_by', label: 'Passing by', hint: 'Saw it, came in', color: '#B07355' },
];

// Map angle to occasion quadrant (0° = up, clockwise)
function angleToQuadrant(angleDeg: number): Quadrant {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a < 90) return QUADRANTS[0];   // top-right → morning_routine
  if (a < 180) return QUADRANTS[1];  // bottom-right → catching_up
  if (a < 270) return QUADRANTS[2];  // bottom-left → treating_myself
  return QUADRANTS[3];               // top-left → passing_by
}

interface DartHit {
  x: number;
  y: number;
  quadrantId: Quadrant['id'];
  score: number;
  ring: 'bullseye' | 'outer_bull' | 'single' | 'triple' | 'double' | 'miss';
}

type Phase = 'intro' | 'aiming' | 'flying' | 'result';
type AimStage = 'x' | 'y' | 'thrown';

// --- SCORING ---

function hitInfo(px: number, py: number): { score: number; ring: DartHit['ring']; quadrant: Quadrant } {
  const dx = px - CENTER;
  const dy = py - CENTER;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = dist / BOARD_R;

  // Bullseye / outer bull
  if (r <= R_BULLSEYE) return { score: 50, ring: 'bullseye', quadrant: angleToQuadrant(0) };
  if (r <= R_OUTER_BULL) return { score: 25, ring: 'outer_bull', quadrant: angleToQuadrant(0) };
  if (r > R_OUTER) return { score: 0, ring: 'miss', quadrant: angleToQuadrant(0) };

  // Determine segment — angle from top, clockwise
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI); // 0° = up
  angle = ((angle % 360) + 360) % 360;
  const segIdx = Math.floor((angle + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % 20;
  const segValue = SEGMENTS[segIdx];
  const quadrant = angleToQuadrant(angle);

  if (r >= R_DOUBLE_IN && r <= R_DOUBLE_OUT) return { score: segValue * 2, ring: 'double', quadrant };
  if (r >= R_TRIPLE_IN && r <= R_TRIPLE_OUT) return { score: segValue * 3, ring: 'triple', quadrant };
  return { score: segValue, ring: 'single', quadrant };
}

function scoreToDiscount(totalScore: number, maxPossible: number): number {
  const pct = totalScore / maxPossible;
  return Math.max(1, Math.min(10, Math.round(1 + pct * 9)));
}

function aggregateOccasion(hits: DartHit[]): Quadrant['id'] {
  if (hits.length === 0) return 'passing_by';
  const counts: Record<string, number> = {};
  for (const h of hits) {
    counts[h.quadrantId] = (counts[h.quadrantId] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Quadrant['id'];
}

// --- SVG DARTBOARD ---

function polarToXY(angleDeg: number, rFrac: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [CENTER + Math.cos(rad) * rFrac * BOARD_R, CENTER + Math.sin(rad) * rFrac * BOARD_R];
}

function arcPath(startAngle: number, endAngle: number, rOuter: number, rInner: number): string {
  const [x1, y1] = polarToXY(startAngle, rOuter);
  const [x2, y2] = polarToXY(endAngle, rOuter);
  const [x3, y3] = polarToXY(endAngle, rInner);
  const [x4, y4] = polarToXY(startAngle, rInner);
  const ro = rOuter * BOARD_R;
  const ri = rInner * BOARD_R;
  return `M${x1},${y1} A${ro},${ro} 0 0,1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 0,0 ${x4},${y4} Z`;
}

// Alternating segment colors — classic dark/light
const DARK = '#2C2C2C';
const LIGHT = '#F5E6D0';
const RED = '#E14B3B';
const GREEN = '#2D8B46';

function Dartboard({
  hits,
  cursorX,
  cursorY,
  aimStage,
  lockedX,
}: {
  hits: DartHit[];
  cursorX: number | null;
  cursorY: number | null;
  aimStage: AimStage;
  lockedX: number | null;
}) {
  return (
    <svg width={BOARD} height={BOARD} viewBox={`0 0 ${BOARD} ${BOARD}`} className="touch-none select-none">
      {/* Board background */}
      <circle cx={CENTER} cy={CENTER} r={BOARD_R} fill="#1A1A1A" />

      {/* 20 segments — single outer, single inner, double ring, triple ring */}
      {SEGMENTS.map((_, i) => {
        const startA = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
        const endA = startA + SEGMENT_ANGLE;
        const isEven = i % 2 === 0;
        const singleColor = isEven ? DARK : LIGHT;
        const doubleColor = isEven ? RED : GREEN;
        const tripleColor = isEven ? RED : GREEN;

        return (
          <g key={i}>
            {/* Double ring */}
            <path d={arcPath(startA, endA, R_DOUBLE_OUT, R_DOUBLE_IN)} fill={doubleColor} />
            {/* Outer single */}
            <path d={arcPath(startA, endA, R_SINGLE_OUTER, R_TRIPLE_OUT)} fill={singleColor} />
            {/* Triple ring */}
            <path d={arcPath(startA, endA, R_TRIPLE_OUT, R_TRIPLE_IN)} fill={tripleColor} />
            {/* Inner single */}
            <path d={arcPath(startA, endA, R_SINGLE_INNER, R_OUTER_BULL)} fill={singleColor} />
          </g>
        );
      })}

      {/* Wire rings */}
      {[R_DOUBLE_OUT, R_DOUBLE_IN, R_TRIPLE_OUT, R_TRIPLE_IN, R_OUTER_BULL].map((r) => (
        <circle key={r} cx={CENTER} cy={CENTER} r={r * BOARD_R} fill="none" stroke="#888" strokeWidth="0.6" />
      ))}

      {/* Wire spokes */}
      {SEGMENTS.map((_, i) => {
        const a = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
        const [x1, y1] = polarToXY(a, R_OUTER_BULL);
        const [x2, y2] = polarToXY(a, R_DOUBLE_OUT);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#888" strokeWidth="0.6" />;
      })}

      {/* Outer bull */}
      <circle cx={CENTER} cy={CENTER} r={R_OUTER_BULL * BOARD_R} fill={GREEN} />
      {/* Bullseye */}
      <circle cx={CENTER} cy={CENTER} r={R_BULLSEYE * BOARD_R} fill={RED} />

      {/* Segment numbers */}
      {SEGMENTS.map((num, i) => {
        const a = i * SEGMENT_ANGLE;
        const [x, y] = polarToXY(a, 0.93);
        return (
          <text
            key={num}
            x={x}
            y={y + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontWeight="700"
            fill="#FFFBF5"
            style={{ fontFamily: 'Karla, system-ui, sans-serif' }}
          >
            {num}
          </text>
        );
      })}

      {/* Existing dart hits */}
      {hits.map((h, i) => (
        <g key={i}>
          <circle cx={h.x} cy={h.y} r="5" fill="#3C2415" />
          <circle cx={h.x} cy={h.y} r="2.5" fill="#FEF3C7" />
          {/* Dart shaft */}
          <line x1={h.x} y1={h.y} x2={h.x + 3} y2={h.y - 12} stroke="#3C2415" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={h.x + 3} y1={h.y - 12} x2={h.x + 1} y2={h.y - 16} stroke="#C67C4E" strokeWidth="1" />
          <line x1={h.x + 3} y1={h.y - 12} x2={h.x + 5} y2={h.y - 16} stroke="#C67C4E" strokeWidth="1" />
        </g>
      ))}

      {/* Locked X line */}
      {lockedX != null && aimStage === 'y' && (
        <line x1={lockedX} y1={0} x2={lockedX} y2={BOARD} stroke="#FEF3C7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
      )}

      {/* Sweeping cursors */}
      {aimStage === 'x' && cursorX != null && (
        <line x1={cursorX} y1={0} x2={cursorX} y2={BOARD} stroke="#FEF3C7" strokeWidth="2.5" opacity="0.9" />
      )}
      {aimStage === 'y' && cursorY != null && (
        <line x1={0} y1={cursorY} x2={BOARD} y2={cursorY} stroke="#FEF3C7" strokeWidth="2.5" opacity="0.9" />
      )}
    </svg>
  );
}

// --- SVG DART (animated projectile) ---

function FlyingDart({
  fromX,
  fromY,
  toX,
  toY,
  onDone,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  onDone: () => void;
}) {
  const ref = useRef<SVGGElement>(null);
  const startTime = useRef(performance.now());
  const duration = 320; // ms

  useEffect(() => {
    let running = true;
    function animate(now: number) {
      if (!running || !ref.current) return;
      const t = Math.min(1, (now - startTime.current) / duration);
      // Ease out cubic
      const e = 1 - Math.pow(1 - t, 3);

      // Curved path — arc upward then down to target
      const x = fromX + (toX - fromX) * e;
      const arcHeight = -80 * (1 - Math.pow(2 * t - 1, 2));
      const y = fromY + (toY - fromY) * e + arcHeight;

      // Scale down as it "recedes"
      const scale = 2.2 - 1.2 * e;

      ref.current.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        onDone();
      }
    }
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, [fromX, fromY, toX, toY, onDone]);

  return (
    <svg
      width={BOARD}
      height={BOARD + 100}
      viewBox={`0 0 ${BOARD} ${BOARD + 100}`}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <g ref={ref}>
        {/* Dart tip */}
        <polygon points="0,-8 -2,0 2,0" fill="#3C2415" />
        {/* Shaft */}
        <rect x={-1} y={0} width={2} height={14} fill="#8B5E3C" rx={0.5} />
        {/* Flights */}
        <polygon points="-1,14 -5,20 -1,18" fill="#C67C4E" />
        <polygon points="1,14 5,20 1,18" fill="#C67C4E" />
      </g>
    </svg>
  );
}

// --- AIMING LOGIC ---

function useAiming(onLand: (x: number, y: number) => void) {
  const [stage, setStage] = useState<AimStage>('x');
  const [cursorX, setCursorX] = useState<number>(8);
  const [cursorY, setCursorY] = useState<number>(8);
  const [lockedX, setLockedX] = useState<number | null>(null);
  const lastTime = useRef<number>(performance.now());
  const direction = useRef<1 | -1>(1);
  const animRef = useRef<number>(0);

  const reset = useCallback(() => {
    setStage('x');
    setCursorX(8);
    setCursorY(8);
    setLockedX(null);
    direction.current = 1;
    lastTime.current = performance.now();
  }, []);

  useEffect(() => {
    let running = true;
    function loop(now: number) {
      if (!running) return;
      const dt = now - lastTime.current;
      lastTime.current = now;

      if (stage === 'x') {
        setCursorX((prev) => {
          let next = prev + direction.current * SWEEP_SPEED * dt;
          if (next >= BOARD - 8) { direction.current = -1; next = BOARD - 8; }
          else if (next <= 8) { direction.current = 1; next = 8; }
          return next;
        });
      } else if (stage === 'y') {
        setCursorY((prev) => {
          let next = prev + direction.current * SWEEP_SPEED * dt;
          if (next >= BOARD - 8) { direction.current = -1; next = BOARD - 8; }
          else if (next <= 8) { direction.current = 1; next = 8; }
          return next;
        });
      }
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [stage]);

  const tap = useCallback(() => {
    if (stage === 'x') {
      setLockedX(cursorX);
      setStage('y');
      direction.current = 1;
      audio.tap();
      haptics.press();
    } else if (stage === 'y') {
      setStage('thrown');
      audio.release();
      haptics.land();
      onLand(lockedX!, cursorY);
    }
  }, [stage, cursorX, cursorY, lockedX, onLand]);

  return { stage, cursorX, cursorY, lockedX, tap, reset };
}

// --- MAIN SCREEN ---

export default function DartsScreen() {
  const go = useNavigation((s) => s.go);
  const addHardGameResult = useGameStore((s) => s.addHardGameResult);
  const [phase, setPhase] = useState<Phase>('intro');
  const [hits, setHits] = useState<DartHit[]>([]);
  const [throwIdx, setThrowIdx] = useState(0);
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [finalOccasion, setFinalOccasion] = useState<Quadrant | null>(null);
  const [flyingDart, setFlyingDart] = useState<{ toX: number; toY: number } | null>(null);

  const handleLand = useCallback(
    (x: number, y: number) => {
      // Show flying dart animation first
      setFlyingDart({ toX: x, toY: y });
      setPhase('flying');
    },
    []
  );

  const onDartArrived = useCallback(() => {
    if (!flyingDart) return;
    const { toX, toY } = flyingDart;
    setFlyingDart(null);
    setPhase('aiming');

    const info = hitInfo(toX, toY);
    const newHit: DartHit = {
      x: toX,
      y: toY,
      quadrantId: info.quadrant.id,
      score: info.score,
      ring: info.ring,
    };
    const nextHits = [...hits, newHit];
    setHits(nextHits);
    setThrowIdx((i) => i + 1);

    // Per-throw feedback
    if (info.ring === 'bullseye') {
      audio.bullseye();
      haptics.jackpot();
    } else if (info.ring === 'triple' || info.ring === 'double') {
      audio.perfect();
      haptics.perfect();
    } else if (info.ring === 'miss') {
      audio.miss();
      haptics.miss();
    } else {
      audio.impact();
      haptics.impact();
    }

    if (nextHits.length >= THROWS) {
      const totalScore = nextHits.reduce((acc, h) => acc + h.score, 0);
      const maxPossible = THROWS * 60; // triple-20 each throw
      const discount = scoreToDiscount(totalScore, maxPossible);
      const scorePercent = Math.round((totalScore / maxPossible) * 100);
      const occasionId = aggregateOccasion(nextHits);
      const occasion = QUADRANTS.find((q) => q.id === occasionId)!;

      addHardGameResult({
        gameId: 'darts',
        signalKey: 'occasion',
        signalValue: occasionId,
        scorePercent,
        discount,
      });

      setFinalDiscount(discount);
      setFinalOccasion(occasion);
      setTimeout(() => setPhase('result'), 700);
    }
  }, [flyingDart, hits, addHardGameResult]);

  const aim = useAiming(handleLand);

  // Reset aiming between throws
  useEffect(() => {
    if (phase === 'aiming' && aim.stage === 'thrown' && hits.length < THROWS) {
      const t = setTimeout(() => aim.reset(), 450);
      return () => clearTimeout(t);
    }
  }, [aim, phase, hits.length]);

  function startGame() {
    audio.tap();
    haptics.press();
    setPhase('aiming');
  }

  function continueToNext() {
    audio.tap();
    haptics.press();
    go('stackTower');
  }

  return (
    <ScreenShell className="justify-center">
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            className="flex-1 flex flex-col justify-center items-center text-center"
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
              Round 1 — Aim
            </motion.p>
            <motion.h2
              className="text-[26px] font-bold font-display text-ink mb-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle, delay: 0.05 }}
            >
              What brought you in?
            </motion.h2>
            <motion.p
              className="text-ink-muted text-[14px] mb-8 max-w-[280px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              Throw 3 darts at the board. Hit doubles & triples for bigger discounts.
            </motion.p>

            <motion.div
              className="rounded-2xl bg-white/70 border border-ink-ghost/10 p-5 mb-8 w-full max-w-[300px]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-[13px] text-ink-muted mb-2 font-semibold">How to throw</p>
              <ol className="text-[12px] text-ink-soft space-y-1.5 text-left">
                <li>1. Tap to lock the vertical line</li>
                <li>2. Tap to lock the horizontal line</li>
                <li>3. Watch the dart fly to the board</li>
              </ol>
            </motion.div>

            <motion.button
              className="w-full max-w-[300px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={startGame}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Start throwing
            </motion.button>
          </motion.div>
        )}

        {(phase === 'aiming' || phase === 'flying') && (
          <motion.div
            key="aiming"
            className="flex-1 flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.gentle}
          >
            <p className="text-[14px] font-semibold text-ink-soft mb-1">
              Throw {Math.min(throwIdx + 1, THROWS)} of {THROWS}
            </p>
            <p className="text-[12px] text-ink-muted mb-1">
              {aim.stage === 'x' ? 'Tap to lock the vertical line' : aim.stage === 'y' ? 'Now lock the horizontal line' : 'Nice throw!'}
            </p>
            {/* Score so far */}
            <p className="text-[11px] text-ink-quiet mb-3">
              Score: {hits.reduce((a, h) => a + h.score, 0)}
            </p>

            <div className="relative">
              <button
                type="button"
                onClick={phase === 'aiming' ? aim.tap : undefined}
                className="rounded-3xl bg-white shadow-card-lg p-3 cursor-pointer"
                style={{ touchAction: 'manipulation' }}
              >
                <Dartboard
                  hits={hits}
                  cursorX={aim.cursorX}
                  cursorY={aim.cursorY}
                  aimStage={aim.stage}
                  lockedX={aim.lockedX}
                />
              </button>

              {/* Flying dart overlay */}
              {flyingDart && (
                <FlyingDart
                  fromX={CENTER}
                  fromY={BOARD + 60}
                  toX={flyingDart.toX}
                  toY={flyingDart.toY}
                  onDone={onDartArrived}
                />
              )}
            </div>

            {/* Throws indicator */}
            <div className="flex gap-2 mt-5">
              {Array.from({ length: THROWS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i < hits.length ? 'bg-brand' : 'bg-ink-ghost/20'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'result' && finalOccasion && (
          <motion.div
            key="result"
            className="flex-1 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.bouncy}
          >
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${finalOccasion.color}20` }}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="16" fill={finalOccasion.color} fillOpacity="0.25" />
                <circle cx="20" cy="20" r="6" fill={finalOccasion.color} />
              </svg>
            </motion.div>

            <motion.p
              className="text-[12px] uppercase tracking-widest text-ink-quiet font-semibold mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              You came for
            </motion.p>
            <motion.h2
              className="text-[24px] font-bold font-display text-ink mb-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {finalOccasion.label}
            </motion.h2>
            <motion.p
              className="text-[14px] text-ink-muted mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {finalOccasion.hint}
            </motion.p>

            {/* Hit summary */}
            <motion.div
              className="flex gap-2 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
            >
              {hits.map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-ink-soft bg-white/60 px-2 py-1 rounded-full">
                  {h.score}pts
                </span>
              ))}
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
              Next round
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
