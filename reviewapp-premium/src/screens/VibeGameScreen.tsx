// VIBE GAME SCREEN
// Musical tiles - tap 2-3 cards that match the vibe
// Each selection plays a musical note with increasing intensity

import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { vibeCards } from '@/data/legacyData';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import PrimaryButton from '@/components/PrimaryButton';
import { spotlightHandlers, SpotlightOverlay } from '@/components/ui/spotlight-card';


export default function VibeGameScreen() {
  const go = useNavigation((s) => s.go);
  const addSwipeAnswer = useGameStore((s) => s.addSwipeAnswer);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  function toggleVibe(vibeId: string) {
    const vibe = vibeCards.find((v) => v.id === vibeId);
    let updated: string[];

    if (selectedVibes.includes(vibeId)) {
      updated = selectedVibes.filter((id) => id !== vibeId);
      audio.tick();
      haptics.tick();
    } else if (selectedVibes.length < 3) {
      updated = [...selectedVibes, vibeId];

      if (vibe) {
        const selectedCount = updated.length;
        const volume = 0.1 + selectedCount * 0.05;
        const duration = 0.3 + selectedCount * 0.1;
        playTone(vibe.frequency, duration, Math.min(volume, 0.3));
      }

      haptics.press();
    } else {
      return;
    }

    setSelectedVibes(updated);
  }

  function playTone(frequency: number, duration: number = 0.3, volume: number = 0.15) {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume;

      oscillator.start(audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Silently fail if audio not supported
    }
  }

  function handleContinue() {
    selectedVibes.forEach((vibeId) => {
      const vibe = vibeCards.find((v) => v.id === vibeId);
      if (vibe) {
        addSwipeAnswer({
          questionId: `vibe_${vibeId}`,
          question: `Vibe: ${vibe.label}`,
          positive: true,
        });
      }
    });

    audio.bullseye();
    haptics.impact();
    go('slingshotGame');
  }

  const canContinue = selectedVibes.length >= 2;

  return (
    <ScreenShell>
      <motion.div
        className="flex-1 flex flex-col justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={spring.gentle}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-primary text-label font-semibold mb-3"
            style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}
          >
            <span>🎮</span>
            <span>Round 4 — Vibe Check</span>
          </div>

          <h2 className="text-display text-ink mb-2">
            What's the vibe?
          </h2>

          <p className="text-body text-ink-secondary">
            Tap 2-3 cards that match the feel
          </p>
        </div>

        {/* Vibe Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {vibeCards.map((vibe) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const selectionIndex = selectedVibes.indexOf(vibe.id);
            const isDisabled = !isSelected && selectedVibes.length >= 3;

            return (
              <motion.button
                key={vibe.id}
                {...(!isDisabled ? spotlightHandlers() : {})}
                onClick={() => toggleVibe(vibe.id)}
                disabled={isDisabled}
                className={`relative overflow-hidden rounded-2xl p-5 text-center transition-all duration-200 cursor-pointer ${
                  isDisabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                style={isSelected ? {
                  background: '#FFF8F3',
                  border: '1px solid rgba(198,124,78,0.45)',
                  boxShadow: `0 0 0 3px rgba(198,124,78,${0.08 + selectionIndex * 0.04}), 0 4px 20px rgba(0,0,0,0.06)`,
                } : {
                  background: '#FFFFFF',
                  border: '1px solid rgba(200,170,140,0.2)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.07)',
                }}
                whileTap={!isDisabled ? tapScale.whileTap : undefined}
              >
                {!isDisabled && <SpotlightOverlay color={isSelected ? 'coffee' : 'warm'} size={110} />}
                <motion.span
                  className="text-3xl block mb-2 transition-transform duration-300"
                  style={isSelected ? { transform: `scale(${1.1 + selectionIndex * 0.05})` } : undefined}
                >
                  {vibe.emoji}
                </motion.span>
                <span className="text-body-sm font-semibold text-ink">{vibe.label}</span>

                {isSelected && (
                  <motion.div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #E8B896, #C67C4E)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.snappy}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#FFFFFF" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selection counter */}
        <motion.p
          className="text-center text-label text-ink-secondary mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {selectedVibes.length}/3 selected {selectedVibes.length < 2 && '(pick at least 2)'}
        </motion.p>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <PrimaryButton
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continue →
          </PrimaryButton>
        </motion.div>
      </motion.div>
    </ScreenShell>
  );
}
