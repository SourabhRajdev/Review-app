import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import PrimaryButton from '@/components/PrimaryButton';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const MENU = [
  { category: 'Coffee', emoji: '☕', items: ['Iced Latte', 'Vanilla Oat Latte', 'Spanish Latte', 'Cortado', 'Cold Brew', 'Flat White', 'Cappuccino'] },
  { category: 'Pastries', emoji: '🥐', items: ['Nutella Croissant', 'Pistachio Croissant', 'Almond Croissant', 'Cinnamon Roll', 'Banana Bread'] },
  { category: 'Breakfast', emoji: '🍳', items: ['Avocado Smash', 'Truffle Mushroom Toast', 'Shakshuka', 'Smoked Salmon Bagel', 'Acai Bowl'] },
  { category: 'Lunch', emoji: '🥗', items: ['Halloumi Wrap', 'Chicken Pesto Panini', 'Beetroot & Feta Salad', 'Truffle Fries'] },
  { category: 'Drinks', emoji: '🧊', items: ['Strawberry Smoothie', 'Matcha Latte', 'Mango Lassi', 'Fresh OJ'] },
];

export default function ConveyorBeltScreen() {
  const go = useNavigation((s) => s.go);
  const setMenuItems = useGameStore((s) => s.setMenuItems);
  const [activeCategory, setActiveCategory] = useState(MENU[0].category);
  const [selected, setSelected] = useState<string[]>([]);

  const currentItems = MENU.find((c) => c.category === activeCategory)?.items ?? [];

  function toggleItem(item: string) {
    if (selected.includes(item)) { setSelected(selected.filter((i) => i !== item)); audio.tick(); haptics.tick(); }
    else { setSelected([...selected, item]); audio.tap(); haptics.press(); }
  }

  function handleContinue() {
    if (selected.length === 0) return;
    setMenuItems(selected);
    audio.tap();
    haptics.press();
    go('bubblePop');
  }

  return (
    <ScreenShell>
      <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-4">
          <h2 className="text-display text-ink">What did you order?</h2>
          <p className="text-body-sm text-ink-secondary mt-1">Tap everything you tried</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 no-scrollbar">
          {MENU.map((cat) => {
            const isActive = activeCategory === cat.category;
            const count = cat.items.filter((i) => selected.includes(i)).length;
            return (
              <button
                key={cat.category}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-chip text-caption font-semibold transition-colors duration-150 cursor-pointer ${
                  isActive ? 'bg-primary text-white' : 'bg-surface text-ink-secondary border border-ink-ghost/20'
                }`}
                onClick={() => { setActiveCategory(cat.category); haptics.tick(); }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.category}</span>
                {count > 0 && (
                  <span className={`ml-0.5 text-micro px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-primary-muted text-primary'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto pb-28">
          <AnimatePresence mode="wait">
            <motion.div key={activeCategory} className="grid grid-cols-2 gap-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {currentItems.map((item) => {
                const isSelected = selected.includes(item);
                return (
                  <motion.button
                    key={item}
                    className={`rounded-card px-4 py-3.5 text-left cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-surface ring-2 ring-primary shadow-elevated'
                        : 'bg-surface border border-ink-ghost/20 shadow-card active:shadow-elevated'
                    }`}
                    whileTap={tapScale.whileTap}
                    onClick={() => toggleItem(item)}
                  >
                    <div className="flex items-center gap-2.5">
                      <p className={`flex-1 text-body-sm font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-ink'}`}>{item}</p>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-bg via-bg to-transparent">
          <div className="max-w-[480px] mx-auto">
            <PrimaryButton onClick={handleContinue} disabled={selected.length === 0}>
              {selected.length > 0 ? `Continue · ${selected.length} item${selected.length !== 1 ? 's' : ''}` : 'Tap items to continue'}
            </PrimaryButton>
          </div>
        </div>
      </motion.div>
    </ScreenShell>
  );
}
