import { randomInt } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CORS_HEADERS } from './_shared.js';

const PRIZES = [
  { label: 'Free Coffee',   emoji: '☕', tier: 'jackpot' },
  { label: 'Free Dessert',  emoji: '🍰', tier: 'rare' },
  { label: '30% Off',       emoji: '🎁', tier: 'rare' },
  { label: '20% Off',       emoji: '✨', tier: 'uncommon' },
  { label: '10% Off',       emoji: '🏅', tier: 'common' },
  { label: 'Size Upgrade',  emoji: '⬆',  tier: 'common' },
  { label: '5% Off',        emoji: '🌟', tier: 'very_common' },
];

// Weights sum to 1,000,000 per tier.
// Better play (higher luck score) = better prizes more often.
const LUCK_WEIGHTS: Record<string, number[]> = {
  cold: [1000,   5000,  20000,  70000, 170000, 280000, 454000],
  warm: [5000,  20000,  60000, 140000, 250000, 270000, 255000],
  hot:  [10000, 50000, 100000, 200000, 280000, 230000, 130000],
  fire: [30000, 100000, 170000, 250000, 250000, 140000, 60000],
};

function scoreToTier(score: number): string {
  if (score <= 25) return 'cold';
  if (score <= 50) return 'warm';
  if (score <= 75) return 'hot';
  return 'fire';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawScore = Number(req.body?.luckScore);
  const luckScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
  const tierKey = scoreToTier(luckScore);
  const weights = LUCK_WEIGHTS[tierKey];

  const roll = randomInt(0, 1_000_000);
  let cumulative = 0;
  let prizeIdx = weights.length - 1;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) { prizeIdx = i; break; }
  }

  return res.status(200).json({ prizeIdx, prize: PRIZES[prizeIdx], tier: tierKey, luckScore });
}
