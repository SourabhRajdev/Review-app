import { AnimatePresence } from 'framer-motion';
import { useNavigation } from './screens/useNavigation';
import EntryScreen from './screens/EntryScreen';
import AboutYouScreen from './screens/AboutYouScreen';
import OrderSelectionScreen from './screens/OrderSelectionScreen';
import ProductGameScreen from './screens/ProductGameScreen';
import Round2Screen from './screens/Round2Screen';
import BasketballScreen from './screens/BasketballScreen';
import VibeGameScreen from './screens/VibeGameScreen';
import SlingshotGameScreen from './screens/SlingshotGameScreen';
import SwipeGameScreen from './screens/SwipeGameScreen';
import BubblePopScreen from './screens/BubblePopScreen';
import ServiceGameScreen from './screens/ServiceGameScreen';
import SparkSliceScreen from './screens/SparkSliceScreen';
import ShellGameScreen from './screens/ShellGameScreen';
import SpinWheelScreen from './screens/SpinWheelScreen';
import GeneratingScreen from './screens/GeneratingScreen';
import ReviewScreen from './screens/ReviewScreen';

export default function App() {
  const current = useNavigation((s) => s.current);

  return (
    <div className="w-full min-h-[100dvh] bg-bg font-sans">
      <AnimatePresence>
        {/* ── Easy mode flow ── */}
        {current === 'entry' && <EntryScreen key="entry" />}
        {current === 'aboutYou' && <AboutYouScreen key="aboutYou" />}
        {current === 'orderSelection' && <OrderSelectionScreen key="orderSelection" />}
        {current === 'productGame' && <ProductGameScreen key="productGame" />}
        {current === 'round2' && <Round2Screen key="round2" />}
        {current === 'basketball' && <BasketballScreen key="basketball" />}
        {current === 'vibeGame' && <VibeGameScreen key="vibeGame" />}
        {current === 'slingshotGame' && <SlingshotGameScreen key="slingshotGame" />}

        {/* ── Shared / alternate screens ── */}
        {current === 'swipeGame' && <SwipeGameScreen key="swipeGame" />}
        {current === 'bubblePop' && <BubblePopScreen key="bubblePop" />}
        {current === 'serviceGame' && <ServiceGameScreen key="serviceGame" />}
        {current === 'sparkSlice' && <SparkSliceScreen key="sparkSlice" />}
        {current === 'shellGame' && <ShellGameScreen key="shellGame" />}
        {current === 'spinWheel' && <SpinWheelScreen key="spinWheel" />}
        {current === 'generating' && <GeneratingScreen key="generating" />}
        {current === 'review' && <ReviewScreen key="review" />}
      </AnimatePresence>
    </div>
  );
}
