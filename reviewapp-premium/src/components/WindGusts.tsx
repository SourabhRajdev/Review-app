import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ══════════════════════════════════════════════════════════════════════════════
// 🌬️  HAND-DRAWN TAPERED WIND ANIMATION
// ══════════════════════════════════════════════════════════════════════════════

interface Gust {
  id: string;
  path: string;
  top: number;
  left: number;
  scale: number;
  delay: number;
  duration: number;
  strokeWidth: number;
  opacity: number;
}

interface WindGustsProps {
  direction: 'left' | 'right' | 'calm';
  strength: 'calm' | 'light' | 'medium' | 'strong';
  visible?: boolean;
}

// Generate varied Bezier curve paths for organic wind streaks
function generateWindPath(direction: 'left' | 'right'): string {
  const isLeft = direction === 'left';
  const startX = isLeft ? 100 : 0;
  const endX = isLeft ? 0 : 100;
  
  // Random control points for varied curviness
  const cp1X = startX + (endX - startX) * (0.2 + Math.random() * 0.2);
  const cp1Y = 20 + Math.random() * 60;
  const cp2X = startX + (endX - startX) * (0.5 + Math.random() * 0.2);
  const cp2Y = 20 + Math.random() * 60;
  const cp3X = startX + (endX - startX) * (0.7 + Math.random() * 0.2);
  const cp3Y = 20 + Math.random() * 60;
  
  // Use cubic Bezier for smooth, natural curves
  return `M ${startX} 50 C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${cp3X} ${cp3Y} T ${endX} 50`;
}

function generateGusts(
  direction: 'left' | 'right',
  strength: 'calm' | 'light' | 'medium' | 'strong',
  count: number
): Gust[] {
  const gusts: Gust[] = [];
  
  for (let i = 0; i < count; i++) {
    const duration = strength === 'strong' ? 0.8 + Math.random() * 0.4 :
                     strength === 'medium' ? 1.0 + Math.random() * 0.5 :
                     1.2 + Math.random() * 0.6;
    
    gusts.push({
      id: `gust-${Date.now()}-${i}`,
      path: generateWindPath(direction),
      top: Math.random() * 80 + 10, // 10% to 90% from top
      left: direction === 'left' ? 100 + Math.random() * 20 : -20 - Math.random() * 20,
      scale: 0.8 + Math.random() * 0.8, // 0.8 to 1.6 (larger)
      delay: Math.random() * 0.8,
      duration,
      strokeWidth: 3 + Math.random() * 3, // 3 to 6 (much thicker)
      opacity: 0.5 + Math.random() * 0.3, // 0.5 to 0.8 (much more visible)
    });
  }
  
  return gusts;
}

export default function WindGusts({ direction, strength, visible = true }: WindGustsProps) {
  const [gusts, setGusts] = useState<Gust[]>([]);
  
  // Determine gust count based on strength (increased for visibility)
  const gustCount = strength === 'calm' ? 0 :
                    strength === 'light' ? 8 :
                    strength === 'medium' ? 12 :
                    15; // strong
  
  // Generate new gusts periodically
  useEffect(() => {
    if (!visible || direction === 'calm' || gustCount === 0) {
      setGusts([]);
      return;
    }
    
    // Initial gusts
    setGusts(generateGusts(direction, strength, gustCount));
    
    // Regenerate gusts periodically for continuous effect
    const interval = setInterval(() => {
      setGusts(generateGusts(direction, strength, gustCount));
    }, 2000); // New batch every 2 seconds
    
    return () => clearInterval(interval);
  }, [direction, strength, visible, gustCount]);
  
  if (!visible || direction === 'calm' || gusts.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 4 }}>
      {gusts.map((gust) => (
        <motion.div
          key={gust.id}
          className="absolute"
          style={{
            top: `${gust.top}%`,
            left: `${gust.left}%`,
            width: '120%',
            height: '100px',
            transform: `scale(${gust.scale})`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, gust.opacity * 1.2, gust.opacity * 1.2, 0] }}
          transition={{
            duration: gust.duration,
            delay: gust.delay,
            ease: 'easeInOut',
          }}
        >
          <svg
            width="100%"
            height="100"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ overflow: 'visible' }}
          >
            {/* Main streak */}
            <motion.path
              d={gust.path}
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth={gust.strokeWidth}
              strokeLinecap="round"
              fill="none"
              initial={{
                pathLength: 0,
                pathOffset: 0,
              }}
              animate={{
                pathLength: [0, 0.4, 0.4, 0],
                pathOffset: [0, 0, 0.6, 1],
              }}
              transition={{
                duration: gust.duration,
                delay: gust.delay,
                ease: 'easeOut',
                pathLength: {
                  times: [0, 0.2, 0.8, 1],
                  ease: 'easeOut',
                },
                pathOffset: {
                  times: [0, 0.2, 0.8, 1],
                  ease: 'easeOut',
                },
              }}
              style={{
                filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.6))',
              }}
            />
            
            {/* Shadow/outline for more visibility */}
            <motion.path
              d={gust.path}
              stroke="rgba(200, 220, 240, 0.4)"
              strokeWidth={gust.strokeWidth + 2}
              strokeLinecap="round"
              fill="none"
              initial={{
                pathLength: 0,
                pathOffset: 0,
              }}
              animate={{
                pathLength: [0, 0.4, 0.4, 0],
                pathOffset: [0, 0, 0.6, 1],
              }}
              transition={{
                duration: gust.duration,
                delay: gust.delay,
                ease: 'easeOut',
                pathLength: {
                  times: [0, 0.2, 0.8, 1],
                  ease: 'easeOut',
                },
                pathOffset: {
                  times: [0, 0.2, 0.8, 1],
                  ease: 'easeOut',
                },
              }}
              style={{
                filter: 'blur(3px)',
              }}
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
