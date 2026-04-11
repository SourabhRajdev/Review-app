// SLINGSHOT GAME SCREEN
// Pull slingshot to aim at YES/NO jars, smash to answer.
// Phrases spill out — user taps one to include in review.
// After all questions → generating screen.

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import Slingshot from '@/components/Slingshot';
import { spring } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

interface VerdictQuestion {
  id: string;
  text: string;
  yesPhrases: string[];
  noPhrases: string[];
}

const QUESTIONS: VerdictQuestion[] = [
  {
    id: 'return',
    text: 'Coming back?',
    yesPhrases: ['My new regular', 'Definitely returning', 'See you soon', 'Already planning next visit'],
    noPhrases: ['Maybe someday', 'Not sure yet', 'Once was enough', 'Exploring other spots'],
  },
  {
    id: 'compare',
    text: 'How does it compare?',
    yesPhrases: ['Best in the area', 'Better than my usual', 'My new favorite', 'Nothing like it nearby'],
    noPhrases: ['My usual spot wins', 'About average', 'Nothing special', 'Has potential though'],
  },
  {
    id: 'occasion',
    text: 'What brought you in?',
    yesPhrases: ['Morning ritual stop', 'Been wanting to try', 'Friend recommended it', 'Planned visit'],
    noPhrases: ['Just walked past', 'Killing time', 'Random discovery', 'Curiosity got me'],
  },
];

interface SpilledPhrase {
  text: string;
  id: string;
  x: number;
  y: number;
  rotation: number;
  delay: number;
}

