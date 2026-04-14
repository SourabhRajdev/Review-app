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

export default function GeneratingScreen() {
  const go = useNavigation((s) => s.go);
  const game = useGameStore();
  const setReview = useReviewStore((s) => s.setReview);
  const transcript = useTranscriptStore((s) => s.transcript);
  const resetTranscript = useTranscriptStore((s) => s.reset);
  const called = useRef(false);
  const [messageIdx, setMessageIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

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
      
      console.log('🚀 [GeneratingScreen] Navigating to: review');
      go('review');
      console.log('✅ [GeneratingScreen] Navigation complete');
    }
  }

  function handleGameGeneration() {
    const params = new URLSearchParams(location.search);
    const swipePositive = game.swipeAnswers.filter((a) => a.positive);
    const slingshotPhrases = game.slingshotAnswers.map((a) => a.phrase).filter(Boolean);
    const returnAnswer = game.slingshotAnswers.find((a) => a.questionId === 'return');
    const compareAnswer = game.slingshotAnswers.find((a) => a.questionId === 'compare');
    const occasionAnswer = game.slingshotAnswers.find((a) => a.questionId === 'occasion');

    const vibeChips: string[] = [];
    swipePositive.forEach((a) => {
      if (a.questionId.startsWith('vibe_')) vibeChips.push(a.questionId.replace('vibe_', ''));
    });

    const visitTypeAnswer = game.swipeAnswers.find((a) => a.questionId === 'visit_type');
    const visitType = visitTypeAnswer ? (visitTypeAnswer.positive ? 'returning' : 'first_time') : 'first_time';
    const occasionPhraseMap: Record<string, string> = {
      'Morning ritual stop': 'morning_routine',
      'Been wanting to try': 'passing_by',
      'Friend recommended it': 'catching_up',
      'Planned visit': 'treating_myself',
      'Just walked past': 'passing_by',
      'Killing time': 'work_break',
      'Random discovery': 'passing_by',
      'Curiosity got me': 'passing_by',
    };
    let occasion = occasionAnswer?.phrase
      ? (occasionPhraseMap[occasionAnswer.phrase] || 'passing_by')
      : 'passing_by';

    const totalQuestions = game.swipeAnswers.length + game.slingshotAnswers.length;
    const positiveCount = swipePositive.length + game.slingshotAnswers.filter((a) => a.positive).length;
    let overallScore = totalQuestions > 0 ? Math.round((positiveCount / totalQuestions) * 10) : 7;

    const experienceAnswer = game.swipeAnswers.find((a) => a.questionId === 'experience');
    const staffAnswer = game.swipeAnswers.find((a) => a.questionId === 'staff');

    let finalVibeChips = vibeChips.length > 0 ? vibeChips : ['work_friendly'];
    let finalSensoryChips = game.sensoryChips.length > 0 ? game.sensoryChips : ['fresh'];
    let finalReturnIntent = returnAnswer ? (returnAnswer.positive ? 'definitely' : 'probably') : 'definitely';
    let finalComparisonChip = compareAnswer
      ? (compareAnswer.positive ? 'better_than_usual' : 'usual_still_wins')
      : 'better_than_usual';

    const dartsResult = game.hardGameResults.find((r) => r.gameId === 'darts');
    const stackResult = game.hardGameResults.find((r) => r.gameId === 'stackTower');
    const sliceResult = game.hardGameResults.find((r) => r.gameId === 'sparkSlice');

    if (dartsResult && typeof dartsResult.signalValue === 'string') occasion = dartsResult.signalValue;
    if (stackResult && Array.isArray(stackResult.signalValue) && stackResult.signalValue.length > 0)
      finalVibeChips = stackResult.signalValue;
    if (sliceResult && Array.isArray(sliceResult.signalValue) && sliceResult.signalValue.length > 0)
      finalSensoryChips = sliceResult.signalValue;

    const basketball = game.basketballAnswer;
    if (basketball) {
      const recommendMap: Record<string, string> = {
        absolutely: 'always',
        probably: 'definitely',
        maybe: 'probably',
        not_sure: 'barely',
      };
      finalReturnIntent = recommendMap[basketball.selectedOption] || finalReturnIntent;
    }

    if (game.hardGameResults.length > 0) {
      const avgPct = game.hardGameResults.reduce((acc, r) => acc + r.scorePercent, 0) / game.hardGameResults.length;
      overallScore = Math.max(1, Math.min(10, Math.round((avgPct / 100) * 10)));
    }

    const payload = {
      business_name: params.get('biz') || 'this spot',
      neighbourhood: params.get('hood') || 'downtown',
      visit_type: visitType,
      occasion,
      items_ordered: game.menuItems.length > 0 ? game.menuItems : ['coffee'],
      product_sentiment: overallScore >= 7 ? 'loved_it' : overallScore >= 5 ? 'it_was_good' : 'not_what_i_expected',
      sensory_chips: finalSensoryChips,
      overall_score: overallScore,
      disappointment_chip: experienceAnswer && !experienceAnswer.positive
        ? 'wait_too_long'
        : staffAnswer && !staffAnswer.positive
          ? 'staff_inattentive'
          : 'nothing_perfect',
      return_intent: finalReturnIntent,
      comparison_chip: finalComparisonChip,
      vibe_chips: finalVibeChips,
      recommend_for: game.perfectFor === 'friends' ? 'catching_up' : (game.perfectFor || 'quick_break'),
      selected_phrases: slingshotPhrases,
    };

    fetch(`/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log('[GeneratingScreen] Game generation API response:', data);
        setReview(data.review || '');
        go('review');
      })
      .catch((err) => {
        console.error('[GeneratingScreen] Game generation network error:', err);
        setReview('');
        go('review');
      });
  }

  return (
    <ScreenShell className="items-center justify-center text-center" hideProgress hideBack>
      {/* Simple spinner */}
      <div className="relative w-16 h-16 mx-auto mb-8">
        <svg className="w-16 h-16 animate-spin-slow" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#D6D3D1" strokeWidth="3" />
          <path
            d="M32 4a28 28 0 0128 28"
            stroke="#B8622D"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Cycling status */}
      <div className="h-7 relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIdx}
            className="text-body text-ink-secondary"
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
