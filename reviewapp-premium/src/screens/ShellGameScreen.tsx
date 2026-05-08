import { useState, useRef, useEffect } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, animate,
  type MotionValue,
} from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useLuckStore } from '@/architecture/luck/store';
import PrimaryButton from '@/components/PrimaryButton';
import { spring } from '@/design/motion';
import { haptics } from '@/design/haptics';
import { audio } from '@/design/audio';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'question'
  | 'ball_drop'
  | 'cup_show'
  | 'cup_shuffle'
  | 'cup_pick'
  | 'resolving'
  | 'win'
  | 'lose';

// ── Constants ─────────────────────────────────────────────────────────────────

const SLOT_X = [-115, 0, 115] as const; // px offsets for left / mid / right slots
const CUP_PHASES: Phase[] = ['cup_show', 'cup_shuffle', 'cup_pick', 'resolving', 'win', 'lose'];


// Shuffles: [slotA, slotB, durationMs]
const SHUFFLE_SEQUENCE: [number, number, number][] = [
  [0, 2, 440], [0, 1, 400], [1, 2, 370],
  [0, 2, 320], [1, 2, 290],
  [0, 1, 240], [0, 2, 215], [1, 2, 205],
  [0, 1, 200],
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Answer options ────────────────────────────────────────────────────────────

const ANSWERS = [
  { label: 'Could be better',  positive: false, ballColor: ['#D4956A', '#A05A32'] },
  { label: 'It was good!',     positive: true,  ballColor: ['#E8B896', '#C67C4E'] },
  { label: 'Absolutely perfect', positive: true, ballColor: ['#C67C4E', '#6B2D0B'] },
] as const;


// ── Performance tier helper ───────────────────────────────────────────────────

function getPerformanceTier(
  scored: boolean | null,
  positiveRatio: number,
): 'high' | 'mid' | 'low' {
  if (scored === true  && positiveRatio > 0.5) return 'high';
  if (scored === false && positiveRatio <= 0.5) return 'low';
  return 'mid';
}

// ── Client-side fallback (mirrors server win thresholds) ─────────────────────

function clientCupGame(tier: 'high' | 'mid' | 'low', userPick: number): { result: 'win' | 'lose'; ballAt: number } {
  const thresholds = { high: 25, mid: 40, low: 60 };
  const win = Math.random() * 100 < thresholds[tier];
  if (win) return { result: 'win', ballAt: userPick };
  const near = userPick === 1
    ? (Math.random() < 0.5 ? 0 : 2)
    : 1;
  return { result: 'lose', ballAt: near };
}

// ── Ball SVG ─────────────────────────────────────────────────────────────────

function BallSVG({ size = 44, colors }: { size?: number; colors: readonly [string, string] }) {
  const id = `bg-${colors[0].replace('#', '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={id} cx="35%" cy="28%" r="65%">
          <stop offset="0%"   stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="20" fill={`url(#${id})`} />
      <ellipse cx="16" cy="15" rx="5" ry="3.5"
        fill="rgba(255,255,255,0.32)" transform="rotate(-20,16,15)" />
    </svg>
  );
}

// ── Cup SVG ───────────────────────────────────────────────────────────────────

function CupSVG({ highlighted, lifted }: { highlighted: boolean; lifted?: boolean }) {
  return (
    <svg width="76" height="72" viewBox="0 0 76 72" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id={highlighted ? 'cupHL' : 'cupBase'} cx="32%" cy="28%" r="68%">
          <stop offset="0%"   stopColor={highlighted ? '#F0D5B8' : '#EDD5BB'} />
          <stop offset="100%" stopColor={highlighted ? '#C67C4E' : '#A05A32'} />
        </radialGradient>
        <filter id={`cs-${highlighted ? 'hl' : 'n'}${lifted ? 'l' : ''}`}>
          <feDropShadow dx="0" dy={lifted ? 12 : 5}
            stdDeviation={lifted ? 8 : 4}
            floodColor="rgba(0,0,0,0.22)" />
        </filter>
      </defs>

      {/* Dome */}
      <path
        d="M10,50 Q8,14 38,8 Q68,14 66,50 Z"
        fill={`url(#${highlighted ? 'cupHL' : 'cupBase'})`}
        filter={`url(#cs-${highlighted ? 'hl' : 'n'}${lifted ? 'l' : ''})`}
        stroke={highlighted ? 'rgba(198,124,78,0.6)' : 'rgba(200,170,140,0.3)'}
        strokeWidth={highlighted ? 2 : 1}
      />
      {/* Base */}
      <rect x="10" y="50" width="56" height="13" rx="6.5"
        fill={highlighted ? '#C67C4E' : '#A05A32'}
        stroke={highlighted ? 'rgba(198,124,78,0.4)' : 'none'} strokeWidth="1"
      />
      {/* Foot */}
      <rect x="18" y="61" width="40" height="9" rx="4.5"
        fill={highlighted ? '#A05A32' : '#8B4513'}
      />
      {/* Shine */}
      <path
        d="M19,38 Q22,20 36,16"
        stroke="rgba(255,255,255,0.38)" strokeWidth="2.5"
        fill="none" strokeLinecap="round"
      />
    </svg>
  );
}


// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const COLORS = ['#F59E0B','#FCD34D','#C67C4E','#E8B896','#0D9E6F','#D97706','#6B2D0B'];
  const particles = useRef(
    Array.from({ length: 52 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      size: 5 + Math.random() * 7,
      tx: (Math.random() - 0.5) * 360,
      ty: -(Math.random() * 230) - 50,
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 0.4,
      circle: Math.random() > 0.5,
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div key={p.id}
          className="absolute"
          style={{
            left: '50%', top: '40%',
            width: p.size,
            height: p.circle ? p.size : p.size * 1.6,
            backgroundColor: p.color,
            borderRadius: p.circle ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ x: p.tx, y: [p.ty, p.ty + 460], opacity: [1, 1, 0], rotate: p.rot, scale: [0, 1.2, 1, 0.3] }}
          transition={{ duration: 2, delay: p.delay, ease: [0.16, 1, 0.3, 1],
            y: { duration: 2.3, ease: 'easeIn', delay: p.delay },
            opacity: { duration: 2.3, delay: p.delay } }}
        />
      ))}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ShellGameScreen() {
  const go              = useNavigation((s) => s.go);
  const menuItems       = useGameStore((s) => s.menuItems);
  const addSwipeAnswer  = useGameStore((s) => s.addSwipeAnswer);
  const basketballAnswer = useGameStore((s) => s.basketballAnswer);
  const slingshotAnswers = useGameStore((s) => s.slingshotAnswers);
  const setCupGameLuck  = useLuckStore((s) => s.setCupGameLuck);

  const meal = menuItems[0] || 'your order';
  const positiveRatio = slingshotAnswers.length
    ? slingshotAnswers.filter((a) => a.positive).length / slingshotAnswers.length
    : 0.5;
  const tier = getPerformanceTier(basketballAnswer?.scored ?? null, positiveRatio);

  // ── Core state ──
  const [phase, setPhase]               = useState<Phase>('question');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot]   = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [gameResult, setGameResult]     = useState<{ result: 'win' | 'lose'; ballAt: number } | null>(null);

  // ── Cup motion values ──
  const cup0X = useMotionValue<number>(SLOT_X[0]);
  const cup1X = useMotionValue<number>(SLOT_X[1]);
  const cup2X = useMotionValue<number>(SLOT_X[2]);
  const cup0Y = useMotionValue<number>(0);
  const cup1Y = useMotionValue<number>(0);
  const cup2Y = useMotionValue<number>(0);

  const cupXValues: MotionValue<number>[] = [cup0X, cup1X, cup2X];
  const cupYValues: MotionValue<number>[] = [cup0Y, cup1Y, cup2Y];

  // positions[cupId] = slot (0=left,1=mid,2=right)
  const posRef = useRef<[number, number, number]>([0, 1, 2]);

  // ── Phase transitions ─────────────────────────────────────────────────────

  // cup_show: show ball briefly under center cup, then trigger shuffle
  useEffect(() => {
    if (phase !== 'cup_show') return;
    let alive = true;

    (async () => {
      await wait(380); // cups animate in
      if (!alive) return;

      // Lift center cup (cup 1 starts at slot 1 = center)
      await animate(cup1Y, -56, { duration: 0.32, ease: [0.16, 1, 0.3, 1] });
      if (!alive) return;
      haptics.tick();
      audio.tap();

      await wait(680);
      if (!alive) return;

      // Lower center cup, close over ball
      await animate(cup1Y, 0, { duration: 0.26, ease: [0.4, 0, 0.6, 1] });
      if (!alive) return;

      await wait(380);
      if (!alive) return;
      setPhase('cup_shuffle');
    })();

    return () => { alive = false; };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // cup_shuffle: run swap sequence then hand to user
  useEffect(() => {
    if (phase !== 'cup_shuffle') return;
    let alive = true;

    (async () => {
      for (const [slotA, slotB, dur] of SHUFFLE_SEQUENCE) {
        if (!alive) break;
        await swapSlots(slotA, slotB, dur);
        await wait(70);
      }
      if (alive) {
        haptics.bump();
        setPhase('cup_pick');
      }
    })();

    return () => { alive = false; };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slot swap helper ─────────────────────────────────────────────────────

  function swapSlots(slotA: number, slotB: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const pos = [...posRef.current] as [number, number, number];
      const cupAtA = pos.findIndex((v) => v === slotA);
      const cupAtB = pos.findIndex((v) => v === slotB);
      if (cupAtA === -1 || cupAtB === -1) { resolve(); return; }

      pos[cupAtA] = slotB;
      pos[cupAtB] = slotA;
      posRef.current = pos;

      const dur = durationMs / 1000;
      const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

      Promise.all([
        animate(cupXValues[cupAtA], SLOT_X[slotB], { duration: dur, ease }),
        animate(cupXValues[cupAtB], SLOT_X[slotA], { duration: dur, ease }),
      ]).then(() => resolve());
    });
  }

  // ── User picks a cup ─────────────────────────────────────────────────────

  async function handleCupPick(slot: number) {
    if (phase !== 'cup_pick') return;
    setSelectedSlot(slot);
    setPhase('resolving');
    haptics.press();
    audio.tap();

    let result: { result: 'win' | 'lose'; ballAt: number };

    try {
      const res = await fetch('/api/cup-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userPick: slot }),
      });
      if (!res.ok) throw new Error();
      result = await res.json();
    } catch {
      result = clientCupGame(tier, slot);
    }

    setGameResult(result);
    await revealResult(slot, result.result, result.ballAt);
  }

  // ── Reveal animation ─────────────────────────────────────────────────────

  async function revealResult(
    pickedSlot: number,
    outcome: 'win' | 'lose',
    ballAt: number,
  ) {
    // Find cup IDs for the picked slot and ball slot
    const pickedCupId = posRef.current.findIndex((v) => v === pickedSlot);
    await wait(250);

    // Lift picked cup
    await animate(cupYValues[pickedCupId], -68, {
      duration: 0.42, ease: [0.16, 1, 0.3, 1],
    });

    if (outcome === 'win') {
      haptics.jackpot();
      audio.bullseye();
      await wait(500);
      setPhase('win');
    } else {
      haptics.miss();
      audio.miss();
      await wait(650);

      // Near-miss: lift the adjacent cup where ball actually is
      const ballCupId = posRef.current.findIndex((v) => v === ballAt);
      await animate(cupYValues[ballCupId], -52, {
        duration: 0.36, ease: [0.16, 1, 0.3, 1],
      });
      haptics.bump();
      await wait(400);
      setPhase('lose');
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleAnswerPick(idx: number) {
    if (phase !== 'question') return;
    setSelectedAnswer(idx);
    haptics.press();
    audio.tap();

    addSwipeAnswer({
      questionId: 'shell_overall',
      question: `How was ${meal}?`,
      positive: ANSWERS[idx].positive,
    });

    setPhase('ball_drop');
  }

  function handleContinueWin() {
    haptics.press();
    audio.tap();
    setCupGameLuck(true);
    go('spinWheel');
  }

  function handleContinueLose() {
    haptics.press();
    audio.tap();
    setCupGameLuck(false);
    go('spinWheel');
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const answerColors = selectedAnswer !== null
    ? ANSWERS[selectedAnswer].ballColor
    : ANSWERS[1].ballColor;

  const isCupPhase = (CUP_PHASES as Phase[]).includes(phase);

  // ── Render helpers ────────────────────────────────────────────────────────

  function getCupXForId(id: 0 | 1 | 2) {
    return [cup0X, cup1X, cup2X][id];
  }
  function getCupYForId(id: 0 | 1 | 2) {
    return [cup0Y, cup1Y, cup2Y][id];
  }

  // Ball render position during reveal: SLOT_X[ballAt]
  const ballAtSlot = gameResult?.ballAt ?? 1;
  const ballRevealX = SLOT_X[ballAtSlot];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenShell hideProgress hideBack>
      <div className="flex-1 flex flex-col">

        {/* ─── Phase 1: Question card ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === 'question' && (
            <motion.div
              key="question"
              className="flex-1 flex flex-col justify-center px-1 py-8"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -60, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
              transition={spring.gentle}
            >
              {/* Badge */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring.snappy, delay: 0.05 }}
              >
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-caption font-semibold"
                  style={{ background: 'rgba(198,124,78,0.1)', color: '#C67C4E', border: '1px solid rgba(198,124,78,0.18)' }}
                >
                  <span>Quick question</span>
                </div>
              </motion.div>

              {/* Question */}
              <motion.h1
                className="text-heading text-ink text-center mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.1 }}
              >
                How was {meal}?
              </motion.h1>
              <motion.p
                className="text-body text-ink-secondary text-center mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 }}
              >
                Pick one — your answer becomes a ball
              </motion.p>

              {/* Answer chips */}
              <div className="space-y-3">
                {ANSWERS.map((answer, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => handleAnswerPick(idx)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(200,170,140,0.22)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
                    }}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring.gentle, delay: 0.14 + idx * 0.06 }}
                    whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(198,124,78,0.18)', borderColor: 'rgba(198,124,78,0.35)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="text-body text-ink font-medium">{answer.label}</span>
                    {/* Ball indicator */}
                    <motion.div
                      className="flex-shrink-0 ml-3"
                      whileHover={{ scale: 1.15 }}
                    >
                      <BallSVG size={28} colors={answer.ballColor} />
                    </motion.div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── Phase 2: Ball drop ─────────────────────────────────────── */}
          {phase === 'ball_drop' && (
            <motion.div
              key="ball-drop"
              className="flex-1 relative overflow-hidden"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Ball drops from top-center to center-bottom */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ top: 80 }}
                initial={{ scale: 0.3, opacity: 0, y: 0 }}
                animate={{
                  scale: [0.3, 1.08, 0.96, 1.02, 1],
                  opacity: [0, 1, 1, 1, 1],
                  y: [0, 195, 172, 185, 179],
                }}
                transition={{
                  duration: 1.05,
                  times: [0, 0.48, 0.63, 0.79, 1],
                  ease: 'easeOut',
                }}
                onAnimationComplete={() => setTimeout(() => setPhase('cup_show'), 180)}
              >
                <BallSVG size={52} colors={answerColors} />
              </motion.div>

              {/* Subtle ground shadow that pulses */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 rounded-full"
                style={{ bottom: 148, width: 40, height: 8, background: 'rgba(0,0,0,0.12)', filter: 'blur(4px)' }}
                initial={{ scaleX: 0.4, opacity: 0 }}
                animate={{ scaleX: [0.4, 1, 0.85, 0.94, 0.9], opacity: [0, 0.6, 0.5, 0.55, 0.52] }}
                transition={{ duration: 1.05, times: [0, 0.48, 0.63, 0.79, 1] }}
              />
            </motion.div>
          )}

        </AnimatePresence>

        {/* ─── Phases 4 & 5: Cup game ─────────────────────────────────────── */}
        <AnimatePresence>
          {isCupPhase && (
            <motion.div
              key="cups"
              className="flex-1 flex flex-col justify-between py-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle }}
            >
              {/* Header */}
              <motion.div
                className="text-center px-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-semibold mb-3"
                  style={{ background: 'rgba(198,124,78,0.1)', color: '#C67C4E', border: '1px solid rgba(198,124,78,0.18)' }}
                >
                  <span>Shell Game</span>
                </div>

                <h2 className="text-heading text-ink mb-1">
                  {phase === 'cup_show' && 'Watch the ball…'}
                  {phase === 'cup_shuffle' && 'Keep your eyes on it!'}
                  {phase === 'cup_pick' && 'Which cup hides the ball?'}
                  {phase === 'resolving' && 'Checking…'}
                  {phase === 'win' && 'You found it!'}
                  {phase === 'lose' && 'So close!'}
                </h2>
                <p className="text-body text-ink-secondary">
                  {phase === 'cup_show' && 'The ball goes under the center cup'}
                  {phase === 'cup_shuffle' && 'Follow the cup…'}
                  {phase === 'cup_pick' && 'Tap the cup you think it\'s under'}
                  {phase === 'resolving' && ''}
                  {phase === 'win' && 'Spin Wheel unlocked!'}
                  {phase === 'lose' && 'The ball was right next door'}
                </p>
              </motion.div>

              {/* Cup + ball arena */}
              <div className="relative flex justify-center items-end" style={{ height: 180 }}>

                {/* Ball — visible only during cup_show (peeks out) and win/lose reveal */}
                <AnimatePresence>
                  {phase === 'cup_show' && (
                    <motion.div
                      key="ball-show"
                      className="absolute z-0"
                      style={{ bottom: 20, left: '50%', x: '-50%' }}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={spring.snappy}
                    >
                      <BallSVG size={36} colors={answerColors} />
                    </motion.div>
                  )}

                  {(phase === 'win' || phase === 'lose') && gameResult && (
                    <motion.div
                      key="ball-reveal"
                      className="absolute z-0"
                      style={{
                        bottom: 22,
                        left: `calc(50% + ${ballRevealX}px)`,
                        x: '-50%',
                      }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring.snappy, delay: 0.1 }}
                    >
                      <BallSVG size={36} colors={answerColors} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3 cups */}
                {([0, 1, 2] as const).map((cupId) => {
                  const isSelected = selectedSlot !== null
                    && posRef.current[cupId] === selectedSlot;
                  const isBallCup = gameResult !== null
                    && posRef.current[cupId] === gameResult.ballAt;
                  const isPickable = phase === 'cup_pick';
                  const slot = posRef.current[cupId];
                  const isHovered = hoveredSlot === slot && isPickable;

                  return (
                    <motion.div
                      key={cupId}
                      className="absolute z-10"
                      style={{
                        x: getCupXForId(cupId),
                        y: getCupYForId(cupId),
                        bottom: 10,
                        left: '50%',
                        marginLeft: -38,
                        cursor: isPickable ? 'pointer' : 'default',
                      }}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ ...spring.gentle, delay: 0.05 + cupId * 0.08 }}
                      onHoverStart={() => isPickable && setHoveredSlot(slot)}
                      onHoverEnd={() => setHoveredSlot(null)}
                      onClick={() => isPickable && handleCupPick(slot)}
                      whileTap={isPickable ? { scale: 0.93 } : {}}
                    >
                      {/* Selection ring */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 rounded-2xl pointer-events-none"
                            style={{ boxShadow: '0 0 0 3px rgba(198,124,78,0.5)', borderRadius: 12 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Win glow */}
                      <AnimatePresence>
                        {phase === 'win' && isSelected && (
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'radial-gradient(ellipse at 50% 50%, rgba(198,124,78,0.35) 0%, transparent 70%)',
                              borderRadius: 12,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0.7, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                          />
                        )}
                        {phase === 'lose' && isBallCup && (
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'radial-gradient(ellipse at 50% 50%, rgba(229,62,62,0.15) 0%, transparent 70%)',
                              borderRadius: 12,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          />
                        )}
                      </AnimatePresence>

                      <CupSVG
                        highlighted={isHovered || (phase === 'win' && isSelected)}
                        lifted={phase !== 'cup_show'}
                      />

                      {/* Resolving spinner on picked cup */}
                      {phase === 'resolving' && isSelected && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {[0, 0.12, 0.24].map((d, i) => (
                            <motion.span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: '#C67C4E' }}
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* ─ Result cards ─ */}
              <div className="px-4">
                <AnimatePresence mode="wait">

                  {/* Pick prompt */}
                  {phase === 'cup_pick' && (
                    <motion.p
                      key="pick-hint"
                      className="text-center text-caption text-ink-tertiary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Tap a cup
                    </motion.p>
                  )}

                  {/* WIN card */}
                  {phase === 'win' && (
                    <motion.div
                      key="win-card"
                      className="rounded-3xl overflow-hidden"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(198,124,78,0.25)',
                        boxShadow: '0 4px 24px rgba(198,124,78,0.22), 0 8px 32px rgba(0,0,0,0.06)',
                      }}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={spring.gentle}
                    >
                      {/* Coffee bar accent */}
                      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #C67C4E, transparent)' }} />

                      <div className="px-6 pt-5 pb-6 text-center">
                        <motion.div
                          className="text-5xl mb-3"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ...spring.snappy, delay: 0.15 }}
                        >
                          🎰
                        </motion.div>
                        <h3 className="text-heading text-ink mb-1">Spin Wheel Unlocked!</h3>
                        <p className="text-body text-ink-secondary mb-5">
                          Your prize is waiting. Spin to reveal it.
                        </p>
                        <PrimaryButton onClick={handleContinueWin}>
                          Spin Now
                        </PrimaryButton>
                      </div>
                    </motion.div>
                  )}

                  {/* LOSE card */}
                  {phase === 'lose' && (
                    <motion.div
                      key="lose-card"
                      className="rounded-3xl overflow-hidden"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(200,170,140,0.2)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      }}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={spring.gentle}
                    >
                      <div className="px-6 pt-5 pb-6 text-center">
                        <motion.div
                          className="text-5xl mb-3"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ...spring.snappy, delay: 0.15 }}
                        >
                          😮
                        </motion.div>
                        <h3 className="text-heading text-ink mb-1">Almost!</h3>
                        <p className="text-body text-ink-secondary mb-5">
                          The ball was right next door. Better luck next time!
                        </p>
                        <PrimaryButton variant="secondary" onClick={handleContinueLose}>
                          Continue to Review
                        </PrimaryButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confetti on win */}
        {phase === 'win' && <Confetti />}

      </div>
    </ScreenShell>
  );
}
