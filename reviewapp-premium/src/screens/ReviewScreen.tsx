import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useReviewStore } from './reviewStore';
import PrimaryButton from '@/components/PrimaryButton';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers that block clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export default function ReviewScreen() {
  const text = useReviewStore((s) => s.text);
  const updateText = useReviewStore((s) => s.updateText);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [autoCopied, setAutoCopied] = useState(false);
  const autoCopyDone = useRef(false);

  const displayText = text?.trim() ? text : 'Your review will appear here.';

  const googleUrl =
    new URLSearchParams(location.search).get('gurl') ||
    'https://www.google.com/maps/place/Pure+Bean+Sharjah/@25.3057642,55.4684157,17z/data=!4m8!3m7!1s0x3e5f5fcd5f1573e1:0xb41d6947ccc86718!8m2!3d25.3057642!4d55.4684157!9m1!1b1!16s%2Fg%2F11yn5kcwp2?entry=ttu&g_ep=EgoyMDI2MDQwOC4wIKXMDSoASAFQAw%3D%3D';

  // Auto-copy as soon as a real review is available.
  // 400ms delay: lets the page animation settle and ensures document focus
  // is established after navigation — clipboard API blocks on unfocused pages.
  useEffect(() => {
    if (autoCopyDone.current) return;
    const t = text?.trim();
    if (!t) return;
    autoCopyDone.current = true;
    const timer = setTimeout(() => {
      copyToClipboard(t).then(() => {
        setAutoCopied(true);
        audio.bullseye();
        haptics.impact();
        setTimeout(() => setAutoCopied(false), 3000);
      }).catch(() => {
        // Clipboard blocked (e.g. browser policy) — silently ignore,
        // user can still tap "Copy Review" manually
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [text]);

  async function handleCopy() {
    const t = text?.trim() ? text : displayText;
    await copyToClipboard(t);
    setCopied(true);
    audio.bullseye();
    haptics.impact();
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEditStart() {
    audio.tap();
    haptics.press();
    setEditValue(text || '');
    setIsEditing(true);
  }

  async function handleEditSave() {
    audio.tap();
    haptics.press();
    updateText(editValue);
    setIsEditing(false);
    // Auto-copy the updated text immediately
    await copyToClipboard(editValue);
    setCopied(true);
    audio.bullseye();
    haptics.impact();
    setTimeout(() => setCopied(false), 2500);
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

        {/* Auto-copy indicator */}
        <AnimatePresence mode="wait">
          {autoCopied ? (
            <motion.p key="copied"
              className="text-body-sm text-success font-medium"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}>
              Copied to clipboard
            </motion.p>
          ) : (
            <motion.p key="subtitle"
              className="text-body-sm text-ink-secondary"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}>
              Tap to edit, then paste and post.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Review card */}
      <div className="w-full rounded-card bg-surface border border-ink-ghost/20 shadow-card overflow-hidden mb-5">
        <div className="h-0.5 w-full bg-primary" />
        <div className="p-5">
          {isEditing ? (
            <textarea
              className="w-full bg-transparent text-body leading-relaxed text-ink resize-none border-0 outline-none min-h-[140px] w-full"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
          ) : (
            <p className="text-body leading-relaxed text-ink min-h-[80px] whitespace-pre-line">
              {displayText}
            </p>
          )}
        </div>

        {/* Edit / Save row */}
        <div className="px-5 pb-4 flex justify-end">
          {isEditing ? (
            <button
              onClick={handleEditSave}
              className="text-micro text-primary font-semibold"
            >
              Save &amp; Copy
            </button>
          ) : (
            <button
              onClick={handleEditStart}
              className="text-micro text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Copy CTA */}
      <PrimaryButton onClick={handleCopy}>
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

      {/* Platform link */}
      <div className="mt-3">
        <motion.button
          className="w-full rounded-button bg-surface border border-ink-ghost/20 px-4 py-3 text-body-sm font-semibold text-ink shadow-card cursor-pointer hover:shadow-elevated transition-shadow duration-200 flex items-center justify-center gap-2"
          whileTap={tapScale.whileTap}
          onClick={() => window.open(googleUrl, '_blank', 'noopener')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#4285F4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Post on Google
        </motion.button>
      </div>

      <p className="text-center text-ink-tertiary text-caption mt-4 mb-8">
        Paste the copied text and hit post.
      </p>
    </ScreenShell>
  );
}
