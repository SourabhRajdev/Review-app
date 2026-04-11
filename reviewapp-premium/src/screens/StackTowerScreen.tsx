// STACK TOWER SCREEN — Round 2 of hard mode
//
// Canvas-based stacking game with swinging hook + rope physics.
// - Hook swings as a pendulum (sin/cos) at the top of the canvas.
// - Tap to release the block — it drops with real gravity from the hook.
// - 5-state collision: miss / rotate-left / rotate-right / ok / perfect
// - Edge misalignment triggers a rotation + fall-off animation.
// - Captures VIBE_CHIPS signal — each landed block = one captured vibe.

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// --- CONFIG ---

const CANVAS_W = 320;
const CANVAS_H = 480;
const BLOCK_H = 28;
const INITIAL_BLOCK_W = 160;
const MAX_STACK = 9;
const GRAVITY = 0.0018; // px/ms²
const PERFECT_THRESHOLD = 6; // px — "perfect" if offset within this

// Pendulum
const HOOK_Y = 30;
const ROPE_ANCHOR_X = CANVAS_W / 2;
const PENDULUM_LENGTH = 80; // rope length in px
const PENDULUM_SPEED = 0.0025; // radians per ms
const PENDULUM_MAX_ANGLE = Math.PI / 3; // ±60°

// Colors
const BLOCK_COLORS = [
  '#C67C4E', '#8B5E3C', '#E8A87C', '#D4756B',
  '#A8896C', '#D4A574', '#B07355', '#9C6644', '#7A5230',
];

interface VibeOption {
  id: string;
  label: string;
}

const VIBE_POOL: VibeOption[] = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'work_friendly', label: 'Work-friendly' },
  { id: 'buzzy', label: 'Buzzy' },
  { id: 'date_night', label: 'Date-night' },
  { id: 'quiet', label: 'Quiet' },
  { id: 'instagrammable', label: 'Instagrammable' },
  { id: 'group_hangout', label: 'Group hangout' },
  { id: 'solo_friendly', label: 'Solo-friendly' },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface StackedBlock {
  x: number; // left edge
  width: number;
  vibe: VibeOption;
  color: string;
}

type CollisionState = 'miss' | 'rotate-left' | 'rotate-right' | 'ok' | 'perfect';

interface FallingBlock {
  x: number;
  y: number;
  width: number;
  vy: number;
  color: string;
  label: string;
  // Rotation for fall-off animation
  rotation: number;
  rotationSpeed: number;
  // If the block has collided with the stack
  collision: CollisionState | null;
  settled: boolean;
}

