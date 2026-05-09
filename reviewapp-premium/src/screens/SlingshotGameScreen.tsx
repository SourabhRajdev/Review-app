import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useLuckStore } from '@/architecture/luck/store';
import GameScene from '@/components/slingshot3d/GameScene';
import { spring } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// ══════════════════════════════════════════════════════════════════════════════
// 🌬️  WIND SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

interface Wind {
  force: number;      // -1 to 1 (negative = left, positive = right)
  direction: 'left' | 'right' | 'calm';
  strength: 'calm' | 'light' | 'medium' | 'strong';
}

function generateWind(): Wind {
  const roll = Math.random();
  let force: number;
  let strength: Wind['strength'];
  
  if (roll < 0.15) {
    force = (Math.random() - 0.5) * 0.1;
    strength = 'calm';
  } else if (roll < 0.50) {
    force = (Math.random() - 0.5) * 0.4;
    strength = 'light';
  } else if (roll < 0.85) {
    force = (Math.random() - 0.5) * 0.7;
    strength = 'medium';
  } else {
    force = (Math.random() - 0.5) * 1.0;
    strength = 'strong';
  }
  
  const direction = force < -0.05 ? 'left' : force > 0.05 ? 'right' : 'calm';
  return { force, direction, strength };
}

const ROUNDS = [
  {
    id: 'return',
    question: 'Would you come back?',
    answers: ['Definitely returning!', 'My new regular', 'Maybe someday', 'Once was enough'],
  },
  {
    id: 'recommend',
    question: 'Would you recommend it?',
    answers: ['Highly recommend!', 'Must try!', 'Not for everyone', 'Would skip'],
  },
  {
    id: 'price',
    question: 'Was it worth the price?',
    answers: ['Worth every penny', 'Great value!', 'A bit pricey', 'Overpriced'],
  },
];

export default function SlingshotGameScreen() {
  const go = useNavigation((s) => s.go);
  const addSlingshotAnswer = useGameStore((s) => s.addSlingshotAnswer);
  const setSlingshotLuck = useLuckStore((s) => s.setSlingshotLuck);

  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<'aiming' | 'hit' | 'miss' | 'complete'>('aiming');
  const [retryCount, setRetryCount] = useState(0);
  const [wind, setWind] = useState<Wind>(generateWind());
  const [hitAnswerIdx, setHitAnswerIdx] = useState<number | null>(null);
  const [pickedAnswer, setPickedAnswer] = useState<string | null>(null);

  const windTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentRound = ROUNDS[roundIdx];

  useEffect(() => {
    windTimerRef.current = setInterval(() => {
      if (phase === 'aiming') {
        setWind(generateWind());
        haptics.bump();
      }
    }, 4000);
    return () => { if (windTimerRef.current) clearInterval(windTimerRef.current); };
  }, [phase]);

  function smashJar(answerIdx: number) {
    const answer = currentRound.answers[answerIdx];
    setPhase('hit');
    setHitAnswerIdx(answerIdx);
    haptics.jarCrack();
    audio.bullseye();
    setTimeout(() => handleAnswerPick(answer, answerIdx), 1200);
  }

  function handleMiss() {
    setPhase('miss');
    audio.tap();
    haptics.slingshotMiss();
  }

  function handleAnswerPick(answer: string, answerIdx: number) {
    if (pickedAnswer) return;
    setPickedAnswer(answer);
    audio.tick();
    haptics.tick();

    addSlingshotAnswer({
      questionId: currentRound.id,
      question: currentRound.question,
      positive: answerIdx < 2,
      phrase: answer,
    });

    setTimeout(() => advanceRound(), 800);
  }

  function advanceRound() {
    if (roundIdx < ROUNDS.length - 1) {
      setRoundIdx(roundIdx + 1);
      setRetryCount(0);
      resetForNextRound();
    } else {
      finishGame();
    }
  }

  function resetForNextRound() {
    setPhase('aiming');
    setHitAnswerIdx(null);
    setPickedAnswer(null);
    setWind(generateWind());
  }

  function finishGame() {
    setPhase('complete');
    if (windTimerRef.current) clearInterval(windTimerRef.current);
    const answers = useGameStore.getState().slingshotAnswers;
    const positiveRatio = answers.length > 0
      ? answers.filter((a) => a.positive).length / answers.length
      : 0;
    setSlingshotLuck(positiveRatio);
  }

  function handleMissRetry() {
    if (retryCount >= 1) go('shellGame');
    else {
      setRetryCount(retryCount + 1);
      resetForNextRound();
    }
  }

  if (phase === 'complete') {
    return (
      <ScreenShell hideProgress hideBack>
        <motion.div
          className="flex-1 flex flex-col justify-center items-center text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.gentle}
          onAnimationComplete={() => { setTimeout(() => go('shellGame'), 1800); }}
        >
          <motion.div className="text-7xl mb-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring.snappy, delay: 0.15 }}>🏆</motion.div>
          <h2 className="text-display text-ink mb-2">Perfect Score!</h2>
          <p className="text-body text-ink-secondary mb-6">All rounds completed · Generating your reward</p>
        </motion.div>
      </ScreenShell>
    );
  }

  if (phase === 'miss') {
    const isLastChance = retryCount >= 1;
    return (
      <ScreenShell hideProgress hideBack>
        <motion.div className="flex-1 flex flex-col justify-center items-center text-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="text-7xl mb-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.snappy}>{isLastChance ? '😵' : '💨'}</motion.div>
          <h2 className="text-display text-ink mb-2">{isLastChance ? 'Out of retries!' : 'Missed!'}</h2>
          <motion.button
            onClick={handleMissRetry}
            className="px-6 py-3 rounded-full font-semibold text-label text-white"
            style={{ background: 'linear-gradient(135deg, #E8B896, #C67C4E)' }}
            whileTap={{ scale: 0.95 }}
          >
            {isLastChance ? 'Continue' : 'Retry (1 chance)'}
          </motion.button>
        </motion.div>
      </ScreenShell>
    );
  }

  const turnLabel = pickedAnswer ? 'Next round...' : hitAnswerIdx !== null ? 'Impact!' : 'Aim with the 3D Slingshot';

  return (
    <ScreenShell hideProgress hideBack>
      <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 text-primary px-4 py-1.5 rounded-full text-label font-semibold mb-3" style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}>
            <span>Round {roundIdx + 1} of {ROUNDS.length}</span>
            <span className="text-primary/50">—</span>
            <span>3D Slingshot</span>
          </div>
          <h3 className="text-heading text-ink mb-2">{currentRound.question}</h3>
          <p className="text-ink-secondary text-label">{turnLabel}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-micro font-semibold" style={{ background: 'rgba(156,163,175,0.1)', color: '#6B7280', border: '1px solid rgba(156,163,175,0.2)' }}>
            <span>Wind: {wind.strength} {wind.direction === 'left' ? '←' : '→'}</span>
          </div>
        </div>

        <div className="relative h-[440px] rounded-2xl overflow-hidden border border-black/5 shadow-xl flex-1 bg-[#FAF9F7]">
          <GameScene 
            roundAnswers={currentRound.answers}
            onHit={smashJar}
            onMiss={handleMiss}
            windForce={wind.force}
          />
        </div>
      </motion.div>
    </ScreenShell>
  );
}
