// GENERATING SCREEN
// Premium multi-stage loader with:
// - Animated review card being "written"
// - Rotating shimmer status messages
// - Pulsing pen/write animation
// - Progress dots
// Calls backend /api/generate, then transitions to review.

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import { useReviewStore } from './reviewStore';
import { useTranscriptStore } from './transcriptStore';
import { spring } from '@/design/motion';

// Status messages that cycle during generation
const STATUS_MESSAGES = [
  'Crafting your review...',
  'Adding personal touches...',
  'Polishing the words...',
  'Almost ready...'
];

// Maps (unchanged from original)
const OCCASION_MAP: Record<string, string> = {
  work_break: 'work_break', morning_routine: 'morning_routine',
  catching_up: 'catching_up', treating_myself: 'treating_myself',
  date: 'date', first_try: 'passing_by'
};
const DISAPPOINTMENT_MAP: Record<string, string> = {
  nothing_perfect: 'nothing_perfect', staff_unremarkable: 'staff_inattentive',
  wait_long: 'wait_too_long', could_be_quieter: 'too_noisy',
  portion_size: 'portion_size', temperature: 'temperature'
};
const VIBE_MAP: Record<string, string> = {
  cozy: 'cozy_corner', work_friendly: 'work_friendly', quiet: 'quiet_calm',
  energizing: 'energizing', great_music: 'great_music',
  instagram_worthy: 'instagram_worthy', social: 'social_buzzing'
};
const PRODUCT_MAP: Record<string, string> = {
  loved: 'loved_it', okay: 'it_was_good', not_great: 'not_what_i_expected'
};
const EXPERIENCE_MAP: Record<string, number> = {
  smooth: 9, okay: 6, could_be_better: 4
};
const RETURN_MAP: Record<string, string> = {
  new_regular: 'always', will_return: 'definitely', maybe: 'probably'
};
const COMPARISON_MAP: Record<string, string> = {
  'My new regular': 'new_regular', 'Better than my usual spot': 'better_than_usual',
  'Best in the area': 'best_in_area', 'Good but my usual spot still wins': 'usual_still_wins',
  'Unique, nothing like it nearby': 'unique_nothing_like_it'
};
const SENSORY_LABEL_MAP: Record<string, string> = {
  'Hot': 'hot_fresh', 'Fresh': 'hot_fresh', 'Crispy': 'crispy_flaky',
  'Creamy': 'rich_creamy', 'Rich': 'rich_creamy', 'Perfectly sweet': 'perfectly_sweet',
  'A little bland': 'slightly_bland', 'Could be hotter': 'could_be_hotter',
  'Portion was small': 'portion_small', 'Looked amazing': 'looked_amazing'
};

