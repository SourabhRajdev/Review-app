import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { nationalities } from '@/data/legacyData';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import PrimaryButton from '@/components/PrimaryButton';

export default function AboutYouScreen() {
  const go = useNavigation((s) => s.go);
  const setVisitType = useGameStore((s) => s.setVisitType);
  const [userType, setUserType] = useState<'resident' | 'tourist' | null>(null);
  const [nationality, setNationality] = useState('');
  const [showOther, setShowOther] = useState(false);
  const [otherNationality, setOtherNationality] = useState('');

  const canProceed = !!(userType && (nationality || otherNationality));

  function handleNext() {
    setVisitType(userType === 'tourist' ? 'first_time' : 'returning');
    audio.tick();
    haptics.impact();
    go('orderSelection');
  }

  return (
    <ScreenShell>
      <motion.div
        className="flex-1 flex flex-col justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
      >
        <div className="text-center mb-8">
          <h2 className="text-display text-ink mb-2">A bit about you</h2>
          <p className="text-body text-ink-secondary">This helps personalize your review</p>
        </div>

        {/* Resident or Tourist */}
        <div className="space-y-4 mb-8">
          <label className="text-label text-ink-tertiary uppercase tracking-wider ml-1">
            Are you a...
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'resident' as const, emoji: '🏠', label: 'Resident' },
              { value: 'tourist' as const, emoji: '✈️', label: 'Tourist' },
            ].map((option) => (
              <motion.button
                key={option.value}
                onClick={() => {
                  audio.tap();
                  haptics.press();
                  setUserType(option.value);
                }}
                className="relative rounded-2xl p-5 text-center transition-all duration-200 cursor-pointer"
                style={userType === option.value ? {
                  background: '#FFF8F3',
                  border: '1px solid rgba(198,124,78,0.45)',
                  boxShadow: '0 0 0 3px rgba(198,124,78,0.12), 0 4px 20px rgba(0,0,0,0.06)',
                } : {
                  background: '#FFFFFF',
                  border: '1px solid rgba(200,170,140,0.2)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.07)',
                }}
                whileTap={tapScale.whileTap}
              >
                <span className="text-3xl block mb-2">{option.emoji}</span>
                <span className="text-body-sm font-bold text-ink">{option.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Nationality */}
        <div className="space-y-4 mb-8">
          <label className="text-label text-ink-tertiary uppercase tracking-wider ml-1">
            Nationality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {nationalities.slice(0, 8).map((nat) => (
              <motion.button
                key={nat.code}
                onClick={() => {
                  audio.tap();
                  haptics.tick();
                  setShowOther(false);
                  setNationality(nat.name);
                }}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-label font-bold transition-all cursor-pointer"
                style={nationality === nat.name && !showOther ? {
                  background: '#FFF8F3',
                  border: '1px solid rgba(198,124,78,0.4)',
                  color: '#1A0E08',
                  boxShadow: '0 0 0 2px rgba(198,124,78,0.1)',
                } : {
                  background: '#FFFFFF',
                  border: '1px solid rgba(200,170,140,0.2)',
                  color: '#7A5C4A',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
                whileTap={tapScale.whileTap}
              >
                <span>{nat.flag}</span>
                <span className="truncate">{nat.name}</span>
              </motion.button>
            ))}
            <motion.button
              onClick={() => {
                audio.tap();
                haptics.tick();
                setShowOther(true);
                setNationality('');
              }}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-label font-bold transition-all cursor-pointer"
              style={showOther ? {
                background: '#FFF8F3',
                border: '1px solid rgba(198,124,78,0.4)',
                color: '#1A0E08',
                boxShadow: '0 0 0 2px rgba(198,124,78,0.1)',
              } : {
                background: '#FFFFFF',
                border: '1px solid rgba(200,170,140,0.2)',
                color: '#7A5C4A',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              whileTap={tapScale.whileTap}
            >
              <span>🌍</span>
              <span>Other</span>
            </motion.button>
          </div>

          {showOther && (
            <motion.input
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              type="text"
              placeholder="Enter your nationality..."
              value={otherNationality}
              onChange={(e) => setOtherNationality(e.target.value)}
              className="w-full px-4 py-4 rounded-xl text-body text-ink placeholder:text-ink-ghost focus:outline-none transition-all"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(200,170,140,0.3)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
              }}
              autoFocus
            />
          )}
        </div>

        {/* Continue CTA */}
        <PrimaryButton
          onClick={handleNext}
          disabled={!canProceed}
        >
          Continue →
        </PrimaryButton>
      </motion.div>
    </ScreenShell>
  );
}
