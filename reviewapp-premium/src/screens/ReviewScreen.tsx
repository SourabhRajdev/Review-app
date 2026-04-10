// FINAL REVIEW OUTPUT SCREEN
// Premium card design with tier badge, animated luck bar,
// editable review text, and polished CTA section.

import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useReviewStore } from './reviewStore';
import { useRewardStore, selectTier, selectLuck } from '@/architecture/reward/store';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bronze: { label: 'Bronze', color: '#CD7F32', bg: '#CD7F3215' },
  silver: { label: 'Silver', color: '#C0C0C0', bg: '#C0C0C015' },
  gold: { label: 'Gold', color: '#FFD700', bg: '#FFD70015' },
  jackpot: { label: 'Jackpot', color: '#C67C4E', bg: '#C67C4E15' }
};

export default function ReviewScreen() {
  const text = useReviewStore((s) => s.text);
  const updateText = useReviewStore((s) => s.updateText);
  const tier = useRewardStore(selectTier);
  const luck = useRewardStore(selectLuck);
  const [copied, setCopied] = useState(false);

  const googleUrl =
    new URLSearchParams(location.search).get('gurl') ||
    'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4';
  const tripUrl =
    new URLSearchParams(location.search).get('turl') ||
    'https://www.tripadvisor.com/UserReview';

  const tierInfo = TIER_CONFIG[tier || ''] || TIER_CONFIG.bronze;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.querySelector('textarea');
      ta?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    audio.bullseye();
    haptics.impact();
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ScreenShell hideProgress hideBack>
      {/* Success header */}
      <motion.div
        className="mt-8 mb-6 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.1 }}
      >
        {/* Checkmark circle */}
        <motion.div
          className="w-14 h-14 rounded-full bg-brand-good/10 flex items-center justify-center mx-auto mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.2 }}
        >
          <motion.svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
          </motion.svg>
        </motion.div>

        <h2 className="text-[26px] font-bold font-display text-ink mb-1">
          Your review is ready
        </h2>
        <p className="text-ink-muted text-[15px]">
          Tap to edit, then copy and post.
        </p>
      </motion.div>

      {/* Tier + Luck badge */}
      <motion.div
        className="flex items-center justify-center gap-3 mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold"
          style={{ backgroundColor: tierInfo.bg, color: tierInfo.color }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={tierInfo.color}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {tierInfo.label}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-surface-sunken overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-amber"
              initial={{ width: 0 }}
              animate={{ width: `${luck * 100}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            />
          </div>
          <span className="text-[11px] text-ink-quiet font-medium">{Math.round(luck * 100)}%</span>
        </div>
      </motion.div>

      {/* Review card */}
      <motion.div
        className="w-full rounded-2xl bg-white border border-ink-ghost/10 shadow-card-lg overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.2 }}
      >
        {/* Card header bar */}
        <div className="h-1 w-full bg-gradient-brand" />
        <div className="p-5">
          <motion.textarea
            className="w-full bg-transparent text-[15px] leading-relaxed text-ink font-body resize-none border-0 outline-none min-h-[180px]"
            value={text}
            onChange={(e) => updateText(e.target.value)}
            spellCheck={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          />
        </div>
      </motion.div>

      {/* Copy CTA */}
      <motion.button
        className={`
          mt-5 w-full rounded-2xl px-8 py-[18px] text-[17px] font-semibold text-white
          shadow-card-warm cursor-pointer transition-all duration-200
          ${copied ? 'bg-brand-good' : 'bg-gradient-brand'}
        `}
        whileTap={tapScale.whileTap}
        onClick={handleCopy}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {copied ? (
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </span>
        ) : (
          'Copy Review'
        )}
      </motion.button>

      {/* Platform links */}
      <motion.div
        className="flex gap-3 mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          className="flex-1 rounded-xl bg-white border border-ink-ghost/15 px-4 py-3.5 text-[14px] font-semibold text-ink shadow-card cursor-pointer hover:shadow-card-lg transition-shadow duration-200 flex items-center justify-center gap-2"
          whileTap={tapScale.whileTap}
          onClick={() => window.open(googleUrl, '_blank', 'noopener')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#4285F4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google Reviews
        </motion.button>
        <motion.button
          className="flex-1 rounded-xl bg-white border border-ink-ghost/15 px-4 py-3.5 text-[14px] font-semibold text-ink shadow-card cursor-pointer hover:shadow-card-lg transition-shadow duration-200 flex items-center justify-center gap-2"
          whileTap={tapScale.whileTap}
          onClick={() => window.open(tripUrl, '_blank', 'noopener')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#00AF87">
            <circle cx="6.5" cy="13.5" r="3" stroke="#00AF87" strokeWidth="1.5" fill="none"/>
            <circle cx="17.5" cy="13.5" r="3" stroke="#00AF87" strokeWidth="1.5" fill="none"/>
            <path d="M12 6c-3.5 0-6.5 1.5-8.5 3.5l2.5 0A7 7 0 0112 8a7 7 0 016.5 1.5l2.5 0C19 7.5 15.5 6 12 6z"/>
          </svg>
          TripAdvisor
        </motion.button>
      </motion.div>

      <motion.p
        className="text-center text-ink-quiet text-[13px] mt-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Paste the copied text and hit post.
      </motion.p>
    </ScreenShell>
  );
}
