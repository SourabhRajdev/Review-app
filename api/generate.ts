import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGuide, getApiKey, callGemini, CORS_HEADERS } from './_shared';

const SYSTEM_PROMPT = `You are the Review Generation Engine for a gamified customer review capture system
built for restaurants and cafes.

Your one job: receive structured input signals captured from a customer's gameplay
session and generate a single, 3-sentence Google review that sounds like a real
person wrote it — because a real person gave every signal that went into it.

WHAT YOU ARE NOT
You are not a copywriter. You are not a survey summariser. You are not a marketing tool.
You are not allowed to fabricate, invent, or invert any signal you receive.

WHAT YOU ARE
You are a translator. A customer played games in under 90 seconds. Every tap, swipe,
drag, and aim they made was a data point. You take those data points and translate them
into a review that the customer reads and thinks: "yeah, that's what I meant."

You operate according to REVIEW_GENERATION_GUIDE.md. That document is your constitution.

THE 3-SENTENCE ARCHITECTURE
Every review has exactly 3 sentences. No more. No fewer.

SENTENCE 1 — THE ANCHOR: business_name + neighbourhood + occasion context. Does not start with "I". 12–18 words.
SENTENCE 2 — THE PRODUCT SIGNAL: exact menu item + business_name + neighbourhood + sensory descriptor(s). 12–22 words.
SENTENCE 3 — THE CLOSER: comparative signal + return intent. 8–16 words.

Total: 35–60 words maximum.

THE ABSOLUTE RULES
Never start with "I". Never use: amazing, wonderful, delightful, fantastic, incredible, exceptional, outstanding, superb, phenomenal, best ever, top-notch, world-class.
Never invert a signal. Never fabricate details. Never exceed 3 sentences or 54 words.
Never use exclamation marks. Never use em dashes. Use commas, "but", "and", or "though" instead.
Past tense only. No competitor names. No template openers.
Output ONLY the 3 sentences. No labels, no quotes, no metadata.

NOW WAIT FOR INPUT.`;

function buildSignalsJson(signals: Record<string, unknown>): string {
  return JSON.stringify({
    business_name: signals.business_name || null,
    neighbourhood: signals.neighbourhood || null,
    visit_type: signals.visit_type || null,
    occasion: signals.occasion || null,
    items_ordered: signals.items_ordered || [],
    product_sentiment: signals.product_sentiment || null,
    sensory_chips: signals.sensory_chips || [],
    overall_score: signals.overall_score ?? null,
    disappointment_chip: signals.disappointment_chip || 'nothing_perfect',
    return_intent: signals.return_intent || null,
    comparison_chip: signals.comparison_chip || null,
    vibe_chips: signals.vibe_chips || [],
    recommend_for: signals.recommend_for || null
  }, null, 2);
}

function localFallback(s: Record<string, unknown>): string {
  const biz = String(s.business_name || 'this spot');
  const hood = s.neighbourhood ? ` ${s.neighbourhood}` : '';
  const item = (s.items_ordered as string[])?.[0] || 'what we ordered';
  const sensory = ((s.sensory_chips as string[]) || []).slice(0, 2).join(' and ') || 'fresh and well-made';
  const comp = String(s.comparison_chip || 'better_than_usual');
  const returnIntent = String(s.return_intent || 'definitely');

  const occasion = s.occasion ? String(s.occasion).replace(/_/g, ' ') : 'a quick visit';
  const s1 = s.visit_type === 'returning'
    ? `Back at ${biz}${hood} for ${occasion} and it still hits.`
    : `Stopped into ${biz}${hood} for ${occasion} and it was exactly what was needed.`;

  const disappointment = s.disappointment_chip && s.disappointment_chip !== 'nothing_perfect'
    ? ` — ${String(s.disappointment_chip).replace(/_/g, ' ')} but worth it`
    : '';
  const s2 = `The ${item} was ${sensory}${disappointment}.`;

  const compMap: Record<string, string> = {
    new_regular: `My new regular in${hood}.`,
    better_than_usual: 'Better than my usual spot by a decent margin.',
    best_in_area: `Best ${item} in${hood}, no question.`,
    usual_still_wins: 'Good, though my usual spot still edges it.',
    unique_nothing_like_it: 'Nothing like it nearby.'
  };
  const returnMap: Record<string, string> = {
    barely: 'Might stop in if passing by.',
    probably: 'Will be back.',
    definitely: 'Already planning the next visit.',
    always: `Not going anywhere else for ${item}.`
  };
  const s3 = compMap[comp] || returnMap[returnIntent] || 'Worth the stop.';

  return [s1, s2, s3].join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const signals = req.body || {};

    if (!getApiKey()) {
      return res.json({ review: localFallback(signals), model: 'local-fallback' });
    }

    const guide = getGuide();
    if (!guide) {
      console.error('REVIEW_GENERATION_GUIDE.md not loaded');
      return res.json({ review: localFallback(signals), model: 'local-fallback', warning: 'Guide not available' });
    }

    const signalsJson = buildSignalsJson(signals);
    const review = (await callGemini(SYSTEM_PROMPT, signalsJson, guide)) || localFallback(signals);
    res.json({ review, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('generate error:', message);
    res.status(200).json({
      review: localFallback(req.body || {}),
      model: 'local-fallback',
      warning: 'AI call failed'
    });
  }
}
