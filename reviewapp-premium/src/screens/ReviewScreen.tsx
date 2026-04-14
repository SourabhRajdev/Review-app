import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useReviewStore } from './reviewStore';
import PrimaryButton from '@/components/PrimaryButton';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

export default function ReviewScreen() {
  const text = useReviewStore((s) => s.text);
  const updateText = useReviewStore((s) => s.updateText);
  const [copied, setCopied] = useState(false);

  // Log on mount
  useEffect(() => {
    console.log('🔥 [ReviewScreen] MOUNTED');
    console.log('📝 [ReviewScreen] Review text:', text);
    console.log('📏 [ReviewScreen] Text length:', text?.length || 0);
  }, []);

  // NO AUTO REDIRECTS - always render something
  const displayText = text && text.trim().length > 0 
    ? text 
    : 'Your review will appear here.';

  const googleUrl =
    new URLSearchParams(location.search).get('gurl') ||
    'https://www.google.com/maps/place/Pure+Bean+Sharjah/@25.3057642,55.4684157,17z/data=!4m8!3m7!1s0x3e5f5fcd5f1573e1:0xb41d6947ccc86718!8m2!3d25.3057642!4d55.4684157!9m1!1b1!16s%2Fg%2F11yn5kcwp2?entry=ttu&g_ep=EgoyMDI2MDQwOC4wIKXMDSoASAFQAw%3D%3D';
  const tripUrl =
    new URLSearchParams(location.search).get('turl') ||
    'https://www.tripadvisor.com/UserReview';

  async function handleCopy() {
    console.log('[ReviewScreen] Copying review text:', displayText);
    try {
      await navigator.clipboard.writeText(displayText);
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
      {/* Header */}
      <div className="mt-8 mb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-display text-ink mb-1">Your review is ready</h2>
        <p className="text-body-sm text-ink-secondary">Tap to edit, then copy and post.</p>
      </div>

      {/* Review card */}
      <div className="w-full rounded-card bg-surface border border-ink-ghost/20 shadow-card overflow-hidden">
        <div className="h-0.5 w-full bg-primary" />
        <div className="p-5">
          <textarea
            className="w-full bg-transparent text-body leading-relaxed text-ink resize-none border-0 outline-none min-h-[180px]"
            value={displayText}
            onChange={(e) => updateText(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Copy CTA */}
      <div className="mt-5">
        <PrimaryButton
          onClick={handleCopy}
          variant={copied ? 'primary' : 'primary'}
        >
          {copied ? (
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </span>
          ) : (
            'Copy Review'
          )}
        </PrimaryButton>
      </div>

      {/* Platform links */}
      <div className="flex gap-3 mt-3">
        <motion.button
          className="flex-1 rounded-button bg-surface border border-ink-ghost/20 px-4 py-3 text-body-sm font-semibold text-ink shadow-card cursor-pointer hover:shadow-elevated transition-shadow duration-200 flex items-center justify-center gap-2"
          whileTap={tapScale.whileTap}
          onClick={() => window.open(googleUrl, '_blank', 'noopener')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#4285F4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </motion.button>
        <motion.button
          className="flex-1 rounded-button bg-surface border border-ink-ghost/20 px-4 py-3 text-body-sm font-semibold text-ink shadow-card cursor-pointer hover:shadow-elevated transition-shadow duration-200 flex items-center justify-center gap-2"
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
      </div>

      <p className="text-center text-ink-tertiary text-caption mt-4 mb-8">
        Paste the copied text and hit post.
      </p>
    </ScreenShell>
  );
}
