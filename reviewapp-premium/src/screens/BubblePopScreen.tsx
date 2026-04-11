import { useState } from 'react';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import AnimatedChip from '@/components/AnimatedChip';
import PrimaryButton from '@/components/PrimaryButton';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const TAGS = [
  'Hot & Fresh', 'Crispy', 'Creamy', 'Rich flavor', 'Perfectly sweet',
  'A little bland', 'Could be hotter', 'Small portion', 'Generous portion', 'Looked amazing',
];

export default function BubblePopScreen() {
  const go = useNavigation((s) => s.go);
  const setSensoryChips = useGameStore((s) => s.setSensoryChips);
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(tag: string) {
    if (selected.includes(tag)) { setSelected(selected.filter((t) => t !== tag)); audio.tick(); haptics.tick(); }
    else if (selected.length < 2) { setSelected([...selected, tag]); audio.tap(); haptics.press(); }
  }

  function handleContinue() {
    if (selected.length === 0) return;
    setSensoryChips(selected);
    audio.tap();
    haptics.press();
    go('vibeGame');
  }

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <h2 className="text-display text-ink mb-2">How was the food?</h2>
        <p className="text-body-sm text-ink-secondary mb-8">Pick up to 2 that fit</p>

        <div className="flex flex-wrap justify-center gap-2.5 max-w-[360px]">
          {TAGS.map((tag) => (
            <AnimatedChip
              key={tag}
              label={tag}
              selected={selected.includes(tag)}
              disabled={!selected.includes(tag) && selected.length >= 2}
              onClick={() => toggle(tag)}
            />
          ))}
        </div>

        <p className="text-caption text-ink-tertiary mt-6">
          {selected.length}/2 selected{selected.length < 1 && ' — pick at least 1'}
        </p>

        <div className="mt-8 w-full max-w-[300px]">
          <PrimaryButton onClick={handleContinue} disabled={selected.length === 0}>
            Continue
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}
