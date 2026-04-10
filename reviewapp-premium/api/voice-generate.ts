import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGuide, getApiKey, callGemini, CORS_HEADERS } from './_shared';

const VOICE_SYSTEM_PROMPT = `You are the Review Generation Engine described in REVIEW_GENERATION_GUIDE.md (provided separately).

Your task:
1. Read the customer's raw voice transcript below.
2. Extract EVERY signal you can identify from the transcript itself:
   - business_name: Extract the exact name the customer mentions. If no business name is mentioned, use "this spot".
   - neighbourhood / location: Extract any area, street, or neighbourhood mentioned. If none, omit it.
   - items_ordered: Extract exact menu items mentioned.
   - sensory descriptors, vibe, occasion, sentiment, disappointment, return intent, comparison cues.
3. For signals not found in the transcript, use reasonable defaults:
   - disappointment_chip: default to "nothing_perfect"
   - comparison_chip: default to "better_than_usual"
   - return_intent: infer from tone; default to "probably"
4. If business_name or neighbourhood are provided in the metadata below the transcript, use those ONLY as a supplement.
5. Follow the REVIEW_GENERATION_GUIDE.md generation algorithm exactly:
   STEP 1 -> validate extracted signals
   STEP 2 -> determine tone
   STEP 3 -> build Sentence 1 (THE ANCHOR)
   STEP 4 -> build Sentence 2 (THE PRODUCT SIGNAL)
   STEP 5 -> build Sentence 3 (THE CLOSER)
   STEP 6 -> verify all 9 SEO signals and invariants
   STEP 7 -> run the human test
   STEP 8 -> output

OUTPUT RULES (absolute):
- Exactly 3 sentences. No more.
- 35-54 words total.
- Never start with "I".
- No banned words (amazing, wonderful, delightful, fantastic, incredible, etc.).
- No exclamation marks.
- NEVER use em dashes. Use commas, "but", "and", or "though" instead.
- Past tense for the experience.
- Plain text only. No labels, no quotes. Just the 3 sentences separated by newlines.
- Sentence 2 MUST mention the exact item "at [business_name] [neighbourhood/location]".
- Sentence 3 MUST contain a comparative signal.
- NEVER invent a business name. Use ONLY what the customer said or what is in the metadata.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { transcript } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    if (!getApiKey()) {
      return res.json({
        review: transcript.trim(),
        model: 'local-fallback',
        warning: 'No API key'
      });
    }

    const guide = getGuide();
    if (!guide) {
      console.error('REVIEW_GENERATION_GUIDE.md not loaded');
      return res.status(500).json({
        error: 'Guide not available',
        review: transcript.trim(),
        model: 'none'
      });
    }

    const bizName = req.body.business_name || '';
    const hood = req.body.neighbourhood || '';

    const metadataBlock = (bizName || hood)
      ? `\nSUPPLEMENTARY METADATA (use only if the transcript does not mention a business name or location):\n${bizName ? `business_name: ${bizName}\n` : ''}${hood ? `neighbourhood: ${hood}\n` : ''}`
      : '';

    const userPrompt = `CUSTOMER VOICE TRANSCRIPT:
"""
${transcript.trim()}
"""
${metadataBlock}
Extract ALL signals directly from the transcript above. Generate the 3-sentence SEO review following REVIEW_GENERATION_GUIDE.md exactly. Output ONLY the 3 sentences.`;

    const review = await callGemini(VOICE_SYSTEM_PROMPT, userPrompt, guide);

    if (!review) {
      return res.json({
        review: transcript.trim(),
        model: 'local-fallback',
        warning: 'AI returned empty'
      });
    }

    res.json({ review, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('voice-generate error:', message);
    res.status(200).json({
      review: (req.body?.transcript || '').trim(),
      model: 'local-fallback',
      warning: 'AI call failed'
    });
  }
}
