import { AnimatePresence } from 'framer-motion';
import { useNavigation } from './screens/useNavigation';
import EntryScreen from './screens/EntryScreen';
import VoiceEntryScreen from './screens/VoiceEntryScreen';
import TranscriptReviewScreen from './screens/TranscriptReviewScreen';
import SwipeGameScreen from './screens/SwipeGameScreen';
import ConveyorBeltScreen from './screens/ConveyorBeltScreen';
import BubblePopScreen from './screens/BubblePopScreen';
import SlingshotGameScreen from './screens/SlingshotGameScreen';
import VibeGameScreen from './screens/VibeGameScreen';
import ServiceGameScreen from './screens/ServiceGameScreen';
import DartsScreen from './screens/DartsScreen';
import StackTowerScreen from './screens/StackTowerScreen';
import SparkSliceScreen from './screens/SparkSliceScreen';
import BasketballScreen from './screens/BasketballScreen';
import GeneratingScreen from './screens/GeneratingScreen';
import ReviewScreen from './screens/ReviewScreen';

export default function App() {
  const current = useNavigation((s) => s.current);

  return (
    <div className="w-full min-h-[100dvh] bg-bg font-sans">
      <AnimatePresence mode="wait">
        {current === 'entry' && <EntryScreen key="entry" />}
        {current === 'voiceEntry' && <VoiceEntryScreen key="voiceEntry" />}
        {current === 'transcriptReview' && <TranscriptReviewScreen key="transcriptReview" />}
        {current === 'swipeGame' && <SwipeGameScreen key="swipeGame" />}
        {current === 'conveyorBelt' && <ConveyorBeltScreen key="conveyorBelt" />}
        {current === 'bubblePop' && <BubblePopScreen key="bubblePop" />}
        {current === 'slingshotGame' && <SlingshotGameScreen key="slingshotGame" />}
        {current === 'vibeGame' && <VibeGameScreen key="vibeGame" />}
        {current === 'serviceGame' && <ServiceGameScreen key="serviceGame" />}
        {current === 'darts' && <DartsScreen key="darts" />}
        {current === 'stackTower' && <StackTowerScreen key="stackTower" />}
        {current === 'sparkSlice' && <SparkSliceScreen key="sparkSlice" />}
        {current === 'basketball' && <BasketballScreen key="basketball" />}
        {current === 'generating' && <GeneratingScreen key="generating" />}
        {current === 'review' && <ReviewScreen key="review" />}
      </AnimatePresence>
    </div>
  );
}
