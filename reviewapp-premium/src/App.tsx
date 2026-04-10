import { AnimatePresence } from 'framer-motion';
import { useNavigation } from './screens/useNavigation';
import EntryScreen from './screens/EntryScreen';
import VoiceEntryScreen from './screens/VoiceEntryScreen';
import TranscriptReviewScreen from './screens/TranscriptReviewScreen';
import VisitTypeScreen from './screens/VisitTypeScreen';
import OccasionScreen from './screens/OccasionScreen';
import MenuScreen from './screens/MenuScreen';
import SensoryChipsScreen from './screens/SensoryChipsScreen';
import ExperienceChoiceScreen from './screens/ExperienceChoiceScreen';
import DisappointmentScreen from './screens/DisappointmentScreen';
import ReturnChoiceScreen from './screens/ReturnChoiceScreen';
import ComparisonScreen from './screens/ComparisonScreen';
import BonusScreen from './screens/BonusScreen';
import GeneratingScreen from './screens/GeneratingScreen';
import ReviewScreen from './screens/ReviewScreen';

export default function App() {
  const current = useNavigation((s) => s.current);

  return (
    <div className="w-full min-h-[100dvh] bg-surface font-body">
      <AnimatePresence mode="wait">
        {current === 'entry' && <EntryScreen key="entry" />}
        {current === 'voiceEntry' && <VoiceEntryScreen key="voiceEntry" />}
        {current === 'transcriptReview' && <TranscriptReviewScreen key="transcriptReview" />}
        {current === 'visitType' && <VisitTypeScreen key="visitType" />}
        {current === 'occasion' && <OccasionScreen key="occasion" />}
        {current === 'menu' && <MenuScreen key="menu" />}
        {current === 'sensoryChips' && <SensoryChipsScreen key="sensoryChips" />}
        {current === 'experienceChoice' && <ExperienceChoiceScreen key="experienceChoice" />}
        {current === 'disappointment' && <DisappointmentScreen key="disappointment" />}
        {current === 'returnChoice' && <ReturnChoiceScreen key="returnChoice" />}
        {current === 'comparison' && <ComparisonScreen key="comparison" />}
        {current === 'bonus' && <BonusScreen key="bonus" />}
        {current === 'generating' && <GeneratingScreen key="generating" />}
        {current === 'review' && <ReviewScreen key="review" />}
      </AnimatePresence>
    </div>
  );
}
