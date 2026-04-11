// SLINGSHOT COMPONENT
// Visual representation of a slingshot that stretches based on pull values
// IMPORTANT: Pocket stretches OPPOSITE to aim direction (pull back to shoot forward)

interface SlingshotProps {
  pullX: number; // -1 to 1 (negative = aim left/NO, positive = aim right/YES)
  pullY: number; // 0 to 1 (how far pulled back)
  isDragging: boolean;
  fired: boolean;
}

export default function Slingshot({ pullX, pullY, isDragging, fired }: SlingshotProps) {
  const forkLeft = -22;
  const forkRight = 22;
  const forkTop = -38;
  const baseY = 32;

  // Pocket stretches OPPOSITE to aim direction
  const maxPull = 55;
  const pocketX = -pullX * maxPull * 0.5; // Negative to invert direction
  const pocketY = pullY * maxPull;
  const pocketCx = pocketX;
  const pocketCy = pocketY + 5;

  const tension = isDragging ? pullY : 0;

  // Band curves with natural sag
  const leftBandMidX = forkLeft + (pocketCx - forkLeft) * 0.45 - tension * 6;
  const leftBandMidY = forkTop + (pocketCy - forkTop) * 0.55 + tension * 4;
  const rightBandMidX = forkRight + (pocketCx - forkRight) * 0.45 + tension * 6;
  const rightBandMidY = forkTop + (pocketCy - forkTop) * 0.55 + tension * 4;

  const bandThickness = 3 + tension * 1.5;

  return (
    <svg width="140" height="140" viewBox="-70 -58 140 140" className="pointer-events-none">
      <defs>
        <linearGradient id="woodMain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4943A" />
          <stop offset="50%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#5E450D" />
        </linearGradient>
        <linearGradient id="bandRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E74C3C" />
          <stop offset="50%" stopColor="#C0392B" />
          <stop offset="100%" stopColor="#922B21" />
        </linearGradient>
        <radialGradient id="stoneGrad" cx="35%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#B0B0B0" />
          <stop offset="40%" stopColor="#808080" />
          <stop offset="100%" stopColor="#333333" />
        </radialGradient>
        <linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8D6E4C" />
          <stop offset="50%" stopColor="#6D4C33" />
          <stop offset="100%" stopColor="#4E342E" />
        </linearGradient>
      </defs>

      {/* Handle */}
      <rect x="-7" y="-2" width="14" height={baseY + 8} rx="4" fill="url(#woodMain)" />
      <rect x="-6" y="0" width="3" height={baseY + 4} rx="2" fill="#A47A2E" opacity="0.3" />

      {/* Left fork */}
      <path
        d={`M -5 0 C -14 ${forkTop + 18} -20 ${forkTop + 8} ${forkLeft} ${forkTop}`}
        stroke="url(#woodMain)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={forkLeft} cy={forkTop} r="6" fill="url(#woodMain)" />
      <circle cx={forkLeft} cy={forkTop} r="2.5" fill="#5E450D" />

      {/* Right fork */}
      <path
        d={`M 5 0 C 14 ${forkTop + 18} 20 ${forkTop + 8} ${forkRight} ${forkTop}`}
        stroke="url(#woodMain)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={forkRight} cy={forkTop} r="6" fill="url(#woodMain)" />
      <circle cx={forkRight} cy={forkTop} r="2.5" fill="#5E450D" />

      {/* Left elastic band */}
      <path
        d={`M ${forkLeft} ${forkTop} Q ${leftBandMidX} ${leftBandMidY} ${pocketCx - 7} ${pocketCy}`}
        stroke="url(#bandRed)"
        strokeWidth={bandThickness}
        strokeLinecap="round"
        fill="none"
      />

      {/* Right elastic band */}
      <path
        d={`M ${forkRight} ${forkTop} Q ${rightBandMidX} ${rightBandMidY} ${pocketCx + 7} ${pocketCy}`}
        stroke="url(#bandRed)"
        strokeWidth={bandThickness}
        strokeLinecap="round"
        fill="none"
      />

      {/* Leather pouch */}
      <ellipse
        cx={pocketCx}
        cy={pocketCy}
        rx="10"
        ry="6"
        fill="url(#leather)"
        stroke="#3E2723"
        strokeWidth="0.8"
      />

      {/* Stone in pocket */}
      {!fired && (
        <g>
          <circle
            cx={pocketCx}
            cy={pocketCy - 2}
            r={isDragging ? 7.5 : 7}
            fill="url(#stoneGrad)"
            stroke="#333"
            strokeWidth="0.5"
          />
          <circle
            cx={pocketCx - 2}
            cy={pocketCy - 4}
            r="2"
            fill="white"
            opacity="0.25"
          />
        </g>
      )}
    </svg>
  );
}
