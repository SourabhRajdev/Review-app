import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import SwipeCard from '@/components/SwipeCard';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const QUESTIONS = [
  { id: 'visit_type', text: 'Have you been here before?', icon: '🔄', rightLabel: 'Yes!', leftLabel: 'First time' },
  { id: 'experience', text: 'Smooth experience overall?', icon: '✨', rightLabel: 'Smooth', leftLabel: 'Rough' },
  { id: 'staff', text: 'Were the staff great?', icon: '👨‍🍳', rightLabel: 'Great', leftLabel: 'Meh' },
  { id: 'speed', text: 'Was the service quick?', icon: '⚡', rightLabel: 'Quick', leftLabel: 'Slow' },
];

export default function SwipeGameScreen() {
  const go = useNavigation((s) => s.go);
  const addSwipeAnswer = useGameStore((s) => s.addSwipeAnswer);
  const mode = useGameStore((s) => s.mode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const current = QUESTIONS[currentIndex];
  const remaining = QUESTIONS.length - currentIndex;

  function handleSwipe(positive: boolean) {
    if (isTransitioning) return;
    setIsTransitioning(true);
    addSwipeAnswer({ questionId: current.id, question: current.text, positive });
    audio.tick();
    haptics.tick();
    setTimeout(() => {
      if (currentIndex + 1 >= QUESTIONS.length) {
        go(mode === 'easy' ? 'conveyorBelt' : 'generating');
      } else {
        setCurrentIndex((i) => i + 1);
      }
      setIsTransitioning(false);
    }, 300);
  }

  return (
    <ScreenShell hideProgress hideBack>
      <motion.div className="flex-1 flex flex-col justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center mb-6">
          <span className="inline-block text-caption font-semibold text-primary bg-primary-muted px-3 py-1 rounded-chip mb-3">
            Round 1 — Swipe to Rate
          </span>
          <h2 className="text-display text-ink">Quick impressions</h2>
          <p className="text-body-sm text-ink-secondary mt-1">Swipe right or left · {remaining} left</p>
        </div>

        <div className="relative flex items-center justify-center" style={{ minHeight: 300 }}>
          {currentIndex + 1 < QUESTIONS.length && (
            <div className="absolute bg-surface border border-ink-ghost/10 p-6 rounded-card shadow-card" style={{ width: '90%', opacity: 0.4, transform: 'translateY(6px) scale(0.95)' }} />
          )}
          <AnimatePresence mode="wait">
            {current && !isTransitioning && (
              <SwipeCard key={current.id} onSwipeLeft={() => handleSwipe(false)} onSwipeRight={() => handleSwipe(true)} leftLabel={current.leftLabel} rightLabel={current.rightLabel}>
                <div className="bg-surface border border-ink-ghost/20 rounded-card shadow-card p-8 text-center w-full max-w-sm mx-auto">
                  <span className="text-5xl block mb-4">{current.icon}</span>
                  <h3 className="text-heading text-ink mb-2">{current.text}</h3>
                  <p className="text-caption text-ink-tertiary">Swipe right for Yes, left for No</p>
                  <div className="flex items-center justify-center gap-1.5 mt-6">
                    {QUESTIONS.map((q, i) => (
                      <div key={q.id} className={`h-2 rounded-full transition-all duration-300 ${i < currentIndex ? 'bg-primary w-2' : i === currentIndex ? 'bg-primary w-5' : 'bg-surface-secondary w-2'}`} />
                    ))}
                  </div>
                </div>
              </SwipeCard>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </ScreenShell>
  );
}
