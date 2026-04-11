// Tinder-style swipe card — swipe right for Yes, left for No.
// Adapted from cafe-menu-magic, restyled for our warm cafe palette.

import { useRef, useState, useCallback, useEffect } from 'react';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

interface Props {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  leftLabel?: string;
  rightLabel?: string;
  children: React.ReactNode;
}

const THRESHOLD = 60;
const VELOCITY_THRESHOLD = 0.4;

export default function SwipeCard({
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Nope',
  rightLabel = 'Yes!',
  children,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyOut, setFlyOut] = useState<'left' | 'right' | null>(null);
  const [settled, setSettled] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocityRef = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasFired = useRef(false);

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (flyOut || hasFired.current) return;
      setIsDragging(true);
      setSettled(false);
      isHorizontal.current = null;
      startX.current = clientX;
      startY.current = clientY;
      lastX.current = clientX;
      lastTime.current = Date.now();
      velocityRef.current = 0;
    },
    [flyOut]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || flyOut || hasFired.current) return;

      if (isHorizontal.current === null) {
        const dx = Math.abs(clientX - startX.current);
        const dy = Math.abs(clientY - startY.current);
        if (dx > 5 || dy > 5) {
          isHorizontal.current = dx > dy;
          if (!isHorizontal.current) {
            setIsDragging(false);
            setOffset(0);
            return;
          }
        } else {
          return;
        }
      }

      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) velocityRef.current = (clientX - lastX.current) / dt;
      lastX.current = clientX;
      lastTime.current = now;
      setOffset(clientX - startX.current);
    },
    [isDragging, flyOut]
  );

  const fire = useCallback(
    (direction: 'left' | 'right') => {
      if (hasFired.current) return;
      hasFired.current = true;
      setFlyOut(direction);
      haptics.tick();
      audio.tick();

      setTimeout(() => {
        if (direction === 'right') onSwipeRight();
        else onSwipeLeft();
      }, 220);
    },
    [onSwipeLeft, onSwipeRight]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging || hasFired.current) return;
    setIsDragging(false);

    const absOffset = Math.abs(offset);
    const absVelocity = Math.abs(velocityRef.current);

    if (absOffset > THRESHOLD || (absVelocity > VELOCITY_THRESHOLD && absOffset > 20)) {
      fire(offset > 0 ? 'right' : 'left');
    } else {
      setOffset(0);
      setSettled(true);
    }
  }, [isDragging, offset, fire]);

  useEffect(() => {
    hasFired.current = false;
    setFlyOut(null);
    setOffset(0);
    setSettled(false);
  }, []);

  const rotation = offset * 0.06;
  const leftOpacity = Math.min(Math.abs(Math.min(offset, 0)) / THRESHOLD, 1);
  const rightOpacity = Math.min(Math.max(offset, 0) / THRESHOLD, 1);

  const getTransform = () => {
    if (flyOut === 'right') return 'translateX(120%) rotate(14deg)';
    if (flyOut === 'left') return 'translateX(-120%) rotate(-14deg)';
    return `translateX(${offset}px) rotate(${rotation}deg)`;
  };

  return (
    <div
      ref={cardRef}
      onPointerDown={(e) => {
        e.preventDefault();
        cardRef.current?.setPointerCapture(e.pointerId);
        handleStart(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => handleMove(e.clientX, e.clientY)}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      style={{
        transform: getTransform(),
        transition: isDragging
          ? 'none'
          : flyOut
            ? 'transform 0.22s cubic-bezier(0.4, 0, 1, 1), opacity 0.22s ease'
            : settled
              ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'transform 0.2s ease',
        opacity: flyOut ? 0.4 : 1,
        willChange: 'transform',
      }}
      className="relative touch-none select-none cursor-grab active:cursor-grabbing"
    >
      {/* Nope indicator */}
      <div
        className="absolute -top-3 right-4 z-10 rounded-full px-4 py-1.5 text-sm font-bold pointer-events-none border-2"
        style={{
          opacity: leftOpacity,
          transform: `scale(${0.8 + leftOpacity * 0.2})`,
          borderColor: '#DC2626',
          color: '#DC2626',
          background: 'rgba(220,38,38,0.1)',
        }}
      >
        {leftLabel}
      </div>

      {/* Yes indicator */}
      <div
        className="absolute -top-3 left-4 z-10 rounded-full px-4 py-1.5 text-sm font-bold pointer-events-none border-2"
        style={{
          opacity: rightOpacity,
          transform: `scale(${0.8 + rightOpacity * 0.2})`,
          borderColor: '#4CAF50',
          color: '#4CAF50',
          background: 'rgba(76,175,80,0.1)',
        }}
      >
        {rightLabel}
      </div>

      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow:
            rightOpacity > 0
              ? `0 0 ${20 + rightOpacity * 20}px rgba(76,175,80,${rightOpacity * 0.3})`
              : leftOpacity > 0
                ? `0 0 ${20 + leftOpacity * 20}px rgba(220,38,38,${leftOpacity * 0.3})`
                : 'none',
        }}
      />

      {children}
    </div>
  );
}
