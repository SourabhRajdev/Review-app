import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { menuData } from '@/data/legacyData';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import PrimaryButton from '@/components/PrimaryButton';

export default function OrderSelectionScreen() {
  const go = useNavigation((s) => s.go);
  const back = useNavigation((s) => s.back);
  const setMenuItems = useGameStore((s) => s.setMenuItems);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(menuData[0].id);

  function toggleItem(itemId: string) {
    audio.tap();
    haptics.tick();
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }

  function handleNext() {
    const allItems = menuData.flatMap((c) => c.items);
    const names = selectedItems
      .map((id) => allItems.find((item) => item.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    setMenuItems(names);
    audio.bullseye();
    haptics.impact();
    go('productGame');
  }

  return (
    <ScreenShell onBack={back}>
      <motion.div
        className="flex-1 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center mb-6">
          <h2 className="text-display text-ink mb-1">What did you order?</h2>
          <p className="text-body text-ink-secondary">Select everything you tried</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1 -mr-1">
          {menuData.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl overflow-hidden"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(200,170,140,0.2)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.07)',
              }}
            >
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="w-full flex items-center justify-between p-4 cursor-pointer transition-colors duration-150 hover:bg-[#FFF8F3]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-bold text-ink">{category.name}</span>
                  {selectedItems.some((id) => category.items.some((item) => item.id === id)) && (
                    <span className="text-micro font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,158,111,0.1)', color: '#0D9E6F' }}>
                      {category.items.filter((item) => selectedItems.includes(item.id)).length}
                    </span>
                  )}
                </div>
                <motion.svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-ink-tertiary"
                  animate={{ rotate: expandedCategory === category.id ? 180 : 0 }}
                >
                  <path d="M6 9l6 6 6-6" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {expandedCategory === category.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="divide-y"
                    style={{ borderTop: '1px solid rgba(200,170,140,0.12)', borderColor: 'rgba(200,170,140,0.12)' }}
                  >
                    {category.items.map((item) => {
                      const isSelected = selectedItems.includes(item.id);
                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-center gap-4 p-4 pl-5 text-left transition-all cursor-pointer"
                          style={isSelected ? {
                            background: 'rgba(198,124,78,0.04)',
                          } : {
                            background: 'transparent',
                          }}
                          whileTap={tapScale.whileTap}
                        >
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0"
                            style={isSelected ? {
                              background: 'linear-gradient(135deg, #E8B896, #C67C4E)',
                              border: '2px solid #C67C4E',
                            } : {
                              background: '#FFFFFF',
                              border: '2px solid rgba(200,170,140,0.3)',
                            }}
                          >
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-sm font-semibold text-ink leading-tight">{item.name}</p>
                          </div>
                          <span className="text-label font-bold text-ink-tertiary">{item.price} AED</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Floating Continue button */}
        <div
          className="sticky bottom-0 pt-6 pb-6 -mx-5 px-5"
          style={{ background: 'linear-gradient(to top, #FAF9F7 60%, transparent)' }}
        >
          <PrimaryButton
            onClick={handleNext}
            disabled={selectedItems.length === 0}
          >
            Start Game
          </PrimaryButton>
        </div>
      </motion.div>
    </ScreenShell>
  );
}