// Falling debris for trimmed portions
interface Debris {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

type Phase = 'intro' | 'playing' | 'result';

// --- MAIN SCREEN ---

export default function StackTowerScreen() {
  const go = useNavigation((s) => s.go);
  const addHardGameResult = useGameStore((s) => s.addHardGameResult);
  const [phase, setPhase] = useState<Phase>('intro');
  const [stackCount, setStackCount] = useState(0);
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [capturedVibes, setCapturedVibes] = useState<string[]>([]);
  const [lastLanding, setLastLanding] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameState = useRef<{
    stack: StackedBlock[];
    falling: FallingBlock | null;
    debris: Debris[];
    pendulumAngle: number;
    pendulumDir: number;
    vibeQueue: VibeOption[];
    vibeIdx: number;
    running: boolean;
    gameOver: boolean;
    lastTime: number;
    animId: number;
  }>({
    stack: [],
    falling: null,
    debris: [],
    pendulumAngle: 0,
    pendulumDir: 1,
    vibeQueue: [],
    vibeIdx: 0,
    running: false,
    gameOver: false,
    lastTime: 0,
    animId: 0,
  });

  const nextVibe = useCallback((): VibeOption => {
    const gs = gameState.current;
    const v = gs.vibeQueue[gs.vibeIdx % gs.vibeQueue.length];
    gs.vibeIdx++;
    return v;
  }, []);

  const getBlockColor = useCallback((idx: number) => {
    return BLOCK_COLORS[idx % BLOCK_COLORS.length];
  }, []);

  // Compute the base Y of the tower top (where next block should land)
  const getStackTopY = useCallback(() => {
    const gs = gameState.current;
    return CANVAS_H - gs.stack.length * BLOCK_H;
  }, []);

  const spawnBlock = useCallback(() => {
    const gs = gameState.current;
    const width = gs.stack.length === 0
      ? INITIAL_BLOCK_W
      : gs.stack[gs.stack.length - 1].width;
    const vibe = nextVibe();
    const color = getBlockColor(gs.stack.length);

    // Block starts attached to the hook — position is computed from pendulum in the render loop
    gs.falling = {
      x: 0,
      y: 0,
      width,
      vy: 0,
      color,
      label: vibe.label,
      rotation: 0,
      rotationSpeed: 0,
      collision: null,
      settled: false,
    };
    // Store vibe on the falling block for later
    (gs.falling as any)._vibe = vibe;
  }, [nextVibe, getBlockColor]);

  const finishGame = useCallback((stack: StackedBlock[]) => {
    const gs = gameState.current;
    gs.gameOver = true;
    const vibes = stack.map((b) => b.vibe.id);
    const stacked = stack.length;
    const discount = Math.max(1, Math.min(10, stacked + 1));
    const scorePercent = Math.round((stacked / MAX_STACK) * 100);

    addHardGameResult({
      gameId: 'stackTower',
      signalKey: 'vibe_chips',
      signalValue: vibes,
      scorePercent,
      discount,
    });

    setCapturedVibes(vibes);
    setFinalDiscount(discount);
    setTimeout(() => {
      gs.running = false;
      setPhase('result');
    }, 600);
  }, [addHardGameResult]);

  // --- CANVAS RENDER LOOP ---
  const startGameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gs = gameState.current;
    gs.running = true;
    gs.gameOver = false;
    gs.lastTime = performance.now();

    function drawRoundedRect(
      c: CanvasRenderingContext2D,
      x: number, y: number, w: number, h: number,
      r: number
    ) {
      r = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.arcTo(x + w, y, x + w, y + r, r);
      c.lineTo(x + w, y + h - r);
      c.arcTo(x + w, y + h, x + w - r, y + h, r);
      c.lineTo(x + r, y + h);
      c.arcTo(x, y + h, x, y + h - r, r);
      c.lineTo(x, y + r);
      c.arcTo(x, y, x + r, y, r);
      c.closePath();
    }

    function loop(now: number) {
      if (!gs.running) return;
      const dt = Math.min(now - gs.lastTime, 32); // cap to avoid spiral
      gs.lastTime = now;

      // --- UPDATE ---

      // Pendulum swing
      gs.pendulumAngle += gs.pendulumDir * PENDULUM_SPEED * dt;
      if (gs.pendulumAngle > PENDULUM_MAX_ANGLE) {
        gs.pendulumAngle = PENDULUM_MAX_ANGLE;
        gs.pendulumDir = -1;
      } else if (gs.pendulumAngle < -PENDULUM_MAX_ANGLE) {
        gs.pendulumAngle = -PENDULUM_MAX_ANGLE;
        gs.pendulumDir = 1;
      }

      // Hook position
      const hookX = ROPE_ANCHOR_X + Math.sin(gs.pendulumAngle) * PENDULUM_LENGTH;
      const hookY = HOOK_Y + PENDULUM_LENGTH * (1 - Math.cos(gs.pendulumAngle));

      // Update falling block
      const fb = gs.falling;
      if (fb && !fb.settled) {
        if (fb.collision === null) {
          // Still attached to hook — update position from pendulum
          fb.x = hookX - fb.width / 2;
          fb.y = hookY + 8;
        } else {
          // Falling with gravity
          fb.vy += GRAVITY * dt;
          fb.y += fb.vy * dt;
          fb.rotation += fb.rotationSpeed * dt;

          const targetY = getStackTopY() - BLOCK_H;

          if (fb.collision === 'miss' || fb.collision === 'rotate-left' || fb.collision === 'rotate-right') {
            // Fall off screen
            if (fb.y > CANVAS_H + 50) {
              fb.settled = true;
              if (!gs.gameOver) {
                audio.miss();
                haptics.miss();
                finishGame(gs.stack);
              }
            }
          } else {
            // ok or perfect — settle onto stack
            if (fb.y >= targetY) {
              fb.y = targetY;
              fb.settled = true;
              fb.vy = 0;
              fb.rotation = 0;

              // Determine overlap and trim
              const prev = gs.stack[gs.stack.length - 1];
              let landX = fb.x;
              let landW = fb.width;

              if (prev) {
                const overlapLeft = Math.max(fb.x, prev.x);
                const overlapRight = Math.min(fb.x + fb.width, prev.x + prev.width);
                const overlap = overlapRight - overlapLeft;

                if (overlap <= 0) {
                  // Shouldn't happen since collision was ok/perfect, but safety
                  fb.settled = true;
                  if (!gs.gameOver) finishGame(gs.stack);
                  gs.animId = requestAnimationFrame(loop);
                  return;
                }

                // Spawn debris for trimmed portion
                if (fb.x < prev.x) {
                  const trimW = prev.x - fb.x;
                  gs.debris.push({
                    x: fb.x, y: fb.y, width: trimW, height: BLOCK_H,
                    vy: 0.5, rotation: 0, rotationSpeed: -0.003, color: fb.color,
                  });
                }
                if (fb.x + fb.width > prev.x + prev.width) {
                  const trimW = (fb.x + fb.width) - (prev.x + prev.width);
                  gs.debris.push({
                    x: prev.x + prev.width, y: fb.y, width: trimW, height: BLOCK_H,
                    vy: 0.5, rotation: 0, rotationSpeed: 0.003, color: fb.color,
                  });
                }

                landX = overlapLeft;
                landW = overlap;
              }

              const vibe = (fb as any)._vibe as VibeOption;
              gs.stack.push({ x: landX, width: landW, vibe, color: fb.color });
              setStackCount(gs.stack.length);

              if (fb.collision === 'perfect') {
                audio.perfect();
                haptics.perfect();
                setLastLanding('Perfect!');
              } else {
                audio.thud();
                haptics.land();
                setLastLanding('OK');
              }

              if (gs.stack.length >= MAX_STACK) {
                audio.bullseye();
                haptics.jackpot();
                finishGame(gs.stack);
              } else {
                // Spawn next
                setTimeout(() => {
                  if (gs.running && !gs.gameOver) spawnBlock();
                }, 300);
              }
            }
          }
        }
      }

      // Update debris
      for (const d of gs.debris) {
        d.vy += GRAVITY * dt;
        d.y += d.vy * dt;
        d.rotation += d.rotationSpeed * dt;
      }
      gs.debris = gs.debris.filter((d) => d.y < CANVAS_H + 100);

      // --- DRAW ---
      const c = ctx!;
      const dpr = window.devicePixelRatio || 1;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background gradient
      const grad = c.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#FFF8F0');
      grad.addColorStop(1, '#FFFFFF');
      c.fillStyle = grad;
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Ground line
      c.strokeStyle = '#E0D5C8';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, CANVAS_H - 1);
      c.lineTo(CANVAS_W, CANVAS_H - 1);
      c.stroke();

      // Rope from anchor to hook
      c.strokeStyle = '#A8896C';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(ROPE_ANCHOR_X, 4);
      c.lineTo(hookX, hookY);
      c.stroke();

      // Hook (small circle + triangle)
      c.fillStyle = '#8B5E3C';
      c.beginPath();
      c.arc(hookX, hookY, 5, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(hookX - 4, hookY + 5);
      c.lineTo(hookX + 4, hookY + 5);
      c.lineTo(hookX, hookY + 10);
      c.closePath();
      c.fill();

      // Rope from hook to block (if attached)
      if (fb && fb.collision === null) {
        c.strokeStyle = '#A8896C';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(hookX, hookY + 10);
        c.lineTo(fb.x + fb.width / 2, fb.y);
        c.stroke();
      }

      // Draw stacked blocks
      for (const block of gs.stack) {
        const by = CANVAS_H - (gs.stack.indexOf(block) + 1) * BLOCK_H;
        c.fillStyle = block.color;
        drawRoundedRect(c, block.x, by, block.width, BLOCK_H - 2, 4);
        c.fill();

        // Shadow
        c.fillStyle = 'rgba(0,0,0,0.08)';
        drawRoundedRect(c, block.x, by + BLOCK_H - 6, block.width, 4, 2);
        c.fill();

        // Label
        c.fillStyle = '#FFFBF5';
        c.font = `600 ${block.width > 80 ? 11 : 9}px Karla, system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(block.vibe.label, block.x + block.width / 2, by + BLOCK_H / 2 - 1);
      }

      // Draw falling block
      if (fb && !fb.settled) {
        c.save();
        const cx = fb.x + fb.width / 2;
        const cy = fb.y + BLOCK_H / 2;
        c.translate(cx, cy);
        c.rotate(fb.rotation);
        c.fillStyle = fb.color;
        drawRoundedRect(c, -fb.width / 2, -BLOCK_H / 2, fb.width, BLOCK_H - 2, 4);
        c.fill();

        // Drop shadow
        c.shadowColor = 'rgba(198,124,78,0.3)';
        c.shadowBlur = 12;
        c.shadowOffsetY = 4;
        c.fillStyle = fb.color;
        drawRoundedRect(c, -fb.width / 2, -BLOCK_H / 2, fb.width, BLOCK_H - 2, 4);
        c.fill();
        c.shadowColor = 'transparent';
        c.shadowBlur = 0;
        c.shadowOffsetY = 0;

        // Label
        c.fillStyle = '#FFFBF5';
        c.font = `600 ${fb.width > 80 ? 11 : 9}px Karla, system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(fb.label, 0, -1);
        c.restore();
      }

      // Draw debris
      for (const d of gs.debris) {
        c.save();
        c.translate(d.x + d.width / 2, d.y + d.height / 2);
        c.rotate(d.rotation);
        c.globalAlpha = Math.max(0, 1 - (d.y - CANVAS_H) / 100);
        c.fillStyle = d.color;
        drawRoundedRect(c, -d.width / 2, -d.height / 2, d.width, d.height - 2, 3);
        c.fill();
        c.globalAlpha = 1;
        c.restore();
      }

      // Anchor point at top
      c.fillStyle = '#8B5E3C';
      c.beginPath();
      c.arc(ROPE_ANCHOR_X, 4, 4, 0, Math.PI * 2);
      c.fill();

      gs.animId = requestAnimationFrame(loop);
    }

    gs.animId = requestAnimationFrame(loop);
  }, [getStackTopY, spawnBlock, finishGame]);

  // --- TAP TO DROP ---
  const handleTap = useCallback(() => {
    const gs = gameState.current;
    if (!gs.running || gs.gameOver || !gs.falling) return;
    const fb = gs.falling;
    if (fb.collision !== null || fb.settled) return;

    // Detach from hook — determine collision type
    const prev = gs.stack[gs.stack.length - 1];

    if (!prev) {
      // First block — always lands perfectly
      fb.collision = 'perfect';
      fb.vy = 0;
      audio.tap();
      haptics.press();
      return;
    }

    // Check overlap
    const overlapLeft = Math.max(fb.x, prev.x);
    const overlapRight = Math.min(fb.x + fb.width, prev.x + prev.width);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 0) {
      // Complete miss
      fb.collision = 'miss';
      fb.vy = 0.2;
      fb.rotationSpeed = (fb.x + fb.width / 2 < prev.x + prev.width / 2) ? -0.008 : 0.008;
      return;
    }

    const offset = Math.abs((fb.x + fb.width / 2) - (prev.x + prev.width / 2));

    if (offset <= PERFECT_THRESHOLD) {
      fb.collision = 'perfect';
      fb.vy = 0;
    } else {
      // Check if the overhang is extreme enough to rotate off
      const overhangRatio = 1 - (overlap / fb.width);
      if (overhangRatio > 0.65) {
        // Rotate off — too much overhang
        const goesLeft = fb.x < prev.x;
        fb.collision = goesLeft ? 'rotate-left' : 'rotate-right';
        fb.vy = 0.1;
        fb.rotationSpeed = goesLeft ? -0.006 : 0.006;
      } else {
        fb.collision = 'ok';
        fb.vy = 0;
      }
    }
  }, []);

  // --- START / CONTINUE ---
  function startGame() {
    audio.tap();
    haptics.press();

    const gs = gameState.current;
    gs.stack = [];
    gs.falling = null;
    gs.debris = [];
    gs.pendulumAngle = 0;
    gs.pendulumDir = 1;
    gs.vibeQueue = shuffle(VIBE_POOL);
    gs.vibeIdx = 0;
    gs.gameOver = false;

    setStackCount(0);
    setLastLanding('');
    setPhase('playing');
  }

  function continueToNext() {
    audio.tap();
    haptics.press();
    go('sparkSlice');
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gameState.current.running = false;
      cancelAnimationFrame(gameState.current.animId);
    };
  }, []);

  // Setup canvas DPR + start game loop when canvas mounts
  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (!node || phase !== 'playing') return;
    const dpr = window.devicePixelRatio || 1;
    node.width = CANVAS_W * dpr;
    node.height = CANVAS_H * dpr;
    node.style.width = `${CANVAS_W}px`;
    node.style.height = `${CANVAS_H}px`;
    // Canvas is now in DOM — safe to start loop + spawn
    startGameLoop();
    spawnBlock();
  }, [phase, startGameLoop, spawnBlock]);

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
              Round 2 — Stack
            </motion.p>
            <motion.h2
              className="text-[26px] font-bold font-display text-ink mb-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle, delay: 0.05 }}
            >
              What was the vibe?
            </motion.h2>
            <motion.p
              className="text-ink-muted text-[14px] mb-8 max-w-[280px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              A swinging hook drops blocks. Time your tap to stack them — more blocks = bigger discount.
            </motion.p>

            <motion.div
              className="rounded-2xl bg-white/70 border border-ink-ghost/10 p-5 mb-8 w-full max-w-[300px]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-[13px] text-ink-muted mb-2 font-semibold">How to stack</p>
              <ol className="text-[12px] text-ink-soft space-y-1.5 text-left">
                <li>1. Watch the hook swing</li>
                <li>2. Tap to release the block</li>
                <li>3. Land it on the tower — misalignment trims the block</li>
                <li>4. Too far off? It rotates and falls!</li>
              </ol>
            </motion.div>

            <motion.button
              className="w-full max-w-[300px] rounded-2xl bg-primary px-8 py-[18px] text-[17px] font-semibold text-white shadow-card cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={startGame}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Start stacking
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
            <div className="flex items-center gap-3 mb-1">
              <p className="text-[14px] font-semibold text-ink-soft">
                Stacked: {stackCount} / {MAX_STACK}
              </p>
              {lastLanding && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  lastLanding === 'Perfect!' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {lastLanding}
                </span>
              )}
            </div>
            <p className="text-[12px] text-ink-muted mb-3">
              Tap when the block is aligned
            </p>

            <button
              type="button"
              onClick={handleTap}
              className="rounded-2xl bg-white shadow-card-lg p-2 cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              <canvas
                ref={canvasCallbackRef}
                style={{ width: CANVAS_W, height: CANVAS_H, borderRadius: 12 }}
              />
            </button>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            className="flex-1 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.gentle}
          >
            <motion.p
              className="text-[12px] uppercase tracking-widest text-ink-quiet font-semibold mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              The vibe was
            </motion.p>
            <motion.h2
              className="text-[24px] font-bold font-display text-ink mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {capturedVibes.length > 0 ? `${capturedVibes.length} vibes captured` : 'No vibe locked'}
            </motion.h2>

            <motion.div
              className="flex flex-wrap justify-center gap-2 max-w-[300px] mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {capturedVibes.length > 0 ? (
                capturedVibes.map((id, i) => {
                  const v = VIBE_POOL.find((x) => x.id === id);
                  return (
                    <span
                      key={`${id}-${i}`}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-white"
                      style={{ backgroundColor: BLOCK_COLORS[i % BLOCK_COLORS.length] }}
                    >
                      {v?.label || id}
                    </span>
                  );
                })
              ) : (
                <span className="text-[13px] text-ink-muted">Try again next round</span>
              )}
            </motion.div>

            <motion.div
              className="rounded-2xl bg-primary px-6 py-4 mb-6 shadow-elevated"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.gentle, delay: 0.4 }}
            >
              <p className="text-white/80 text-[12px] uppercase tracking-wider mb-1">Earned</p>
              <p className="text-white text-[36px] font-bold font-display leading-none">
                +{finalDiscount}%
              </p>
            </motion.div>

            <motion.button
              className="w-full max-w-[300px] rounded-2xl bg-primary px-8 py-[18px] text-[17px] font-semibold text-white shadow-card cursor-pointer"
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
