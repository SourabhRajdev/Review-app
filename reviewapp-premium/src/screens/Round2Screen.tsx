import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { waitFeelingLabels } from '@/data/legacyData';
import { spring } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import PrimaryButton from '@/components/PrimaryButton';

// Lerp between emerald and rose based on slider value
function glowColor(value: number) {
  const t = value / 100;
  // 0 → emerald  |  0.5 → amber  |  1 → rose
  if (t <= 0.5) {
    const u = t * 2;
    const r = Math.round(16 + u * (245 - 16));
    const g = Math.round(185 + u * (158 - 185));
    const b = Math.round(129 + u * (11 - 129));
    return `rgb(${r},${g},${b})`;
  } else {
    const u = (t - 0.5) * 2;
    const r = Math.round(245 + u * (248 - 245));
    const g = Math.round(158 + u * (113 - 158));
    const b = Math.round(11 + u * (113 - 11));
    return `rgb(${r},${g},${b})`;
  }
}

export default function Round2Screen() {
  const go = useNavigation((s) => s.go);
  const back = useNavigation((s) => s.back);
  const addSwipeAnswer = useGameStore((s) => s.addSwipeAnswer);
  const [waitFeeling, setWaitFeeling] = useState(33);

  const getLabelForValue = (v: number) => {
    if (v <= 16) return waitFeelingLabels[0];
    if (v <= 50) return waitFeelingLabels[1];
    if (v <= 83) return waitFeelingLabels[2];
    return waitFeelingLabels[3];
  };

  const getCurrentLabel = () => getLabelForValue(waitFeeling);

  const currentLabel = getCurrentLabel();
  const glow = glowColor(waitFeeling);
  const glowAlpha = 0.2;

  function handleNext() {
    addSwipeAnswer({
      questionId: 'wait_feeling',
      question: 'How was the wait?',
      positive: waitFeeling <= 50,
    });
    audio.bullseye();
    haptics.impact();
    go('basketball');
  }

  return (
    <ScreenShell onBack={back}>
      <motion.div
        className="flex-1 flex flex-col justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-primary text-label font-bold mb-3"
            style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}
          >
            <span>🎮</span>
            <span>Round 2 — Service</span>
          </div>
          <h2 className="text-display text-ink mb-2">How was the wait?</h2>
          <p className="text-body text-ink-secondary">Drag to express how the wait felt</p>
        </div>

        {/* Reactive feeling card — white bg, reactive border/shadow */}
        <motion.div
          className="rounded-[32px] p-10 text-center mb-10"
          key={currentLabel.label}
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.snappy}
          style={{
            background: '#FFFFFF',
            border: `1.5px solid ${glow.replace('rgb', 'rgba').replace(')', `, 0.4)`)}`,
            boxShadow: `0 0 0 3px ${glow.replace('rgb', 'rgba').replace(')', `, ${glowAlpha}`)}, 0 4px 24px rgba(0,0,0,0.07)`,
            transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
          }}
        >
          <motion.span
            className="block mb-4 select-none"
            style={{ fontSize: '5rem', lineHeight: 1 }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {currentLabel.emoji}
          </motion.span>
          <span className="text-heading font-black text-ink uppercase tracking-widest">
            {currentLabel.label}
          </span>
        </motion.div>

        {/* Slider */}
        <div className="px-4 mb-12">
          <input
            type="range"
            min={0}
            max={100}
            value={waitFeeling}
            onChange={(e) => {
              const val = Number(e.target.value);
              const prev = waitFeeling;
              setWaitFeeling(val);

              // Strong ratchet every 2 units
              if (Math.floor(val / 2) !== Math.floor(prev / 2)) {
                haptics.sliderTick();
              }
              // Heavy snap on zone boundary crossing
              if (getLabelForValue(val).label !== getLabelForValue(prev).label) {
                haptics.sliderSnap();
              }
            }}
            className="w-full cursor-pointer"
            style={{ background: 'linear-gradient(to right, #0D9E6F 0%, #C67C4E 50%, #E53E3E 100%)' }}
          />

          <div className="flex justify-between mt-6">
            {waitFeelingLabels.map((label) => (
              <div key={label.position} className="flex flex-col items-center w-1/4">
                <span className="text-xl mb-1">{label.emoji}</span>
                <span className="text-micro font-bold text-ink-tertiary uppercase tracking-tighter text-center">
                  {label.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PrimaryButton onClick={handleNext}>
            Continue →
          </PrimaryButton>
        </motion.div>
      </motion.div>
    </ScreenShell>
  );
}
