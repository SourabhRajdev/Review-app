import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useReviewStore } from './reviewStore';
import PrimaryButton from '@/components/PrimaryButton';
import BlurFade from '@/components/BlurFade';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// ── Clipboard helper ──
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
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

// ── Confetti — Framer Motion only, brand colors, fires once on mount ──
const CONFETTI_COLORS = ['#F59E0B', '#FCD34D', '#0D9E6F', '#D97706', '#C67C4E', '#FCD34D'];

function ReviewConfetti() {
  const particles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 5 + Math.random() * 7,
      tx: (Math.random() - 0.5) * 340,
      ty: -(Math.random() * 220) - 40,
      rotation: Math.random() * 720 - 360,
      delay: Math.random() * 0.25,
      shape: (Math.random() > 0.5 ? 'circle' : 'rect') as 'circle' | 'rect',
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: '50%',
            top: '30%',
            width: p.size,
            height: p.shape === 'circle' ? p.size : p.size * 1.7,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            x: p.tx,
            y: [p.ty, p.ty + 450],
            opacity: [1, 1, 0],
            rotate: p.rotation,
            scale: [0, 1.3, 1, 0.4],
          }}
          transition={{
            duration: 2,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
            y: { duration: 2.2, ease: 'easeIn', delay: p.delay },
            opacity: { duration: 2.2, delay: p.delay },
          }}
        />
      ))}
    </div>
  );
}

export default function ReviewScreen() {
  const text = useReviewStore((s) => s.text);
  const updateText = useReviewStore((s) => s.updateText);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [showCopied, setShowCopied] = useState(true); // Show immediately on mount
  const [showConfetti, setShowConfetti] = useState(true);
  const [userEdited, setUserEdited] = useState(false);

  const displayText = text?.trim() ? text : 'Your review will appear here.';

  const googleUrl =
    new URLSearchParams(location.search).get('gurl') ||
    'https://www.google.com/maps/place/Pure+Bean+Sharjah/@25.3057642,55.4684157,17z/data=!4m8!3m7!1s0x3e5f5fcd5f1573e1:0xb41d6947ccc86718!8m2!3d25.3057642!4d55.4684157!9m1!1b1!16s%2Fg%2F11yn5kcwp2?entry=ttu&g_ep=EgoyMDI2MDQwOC4wIKXMDSoASAFQAw%3D%3D';

  // Dismiss confetti after 2.5s
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // Dismiss "Copied!" indicator after 2.5s
  useEffect(() => {
    const t = setTimeout(() => setShowCopied(false), 2500);
    return () => clearTimeout(t);
  }, []);

  async function handleCopy() {
    const t = text?.trim() ? text : displayText;
    await copyToClipboard(t);
    setShowCopied(true);
    setCopied(true);
    audio.bullseye();
    haptics.impact();
    setTimeout(() => {
      setShowCopied(false);
      setCopied(false);
    }, 2000);
  }

  function handleEditStart() {
    audio.tap();
    haptics.press();
    setEditValue(text || '');
    setIsEditing(true);
    setUserEdited(true); // Mark that user has edited
  }

  async function handleEditSave() {
    audio.tap();
    haptics.press();
    updateText(editValue);
    setIsEditing(false);
    await copyToClipboard(editValue);
    setShowCopied(true);
    setCopied(true);
    audio.bullseye();
    haptics.impact();
    setTimeout(() => {
      setShowCopied(false);
      setCopied(false);
    }, 2500);
  }

  return (
    <ScreenShell hideProgress hideBack>
      {/* Confetti burst on mount */}
      <AnimatePresence>
        {showConfetti && <ReviewConfetti />}
      </AnimatePresence>

      {/* Header — animated sequence */}
      <div className="mt-8 mb-6 text-center">
        {/* Success badge — emerald on white */}
        <motion.div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'rgba(13,158,111,0.08)',
            border: '1px solid rgba(13,158,111,0.25)',
            boxShadow: '0 4px 20px rgba(13,158,111,0.15)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24, delay: 0.1 }}
        >
          <motion.svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0D9E6F"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          >
            <path d="M5 13l4 4L19 7" />
          </motion.svg>
        </motion.div>

        {/* BlurFade heading */}
        <BlurFade
          text="Your review is ready"
          delay={0.2}
          className="text-display text-ink mb-2"
        />

        {/* Auto-copy indicator */}
        <AnimatePresence mode="wait">
          {showCopied ? (
            <motion.p
              key="copied"
              className="text-body-sm font-medium"
              style={{ color: '#0D9E6F' }}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            >
              ✓ Review copied to clipboard
            </motion.p>
          ) : (
            <motion.p
              key="subtitle"
              className="text-body-sm text-ink-secondary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              Tap to edit, then paste and post.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Review card — white with coffee brand accent top bar */}
      <motion.div
        className="w-full rounded-card overflow-hidden mb-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(200,170,140,0.2)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Coffee gradient top bar — brand payoff moment */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #C67C4E 30%, #E8B896 50%, #C67C4E 70%, transparent 100%)' }} />

        <div className="p-5">
          {isEditing ? (
            <textarea
              className="w-full text-body leading-relaxed text-ink resize-none border-0 outline-none min-h-[140px]"
              style={{ background: 'transparent' }}
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
              className="text-micro text-primary font-semibold hover:text-primary-hover transition-colors cursor-pointer"
            >
              Save &amp; Copy
            </button>
          ) : (
            <button
              onClick={handleEditStart}
              className="text-micro text-ink-tertiary hover:text-primary transition-colors cursor-pointer"
            >
              Edit
            </button>
          )}
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Copy CTA — coffee gradient — always visible */}
        <PrimaryButton onClick={handleCopy}>
          {copied ? (
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </span>
          ) : (
            userEdited ? 'Copy Edited Review' : 'Copy Review'
          )}
        </PrimaryButton>

        {/* Google link — white card with border */}
        <motion.button
          className="w-full rounded-button px-4 py-3.5 text-body-sm font-semibold text-ink cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid rgba(200,170,140,0.35)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
          whileTap={tapScale.whileTap}
          whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)' }}
          onClick={() => window.open(googleUrl, '_blank', 'noopener')}
        >
          {/* Google G logo */}
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Post on Google
        </motion.button>
      </motion.div>

      <p className="text-center text-ink-tertiary text-caption mt-4 mb-8">
        Paste the copied text and hit post.
      </p>
    </ScreenShell>
  );
}
