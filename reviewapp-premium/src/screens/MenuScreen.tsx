import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import { spring, tapScale, staggerContainer, staggerItem } from '@/design/motion';
import PrimaryButton from '@/components/PrimaryButton';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const CATEGORY_ICONS: Record<string, string> = {
  'Coffee & Espresso': 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z',
  'Pastries & Bakes': 'M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0A2.704 2.704 0 014 15.546M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01',
  'Breakfast': 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707',
  'Lunch': 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
  'Cold Drinks': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
};

const MENU = [
  {
    category: 'Coffee & Espresso',
    items: ['Iced Latte', 'Vanilla Oat Latte', 'Spanish Latte', 'Cortado', 'Cold Brew', 'Flat White', 'Cappuccino']
  },
  {
    category: 'Pastries & Bakes',
    items: ['Strawberry Nutella Croissant', 'Pistachio Croissant', 'Almond Croissant', 'Cinnamon Roll', 'Banana Bread']
  },
  {
    category: 'Breakfast',
    items: ['Avocado Smash on Sourdough', 'Truffle Mushroom Toast', 'Shakshuka', 'Smoked Salmon Bagel', 'Acai Bowl']
  },
  {
    category: 'Lunch',
    items: ['Halloumi Wrap', 'Chicken Pesto Panini', 'Beetroot & Feta Salad', 'Truffle Fries']
  },
  {
    category: 'Cold Drinks',
    items: ['Strawberry Banana Smoothie', 'Matcha Latte (Iced)', 'Mango Lassi', 'Fresh Orange Juice']
  }
];

export default function MenuScreen() {
  const go = useNavigation((s) => s.go);
  const items = useChoiceStore((s) => s.itemsOrdered);
  const toggleItem = useChoiceStore((s) => s.toggleItem);
  const [openCat, setOpenCat] = useState<string>(MENU[0].category);

  return (
    <ScreenShell>
      <motion.h2
        className="text-[28px] font-bold font-display text-ink mt-4 mb-1"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
      >
        What did you order?
      </motion.h2>
      <motion.p
        className="text-ink-muted text-[15px] mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Tap items you tried. Multiple is fine.
      </motion.p>

      <motion.div
        className="flex-1 overflow-y-auto pb-28 space-y-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {MENU.map((cat) => {
          const isOpen = openCat === cat.category;
          const selectedCount = cat.items.filter((i) => items.includes(i)).length;
          const iconPath = CATEGORY_ICONS[cat.category] || '';

          return (
            <motion.div
              key={cat.category}
              className="rounded-2xl bg-white border border-ink-ghost/15 overflow-hidden shadow-card"
              variants={staggerItem}
            >
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer"
                onClick={() => setOpenCat(isOpen ? '' : cat.category)}
              >
                <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C67C4E"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={iconPath} />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-[15px] font-semibold text-ink">{cat.category}</span>
                  {selectedCount > 0 && (
                    <span className="ml-2 text-[12px] font-medium text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                      {selectedCount}
                    </span>
                  )}
                </div>
                <motion.svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#B8A590"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={spring.snappy}
                >
                  <polyline points="6 9 12 15 18 9" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    className="px-3 pb-3 space-y-1"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {cat.items.map((item) => {
                      const selected = items.includes(item);
                      return (
                        <motion.button
                          key={item}
                          className={`
                            w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer
                            transition-colors duration-150
                            ${selected ? 'bg-brand/8 border border-brand/15' : 'bg-surface-sunken/60 border border-transparent hover:bg-surface-sunken'}
                          `}
                          whileTap={tapScale.whileTap}
                          onClick={() => {
                            toggleItem(item);
                            audio.tick();
                            haptics.tick();
                          }}
                        >
                          <motion.div
                            className={`
                              w-5 h-5 rounded-md border-2 flex items-center justify-center
                              transition-all duration-200
                              ${selected ? 'bg-brand border-brand' : 'border-ink-ghost bg-white'}
                            `}
                            animate={{ scale: selected ? [1, 1.2, 1] : 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <AnimatePresence>
                              {selected && (
                                <motion.svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                >
                                  <path
                                    d="M3.5 8.5L6.5 11.5L12.5 5.5"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </motion.svg>
                              )}
                            </AnimatePresence>
                          </motion.div>
                          <span className={`text-[15px] ${selected ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                            {item}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-surface via-surface to-transparent">
        <div className="max-w-[480px] mx-auto">
          <PrimaryButton
            onClick={() => {
              if (items.length === 0) return;
              audio.tap();
              haptics.press();
              go('sensoryChips');
            }}
            disabled={items.length === 0}
          >
            Continue{items.length > 0 ? ` \u00B7 ${items.length} item${items.length > 1 ? 's' : ''}` : ''}
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}
