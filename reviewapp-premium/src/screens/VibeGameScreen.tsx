// VIBE GAME SCREEN
// Musical tiles - tap 2-3 cards that match the vibe
// Each selection plays a musical note with increasing intensity

import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const VIBE_CARDS = [
  { id: 'cozy', emoji: '☕', label: 'Cozy corner', frequency: 261.63 },
  { id: 'work', emoji: '💼', label: 'Work-friendly', frequency: 293.66 },
  { id: 'instagram', emoji: '📸', label: 'Instagram-worthy', frequency: 329.63 },
  { id: 'quiet', emoji: '🤫', label: 'Quiet & calm', frequency: 349.23 },
  { id: 'music', emoji: '🎵', label: 'Good music', frequency: 392.0 },
  { id: 'energizing', emoji: '⚡', label: 'Energizing', frequency: 440.0 },
  { id: 'cool', emoji: '❄️', label: 'Cool & refreshing', frequency: 493.88 },
  { id: 'social', emoji: '👥', label: 'Social & buzzing', frequency: 523.25 },
];

export default function VibeGameScreen() {
  const go = useNavigation((s) => s.go);
  const addSwipeAnswer = useGameStore((s) => s.addSwipeAnswer);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  function toggleVibe(vibeId: string) {
    const vibe = VIBE_CARDS.find((v) => v.id === vibeId);
    let updated: string[];

    if (selectedVibes.includes(vibeId)) {
      // Deselect
      updated = selectedVibes.filter((id) => id !== vibeId);
      audio.tick();
      haptics.tick();
    } else if (selectedVibes.length < 3) {
      // Select (max 3)
      updated = [...selectedVibes, vibeId];
      
      // Play musical note with increasing intensity based on selection count
      if (vibe) {
        const selectedCount = updated.length;
        const volume = 0.1 + selectedCount * 0.05;
        const duration = 0.3 + selectedCount * 0.1;
        playTone(vibe.frequency, duration, Math.min(volume, 0.3));
      }
      
      haptics.press();
    } else {
      return; // Max 3 selected
    }

    setSelectedVibes(updated);
  }

  // Audio helper function
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
    // Save each selected vibe as a swipe answer
    selectedVibes.forEach((vibeId) => {
      const vibe = VIBE_CARDS.find((v) => v.id === vibeId);
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
    go('serviceGame');
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-semibold mb-3">
            <span>🎮</span>
            <span>Round 4 — Vibe Check</span>
          </div>

          <h2 className="text-[26px] font-bold text-ink mb-2">
            What's the vibe?
          </h2>

          <p className="text-[15px] text-ink/60">
            Tap 2-3 cards that match the feel
          </p>
        </div>

        {/* Vibe Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {VIBE_CARDS.map((vibe) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const selectionIndex = selectedVibes.indexOf(vibe.id);
            const isDisabled = !isSelected && selectedVibes.length >= 3;

            return (
              <motion.button
                key={vibe.id}
                onClick={() => toggleVibe(vibe.id)}
                disabled={isDisabled}
                className={`bg-surface border border-ink/5 shadow-card rounded-2xl p-5 text-center transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-primary border-primary'
                    : isDisabled
                      ? 'opacity-40 pointer-events-none'
                      : 'hover:border-primary/30'
                }`}
                style={
                  isSelected
                    ? {
                        boxShadow: `0 0 ${12 + selectionIndex * 8}px rgba(198, 124, 78, ${0.15 + selectionIndex * 0.1})`,
                      }
                    : undefined
                }
                whileTap={!isDisabled ? tapScale.whileTap : undefined}
              >
                <motion.span
                  className="text-3xl block mb-2 transition-transform duration-300"
                  style={isSelected ? { transform: `scale(${1.1 + selectionIndex * 0.05})` } : undefined}
                >
                  {vibe.emoji}
                </motion.span>
                <span className="text-[14px] font-semibold text-ink">{vibe.label}</span>

                {isSelected && (
                  <motion.div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.snappy}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
          className="text-center text-[13px] text-ink-muted mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {selectedVibes.length}/3 selected {selectedVibes.length < 2 && '(pick at least 2)'}
        </motion.p>

        {/* Continue button */}
        <motion.button
          className={`w-full rounded-2xl px-8 py-[18px] text-[17px] font-semibold shadow-card transition-all ${
            canContinue
              ? 'bg-primary text-white cursor-pointer'
              : 'bg-surface text-ink/40 cursor-not-allowed opacity-40'
          }`}
          whileTap={canContinue ? tapScale.whileTap : undefined}
          onClick={handleContinue}
          disabled={!canContinue}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Continue →
        </motion.button>
      </motion.div>
    </ScreenShell>
  );
}
