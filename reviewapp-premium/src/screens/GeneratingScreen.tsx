import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useReviewStore } from './reviewStore';
import { useTranscriptStore } from './transcriptStore';

const STATUS_MESSAGES = [
  'Crafting your review',
  'Adding personal touches',
  'Polishing the words',
  'Almost ready',
];

// ── Branded spinner: ring of 8 dots, staggered opacity/scale ──
function BrandedSpinner() {
  const DOTS = 8;
  return (
    <div className="relative w-16 h-16 mx-auto">
      {Array.from({ length: DOTS }).map((_, i) => {
        const angle = (i / DOTS) * 360;
        const delay = -(i / DOTS) * 1.4;
        const x = 24 * Math.cos((angle - 90) * (Math.PI / 180));
        const y = 24 * Math.sin((angle - 90) * (Math.PI / 180));
        return (
          <motion.span
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full bg-primary"
            style={{
              left: `calc(50% + ${x}px - 5px)`,
              top: `calc(50% + ${y}px - 5px)`,
            }}
            animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1, 0.7] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}

export default function GeneratingScreen() {
  const go = useNavigation((s) => s.go);
  const game = useGameStore();
  const setReview = useReviewStore((s) => s.setReview);
  const transcript = useTranscriptStore((s) => s.transcript);
  const resetTranscript = useTranscriptStore((s) => s.reset);
  const called = useRef(false);
  const [messageIdx, setMessageIdx] = useState(0);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Helper to copy using multiple fallback methods
  async function copyWithFallbacks(text: string): Promise<boolean> {
    // Method 1: Modern Clipboard API
    try {
      await navigator.clipboard.writeText(text);
      console.log('✅ [GeneratingScreen] Copied via Clipboard API');
      return true;
    } catch (err) {
      console.log('⚠️ [GeneratingScreen] Clipboard API failed, trying fallback:', err);
    }

    // Method 2: Hidden textarea with execCommand (works in more contexts)
    try {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = text;
        hiddenInputRef.current.style.display = 'block';
        hiddenInputRef.current.focus();
        hiddenInputRef.current.select();
        const success = document.execCommand('copy');
        hiddenInputRef.current.style.display = 'none';
        if (success) {
          console.log('✅ [GeneratingScreen] Copied via execCommand');
          return true;
        }
      }
    } catch (err) {
      console.log('⚠️ [GeneratingScreen] execCommand failed:', err);
    }

    // Method 3: Create temporary textarea
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const success = document.execCommand('copy');
      document.body.removeChild(ta);
      if (success) {
        console.log('✅ [GeneratingScreen] Copied via temp textarea');
        return true;
      }
    } catch (err) {
      console.log('⚠️ [GeneratingScreen] Temp textarea failed:', err);
    }

    console.error('❌ [GeneratingScreen] All copy methods failed');
    return false;
  }

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    console.log('🔥 [GeneratingScreen] ========== MOUNTED ==========');
    console.log('📝 [GeneratingScreen] Transcript:', transcript);
    console.log('📏 [GeneratingScreen] Transcript length:', transcript?.length || 0);

    if (transcript && transcript.trim().length > 0) {
      console.log('🎯 [GeneratingScreen] Using VOICE generation flow');
      handleVoiceGeneration();
    } else {
      console.log('🎮 [GeneratingScreen] Using GAME generation flow');
      handleGameGeneration();
    }
  }, []);

  async function handleVoiceGeneration() {
    console.log('🎯 [GeneratingScreen] ========== VOICE GENERATION START ==========');
    console.log('📝 [GeneratingScreen] Transcript:', transcript);
    console.log('📏 [GeneratingScreen] Length:', transcript?.length || 0);

    try {
      const params = new URLSearchParams(location.search);
      const payload = {
        transcript,
        ...(params.get('biz') && { business_name: params.get('biz') }),
        ...(params.get('hood') && { neighbourhood: params.get('hood') }),
      };

      console.log('📤 [GeneratingScreen] Sending to API:', payload);
      console.log('🌐 [GeneratingScreen] API URL: /api/voice-generate');

      const response = await fetch(`/api/voice-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📥 [GeneratingScreen] Response status:', response.status);
      console.log('📥 [GeneratingScreen] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [GeneratingScreen] API error:', response.status, errorText);
        throw new Error('Voice generation failed');
      }

      const data = await response.json();
      console.log('✅ [GeneratingScreen] API response data:', data);
      console.log('📝 [GeneratingScreen] Generated review:', data.review);
      console.log('🤖 [GeneratingScreen] Model used:', data.model);

      const reviewText = data.review || transcript;

      console.log('💾 [GeneratingScreen] Setting review to:', reviewText);
      setReview(reviewText);

      console.log('🧹 [GeneratingScreen] Resetting transcript store');
      resetTranscript();

      // Copy to clipboard with fallbacks
      await copyWithFallbacks(reviewText);

      console.log('🚀 [GeneratingScreen] Navigating to: review');
      go('review');
      console.log('✅ [GeneratingScreen] Navigation complete');
    } catch (err) {
      console.error('❌ [GeneratingScreen] Voice generation error:', err);
      console.log('🔄 [GeneratingScreen] Using fallback transcript');

      const fallbackText = transcript && transcript.trim().length > 0
        ? transcript
        : 'Thank you for your feedback. Please try again.';

      console.log('💾 [GeneratingScreen] Fallback text:', fallbackText);
      setReview(fallbackText);

      console.log('🧹 [GeneratingScreen] Resetting transcript store');
      resetTranscript();

      // Copy to clipboard with fallbacks
      await copyWithFallbacks(fallbackText);

      console.log('🚀 [GeneratingScreen] Navigating to: review');
      go('review');
      console.log('✅ [GeneratingScreen] Navigation complete');
    }
  }

  function handleGameGeneration() {
    const params = new URLSearchParams(location.search);

    const visitType = game.visitType ?? 'first_time';
    const itemsOrdered = game.menuItems.length > 0 ? game.menuItems : ['coffee'];

    const tempAnswer = game.swipeAnswers.find((a) => a.questionId === 'temperature_right');
    const busynessAnswer = game.swipeAnswers.find((a) => a.questionId === 'busyness');
    const worthAnswer = game.swipeAnswers.find((a) => a.questionId === 'worth_price');

    const sensoryChips: string[] = tempAnswer?.positive ? ['served_hot'] : ['fresh'];

    const waitAnswer = game.swipeAnswers.find((a) => a.questionId === 'wait_feeling');
    let disappointmentChip = 'nothing_perfect';
    if (tempAnswer && !tempAnswer.positive) disappointmentChip = 'temperature';
    else if (waitAnswer && !waitAnswer.positive) disappointmentChip = 'wait_too_long';

    const swipeCards = [tempAnswer, worthAnswer].filter(Boolean);
    const swipePositiveCount = swipeCards.filter((a) => a!.positive).length;
    const productScore = swipeCards.length > 0
      ? Math.round((swipePositiveCount / swipeCards.length) * 10)
      : 7;

    const vibeIdMap: Record<string, string> = {
      cozy: 'quiet_calm',
      work: 'work_friendly',
      instagram: 'great_looking',
      quiet: 'quiet_calm',
      music: 'has_music',
      energizing: 'energizing',
      cool: 'cool_refreshing',
      social: 'social_buzzing',
    };
    const vibeAnswers = game.swipeAnswers.filter((a) => a.questionId.startsWith('vibe_') && a.positive);
    const vibeChips = vibeAnswers
      .map((a) => vibeIdMap[a.questionId.replace('vibe_', '')])
      .filter(Boolean);
    if (busynessAnswer?.positive && !vibeChips.includes('social_buzzing')) vibeChips.push('social_buzzing');
    else if (busynessAnswer && !busynessAnswer.positive && !vibeChips.includes('quiet_calm')) vibeChips.push('quiet_calm');
    const finalVibeChips = vibeChips.length > 0 ? vibeChips : ['work_friendly'];

    let occasion = 'treating_myself';
    if (vibeAnswers.some((a) => a.questionId === 'vibe_work')) occasion = 'work_break';
    else if (vibeAnswers.some((a) => a.questionId === 'vibe_social')) occasion = 'catching_up';
    else if (vibeAnswers.some((a) => a.questionId === 'vibe_cozy')) occasion = 'morning_routine';

    const returnJar = game.slingshotAnswers.find((a) => a.questionId === 'return');
    const valueJar = game.slingshotAnswers.find((a) => a.questionId === 'value');
    const recommendJar = game.slingshotAnswers.find((a) => a.questionId === 'recommend');

    const returnIntentMap: Record<string, string> = {
      'Definitely returning!': 'definitely',
      'My new regular': 'always',
      'Maybe someday': 'probably',
      'Once was enough': 'barely',
    };
    const comparisonMap: Record<string, string> = {
      'Worth every penny': 'better_than_usual',
      'Great value!': 'new_regular',
      'A bit pricey': 'usual_still_wins',
      'Overpriced': 'usual_still_wins',
    };
    const recommendForMap: Record<string, string> = {
      'Highly recommend!': 'catching_up',
      'Must try!': 'catching_up',
      'Not for everyone': 'solo_work',
      'Would skip': 'solo_work',
    };

    const returnIntentFromJar = returnJar?.phrase ? (returnIntentMap[returnJar.phrase] || 'definitely') : null;
    const returnIntentFromBasketball = game.basketballAnswer?.scored ? 'definitely' : 'probably';
    const finalReturnIntent = returnIntentFromJar ?? returnIntentFromBasketball;

    const worthChip = worthAnswer
      ? (worthAnswer.positive ? 'better_than_usual' : 'usual_still_wins')
      : 'better_than_usual';
    const finalComparison = valueJar?.phrase ? (comparisonMap[valueJar.phrase] || worthChip) : worthChip;
    const recommendFor = recommendJar?.phrase ? (recommendForMap[recommendJar.phrase] || 'quick_break') : 'quick_break';

    const selectedPhrases = game.slingshotAnswers.map((a) => a.phrase).filter(Boolean);

    let overallScore = productScore;
    if (finalReturnIntent === 'barely') overallScore = Math.min(overallScore, 4);
    if (finalReturnIntent === 'always') overallScore = Math.max(overallScore, 8);
    overallScore = Math.max(1, Math.min(10, overallScore));

    const payload = {
      business_name: params.get('biz') || 'this spot',
      neighbourhood: params.get('hood') || 'downtown',
      visit_type: visitType,
      occasion,
      items_ordered: itemsOrdered,
      product_sentiment: overallScore >= 7 ? 'loved_it' : overallScore >= 5 ? 'it_was_good' : 'not_what_i_expected',
      sensory_chips: sensoryChips,
      overall_score: overallScore,
      disappointment_chip: disappointmentChip,
      return_intent: finalReturnIntent,
      comparison_chip: finalComparison,
      vibe_chips: finalVibeChips,
      recommend_for: recommendFor,
      selected_phrases: selectedPhrases,
    };

    fetch(`/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        const reviewText = data.review || '';
        setReview(reviewText);
        
        // Copy to clipboard with fallbacks
        if (reviewText) {
          copyWithFallbacks(reviewText);
        }
        
        go('review');
      })
      .catch(() => {
        setReview('');
        go('review');
      });
  }

  return (
    <ScreenShell className="items-center justify-center text-center" hideProgress hideBack>
      {/* Hidden textarea for clipboard fallback */}
      <textarea
        ref={hiddenInputRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          display: 'none',
        }}
        readOnly
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Branded spinner — 8-dot ring, coffee brown dots */}
      <div className="mb-8">
        <BrandedSpinner />
      </div>

      {/* Cycling status messages */}
      <div className="h-7 relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIdx}
            className="text-body font-medium text-ink-secondary"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {STATUS_MESSAGES[messageIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-8 text-caption text-ink-tertiary">
        This usually takes a few seconds
      </p>
    </ScreenShell>
  );
}
