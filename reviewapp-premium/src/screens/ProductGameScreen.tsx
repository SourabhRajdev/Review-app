import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import SwipeCard from '@/components/SwipeCard';
import { productQuestions } from '@/data/legacyData';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

export default function ProductGameScreen() {
  const go = useNavigation((s) => s.go);
  const back = useNavigation((s) => s.back);
  const addSwipeAnswer = useGameStore((s) => s.addSwipeAnswer);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const current = productQuestions[currentIndex];
  const remaining = productQuestions.length - currentIndex;

  function handleSwipe(positive: boolean) {
    if (isTransitioning) return;
    setIsTransitioning(true);

    addSwipeAnswer({
      questionId: current.id,
      question: current.text,
      positive,
    });

    audio.tick();
    haptics.tick();

    setTimeout(() => {
      if (currentIndex + 1 >= productQuestions.length) {
        audio.bullseye();
        haptics.impact();
        go('round2');
      } else {
        setCurrentIndex((i) => i + 1);
      }
      setIsTransitioning(false);
    }, 300);
  }

  return (
    <ScreenShell onBack={back}>
      <motion.div
        className="flex-1 flex flex-col justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center mb-6">
          <span
            className="inline-block text-label font-bold text-primary px-3 py-1 rounded-full mb-3"
            style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}
          >
            Round 1 — Product Check
          </span>
          <h2 className="text-display text-ink">Swipe to rate</h2>
          <p className="text-body text-ink-secondary mt-1">Swipe right or left · {remaining} left</p>
        </div>

        <div className="relative flex items-center justify-center" style={{ minHeight: 320 }}>
          {/* Background stack card */}
          {currentIndex + 1 < productQuestions.length && (
            <div
              className="absolute p-6 rounded-card"
              style={{
                width: '90%',
                opacity: 0.3,
                transform: 'translateY(6px) scale(0.95)',
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(200,170,140,0.15)',
              }}
            />
          )}

          <AnimatePresence mode="wait">
            {current && !isTransitioning && (
              <SwipeCard
                key={current.id}
                onSwipeLeft={() => handleSwipe(false)}
                onSwipeRight={() => handleSwipe(true)}
                leftLabel={current.leftLabel}
                rightLabel={current.rightLabel}
              >
                <div
                  className="p-10 text-center w-full max-w-sm mx-auto"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(200,170,140,0.2)',
                    borderRadius: '28px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <span className="text-6xl block mb-6">{current.emoji}</span>
                  <h3 className="text-h2 text-ink mb-3 leading-tight">{current.text}</h3>
                  <p className="text-label font-bold text-ink-tertiary uppercase tracking-wider">
                    Swipe right for Yes, left for No
                  </p>

                  {/* Progress dots */}
                  <div className="flex items-center justify-center gap-1.5 mt-8">
                    {productQuestions.map((q, i) => (
                      <div
                        key={q.id}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: i === currentIndex ? 24 : 8,
                          background: i < currentIndex
                            ? '#C67C4E'
                            : i === currentIndex
                              ? 'linear-gradient(90deg, #E8B896, #C67C4E)'
                              : 'rgba(200,170,140,0.2)',
                        }}
                      />
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