export default function SlingshotGameScreen() {
  const go = useNavigation((s) => s.go);
  const addSlingshotAnswer = useGameStore((s) => s.addSlingshotAnswer);
  const mode = useGameStore((s) => s.mode);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Slingshot physics
  const [pullX, setPullX] = useState(0);
  const [pullY, setPullY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fired, setFired] = useState(false);

  // Projectile
  const [projectilePos, setProjectilePos] = useState<{ x: number; y: number } | null>(null);
  const [projectileFlying, setProjectileFlying] = useState(false);

  // Jar state
  const [brokenJar, setBrokenJar] = useState<'yes' | 'no' | null>(null);
  const [spilled, setSpilled] = useState<SpilledPhrase[]>([]);
  const [shaking, setShaking] = useState(false);
  const [waitingForPhrase, setWaitingForPhrase] = useState(false);
  const [pickedPhrase, setPickedPhrase] = useState<string | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];

  function handlePointerDown(e: React.PointerEvent) {
    if (brokenJar || projectileFlying || waitingForPhrase) return;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relY = (e.clientY - rect.top) / rect.height;
    const relX = (e.clientX - rect.left) / rect.width;
    if (relY < 0.45 || relX < 0.2 || relX > 0.8) return;

    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !dragStart.current || brokenJar || projectileFlying || waitingForPhrase) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const maxDrag = 120;
    setPullX(Math.max(-1, Math.min(1, -dx / maxDrag)));
    setPullY(Math.max(0, Math.min(1, dy / maxDrag)));
  }

  function handlePointerUp() {
    if (!isDragging || brokenJar || projectileFlying || waitingForPhrase) return;
    setIsDragging(false);
    dragStart.current = null;

    if (pullY < 0.15) {
      setPullX(0);
      setPullY(0);
      return;
    }

    fireProjectile(pullX >= 0 ? 'yes' : 'no');
  }

  function fireProjectile(target: 'yes' | 'no') {
    setFired(true);
    setProjectileFlying(true);
    setProjectilePos({ x: target === 'no' ? 15 : 85, y: 28 });
    audio.tap();
    haptics.press();
    setPullX(0);
    setPullY(0);

    setTimeout(() => {
      smashJar(target);
      setProjectileFlying(false);
      setProjectilePos(null);
    }, 350);
  }

  function handleJarTap(type: 'yes' | 'no') {
    if (brokenJar || projectileFlying || waitingForPhrase) return;
    setPullX(type === 'yes' ? 0.5 : -0.5);
    setPullY(0.6);
    setIsDragging(false);
    setTimeout(() => fireProjectile(type), 200);
  }

  function smashJar(type: 'yes' | 'no') {
    setBrokenJar(type);
    setShaking(true);
    haptics.impact();
    audio.bullseye();

    setTimeout(() => setShaking(false), 500);

    const phrases = type === 'yes' ? currentQuestion.yesPhrases : currentQuestion.noPhrases;
    setSpilled(
      phrases.map((text, i) => ({
        text,
        id: `phrase-${currentIndex}-${i}`,
        x: (type === 'no' ? 5 : 50) + Math.random() * 25,
        y: 50 + i * 11,
        rotation: (Math.random() - 0.5) * 20,
        delay: 0.15 + i * 0.12,
      }))
    );
    setWaitingForPhrase(true);
    setPickedPhrase(null);
  }

  function handlePhrasePick(phrase: string) {
    if (pickedPhrase) return;
    setPickedPhrase(phrase);
    audio.tick();
    haptics.tick();

    addSlingshotAnswer({
      questionId: currentQuestion.id,
      question: currentQuestion.text,
      positive: brokenJar === 'yes',
      phrase,
    });

    setTimeout(() => {
      if (currentIndex + 1 >= QUESTIONS.length) {
        go(mode === 'easy' ? 'generating' : 'basketball');
      } else {
        resetForNext();
      }
    }, 800);
  }

  function resetForNext() {
    setBrokenJar(null);
    setSpilled([]);
    setFired(false);
    setProjectileFlying(false);
    setProjectilePos(null);
    setWaitingForPhrase(false);
    setPickedPhrase(null);
    setPullX(0);
    setPullY(0);
    setCurrentIndex((i) => i + 1);
  }

  return (
    <ScreenShell hideProgress hideBack>
      <motion.div
        className="flex-1 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-3">
            <span>Round 6</span>
            <span className="text-primary/50">—</span>
            <span>Final Verdict</span>
          </div>
          <h2 className="text-[24px] font-bold text-ink">
            {currentQuestion.text}
          </h2>
          <p className="text-ink/60 text-[13px] mt-1">
            {waitingForPhrase
              ? 'Tap a phrase to add to your review!'
              : isDragging
                ? `Pull back & release! ${pullX > 0.2 ? 'YES' : pullX < -0.2 ? 'NO' : 'Aim...'}`
                : 'Pull the slingshot back or tap a jar'}
          </p>
        </motion.div>

        {/* Game arena */}
        <motion.div
          ref={arenaRef}
          animate={shaking ? { x: [0, -6, 6, -4, 4, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="relative h-[340px] rounded-2xl bg-gradient-to-b from-primary/5 via-surface to-primary/5 border border-ink/5 overflow-hidden touch-none select-none shadow-card"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (isDragging) {
              setIsDragging(false);
              setPullX(0);
              setPullY(0);
              dragStart.current = null;
            }
          }}
        >
          {/* Shelf line */}
          <div className="absolute bottom-[42%] left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-ink/10 to-transparent rounded-full" />

          {/* NO Jar - Left */}
          <div className="absolute left-[6%] top-[16%]">
            <AnimatePresence mode="wait">
              {brokenJar !== 'no' ? (
                <motion.div
                  key="jar-no"
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => handleJarTap('no')}
                  whileTap={{ scale: 0.94 }}
                  exit={{ scale: [1, 1.3, 0], opacity: [1, 1, 0], rotate: [0, -15, -30], transition: { duration: 0.4 } }}
                >
                  <motion.span
                    className="text-7xl drop-shadow-lg"
                    style={{ filter: 'grayscale(30%)' }}
                    animate={isDragging && pullX < -0.2 ? { rotate: [-3, 3, -3], scale: [1, 1.08, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                  >
                    🏺
                  </motion.span>
                  <span className="mt-1 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-bold tracking-wider">
                    NO
                  </span>
                </motion.div>
              ) : (
                <motion.div key="jar-no-broken" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 0.6 }}
                  className="flex flex-col items-center">
                  <span className="text-4xl">💥</span>
                  <span className="text-xs text-ink/60 mt-1">Smashed!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* YES Jar - Right */}
          <div className="absolute right-[6%] top-[16%]">
            <AnimatePresence mode="wait">
              {brokenJar !== 'yes' ? (
                <motion.div
                  key="jar-yes"
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => handleJarTap('yes')}
                  whileTap={{ scale: 0.94 }}
                  exit={{ scale: [1, 1.3, 0], opacity: [1, 1, 0], rotate: [0, 15, 30], transition: { duration: 0.4 } }}
                >
                  <motion.span
                    className="text-7xl drop-shadow-lg"
                    animate={isDragging && pullX > 0.2 ? { rotate: [-3, 3, -3], scale: [1, 1.08, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                  >
                    🏺
                  </motion.span>
                  <span className="mt-1 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold tracking-wider">
                    YES
                  </span>
                </motion.div>
              ) : (
                <motion.div key="jar-yes-broken" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 0.6 }}
                  className="flex flex-col items-center">
                  <span className="text-4xl">💥</span>
                  <span className="text-xs text-ink/60 mt-1">Smashed!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slingshot */}
          <div className="absolute left-1/2 bottom-[6%] -translate-x-1/2 z-10">
            <Slingshot pullX={pullX} pullY={pullY} isDragging={isDragging} fired={fired} />
            {!isDragging && !brokenJar && !projectileFlying && (
              <motion.p
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-ink/60"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                pull back to shoot
              </motion.p>
            )}
          </div>

          {/* Flying projectile */}
          <AnimatePresence>
            {projectileFlying && projectilePos && (
              <motion.div
                key="projectile"
                className="absolute z-20 pointer-events-none"
                style={{ left: '50%', bottom: '18%' }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ left: `${projectilePos.x}%`, top: `${projectilePos.y}%`, bottom: 'auto', scale: 0.6, opacity: 0.8 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0.3, 1] }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" fill="#808080" stroke="#333" strokeWidth="0.5" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Impact flash */}
          <AnimatePresence>
            {shaking && (
              <motion.div key="flash" initial={{ opacity: 0.6 }} animate={{ opacity: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-white/30 pointer-events-none z-20 rounded-2xl" />
            )}
          </AnimatePresence>

          {/* Shards */}
          <AnimatePresence>
            {brokenJar && Array.from({ length: 8 }).map((_, i) => {
              const originX = brokenJar === 'no' ? 18 : 82;
              return (
                <motion.div key={`shard-${i}`} className="absolute text-sm pointer-events-none"
                  style={{ left: `${originX}%`, top: '25%' }}
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 160,
                    y: [0, -30 - Math.random() * 40, 80 + Math.random() * 60],
                    rotate: Math.random() * 540 - 270,
                    opacity: [1, 1, 0],
                    scale: [1, 1.2, 0.3],
                  }}
                  transition={{ duration: 1 + Math.random() * 0.5, ease: 'easeOut' }}
                >
                  {['✨', '💫', '⭐', '🪨'][i % 4]}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Spilled phrases */}
          <AnimatePresence>
            {spilled.map((phrase) => (
              <motion.button
                key={phrase.id}
                className={`absolute z-30 ${waitingForPhrase && !pickedPhrase ? 'cursor-pointer' : 'pointer-events-none'}`}
                style={{ left: `${phrase.x}%`, top: `${phrase.y}%` }}
                initial={{ scale: 0, opacity: 0, y: -40 }}
                animate={{
                  scale: pickedPhrase === phrase.text ? 1.2 : 1,
                  opacity: pickedPhrase && pickedPhrase !== phrase.text ? 0.3 : 1,
                  y: 0,
                  rotate: phrase.rotation,
                }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                transition={{ delay: pickedPhrase ? 0 : phrase.delay, type: 'spring', stiffness: 250, damping: 18 }}
                onClick={(e) => { e.stopPropagation(); handlePhrasePick(phrase.text); }}
              >
                <motion.div
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-card border whitespace-nowrap transition-colors ${
                    pickedPhrase === phrase.text
                      ? 'bg-primary text-white border-primary ring-2 ring-primary/30'
                      : brokenJar === 'yes'
                        ? 'bg-success/10 border-success text-success hover:bg-success/20'
                        : 'bg-error/10 border-error text-error hover:bg-error/20'
                  }`}
                  animate={waitingForPhrase && !pickedPhrase ? { y: [0, -3, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5, delay: phrase.delay }}
                >
                  {pickedPhrase === phrase.text && '✓ '}
                  {phrase.text}
                </motion.div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {QUESTIONS.map((q, i) => (
            <div
              key={q.id}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i < currentIndex
                  ? 'bg-primary w-2.5'
                  : i === currentIndex
                    ? 'bg-primary w-6'
                    : 'bg-surface w-2.5'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </ScreenShell>
  );
}
