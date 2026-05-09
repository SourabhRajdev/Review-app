import { randomInt } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CORS_HEADERS } from './_shared.js';

// Win probability per performance tier (inverted — losing players get more luck)
const WIN_THRESHOLD: Record<string, number> = {
  high: 25,  // already performed well → harder to win spin wheel
  mid:  40,
  low:  60,  // pity mechanic — losing players get best odds
};

function nearMissSlot(userPick: number): number {
  if (userPick === 0) return 1;
  if (userPick === 2) return 1;
  return randomInt(0, 2) === 0 ? 0 : 2; // pick 0 or 2, biased away from 1
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const tier = (['high', 'mid', 'low'].includes(req.body?.tier) ? req.body.tier : 'mid') as string;
  const userPick = Number(req.body?.userPick);

  if (![0, 1, 2].includes(userPick)) return res.status(400).json({ error: 'Invalid pick' });

  const roll = randomInt(0, 100);
  const threshold = WIN_THRESHOLD[tier] ?? 40;

  if (roll < threshold) {
    return res.status(200).json({ result: 'win', ballAt: userPick });
  } else {
    return res.status(200).json({ result: 'lose', ballAt: nearMissSlot(userPick) });
  }
}