// Animated pen/pencil writing icon
function WritingPen() {
  return (
    <motion.div
      className="relative w-16 h-16 mx-auto"
      animate={{ rotate: [0, -3, 3, -3, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        {/* Paper */}
        <motion.rect
          x="12" y="8" width="40" height="48" rx="4"
          fill="#FEF3C7"
          stroke="#C67C4E"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        />
        {/* Lines on paper */}
        {[0, 1, 2, 3].map((i) => (
          <motion.line
            key={i}
            x1="20" y1={20 + i * 8}
            x2={i === 3 ? '36' : '44'} y2={20 + i * 8}
            stroke="#C67C4E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.5 + i * 0.15 }}
          />
        ))}
        {/* Pen */}
        <motion.g
          animate={{ x: [0, 12, 0], y: [0, 2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="38" y="38" width="4" height="18" rx="1" fill="#C67C4E" transform="rotate(-30 40 47)" />
          <polygon points="34,54 36,58 38,54" fill="#3C2415" transform="rotate(-30 36 56)" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

// Animated shimmer text
function ShimmerText({ text }: { text: string }) {
  return (
    <motion.span
      className="bg-[linear-gradient(110deg,#5C3D2E,35%,#C67C4E,50%,#5C3D2E,75%,#5C3D2E)] bg-[length:200%_100%] bg-clip-text text-transparent text-[17px] font-medium"
      animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
      transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
    >
      {text}
    </motion.span>
  );
}

// Pulsing dots
function LoadingDots() {
  return (
    <div className="flex gap-1.5 justify-center mt-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-brand"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 1, 0.4]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

// Fake review lines appearing one by one
function ReviewPreview() {
  const lines = [
    { width: '85%', delay: 0.8 },
    { width: '92%', delay: 1.6 },
    { width: '70%', delay: 2.4 },
    { width: '88%', delay: 3.2 }
  ];

  return (
    <motion.div
      className="w-full max-w-[300px] mx-auto mt-8 rounded-2xl bg-white border border-ink-ghost/10 shadow-card p-5 space-y-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.4 }}
    >
      {/* Fake header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-brand/20" />
        <div className="h-2.5 w-20 rounded-full bg-surface-sunken" />
      </div>
      {/* Fake text lines with write-in animation */}
      {lines.map((line, i) => (
        <div key={i} className="overflow-hidden" style={{ width: line.width }}>
          <motion.div
            className="h-2.5 rounded-full bg-surface-sunken"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{
              duration: 0.8,
              delay: line.delay,
              ease: [0.16, 1, 0.3, 1]
            }}
          />
        </div>
      ))}
      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-shimmer bg-[length:200%_100%]"
        animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        style={{ opacity: 0.4 }}
      />
    </motion.div>
  );
}

export default function GeneratingScreen() {
  const go = useNavigation((s) => s.go);
  const choice = useChoiceStore();
  const setReview = useReviewStore((s) => s.setReview);
  const transcript = useTranscriptStore((s) => s.transcript);
  const useAI = useTranscriptStore((s) => s.useAI);
  const resetTranscript = useTranscriptStore((s) => s.reset);
  const called = useRef(false);
  const [messageIdx, setMessageIdx] = useState(0);

  // Cycle status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (transcript) {
      handleVoiceGeneration();
    } else {
      handleTraditionalGeneration();
    }
  }, [choice, transcript, useAI, go, setReview, resetTranscript]);

  async function handleVoiceGeneration() {
    try {
      const apiBase = new URLSearchParams(location.search).get('api') || 'http://localhost:3000';
      const params = new URLSearchParams(location.search);
      const response = await fetch(`${apiBase}/api/voice-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          ...(params.get('biz') && { business_name: params.get('biz') }),
          ...(params.get('hood') && { neighbourhood: params.get('hood') })
        })
      });

      if (!response.ok) throw new Error('Voice generation failed');

      const data = await response.json();
      setReview(data.review);
      resetTranscript();
      go('review');
    } catch {
      setReview(transcript);
      resetTranscript();
      go('review');
    }
  }

  function handleTraditionalGeneration() {
    const payload = {
      business_name: new URLSearchParams(location.search).get('biz') || 'Marriott',
      neighbourhood: new URLSearchParams(location.search).get('hood') || 'Juhu',
      visit_type: choice.visitType || 'first_time',
      occasion: OCCASION_MAP[choice.occasion || ''] || 'passing_by',
      items_ordered: choice.itemsOrdered,
      dart_score: PRODUCT_MAP[choice.productOpinion || ''] || 'it_was_good',
      sensory_chips: choice.sensoryChips.map((c) => SENSORY_LABEL_MAP[c] || c),
      bowling_pin_count: EXPERIENCE_MAP[choice.experienceOpinion || ''] ?? 7,
      disappointment_chip: DISAPPOINTMENT_MAP[choice.disappointment || ''] || 'nothing_perfect',
      putt_power_label: RETURN_MAP[choice.returnIntent || ''] || 'probably',
      comparison_chip: COMPARISON_MAP[choice.comparisonChip || ''] || choice.comparisonChip || 'better_than_usual',
      vibe_chips: choice.vibeChips.map((v) => VIBE_MAP[v] || v),
      recommend_for: choice.recommendFor || 'quick_break'
    };

    const apiBase = new URLSearchParams(location.search).get('api') || 'http://localhost:3000';

    fetch(`${apiBase}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((r) => r.json())
      .then((data) => {
        setReview(data.review || fallback(payload));
        go('review');
      })
      .catch(() => {
        setReview(fallback(payload));
        go('review');
      });
  }

  return (
    <ScreenShell className="items-center justify-center text-center" hideProgress hideBack hero>
      <WritingPen />

      {/* Cycling status text with shimmer */}
      <div className="mt-6 h-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={messageIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <ShimmerText text={STATUS_MESSAGES[messageIdx]} />
          </motion.div>
        </AnimatePresence>
      </div>

      <LoadingDots />

      {/* Animated review card preview */}
      <ReviewPreview />

      <motion.p
        className="mt-6 text-[12px] text-ink-quiet"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        This usually takes a few seconds
      </motion.p>
    </ScreenShell>
  );
}

function fallback(s: Record<string, unknown>): string {
  const biz = String(s.business_name || 'this spot');
  const hood = s.neighbourhood ? ` ${s.neighbourhood}` : '';
  const item = (s.items_ordered as string[])?.[0] || 'what we ordered';
  const sensory = ((s.sensory_chips as string[]) || []).slice(0, 2).join(' and ') || 'fresh';
  const visitType = String(s.visit_type || 'first_time');
  const occasion = String(s.occasion || 'passing_by').replace(/_/g, ' ');

  const s1 = visitType === 'returning'
    ? `Back at ${biz}${hood} for ${occasion} and it still hits.`
    : `Stopped into ${biz}${hood} for ${occasion} and it was exactly what was needed.`;

  const disappointment = s.disappointment_chip && s.disappointment_chip !== 'nothing_perfect'
    ? ` \u2014 ${String(s.disappointment_chip).replace(/_/g, ' ')} but worth it`
    : '';
  const s2 = `The ${item} at ${biz}${hood} was ${sensory}${disappointment}.`;

  const compMap: Record<string, string> = {
    new_regular: `My new regular in${hood}.`,
    better_than_usual: 'Better than my usual spot by a decent margin.',
    best_in_area: `Best ${item} in${hood}, no question.`,
    usual_still_wins: 'Good, though my usual spot still edges it.',
    unique_nothing_like_it: 'Nothing like it nearby.'
  };
  const s3 = compMap[String(s.comparison_chip)] || 'Worth the stop.';

  return [s1, s2, s3].join('\n');
}
