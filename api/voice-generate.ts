import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const SYSTEM_PROMPT = `You are a review generation engine. The customer will give you a raw voice transcript of their experience at a restaurant or café.

Your job:
1. Read the transcript and extract every signal: business name, location, items ordered, vibe, sentiment, return intent.
2. Write exactly 3 sentences as a natural Google review.

RULES (absolute):
- Exactly 3 sentences. No more, no less.
- 35-54 words total.
- Never start with "I".
- No banned words: amazing, wonderful, delightful, fantastic, incredible, awesome.
- No exclamation marks.
- No em dashes (— or --). Use commas or "but" instead.
- Past tense for the experience.
- Plain text only. No labels, no quotes, no bullet points.
- Sentence 2 MUST mention a specific item and the place name.
- Sentence 3 MUST contain a comparative or return-intent signal.
- NEVER invent a business name. Use only what the customer said.
- Output ONLY the 3 sentences separated by newlines. Nothing else.`;

async function callGemini(transcript: string, bizName: string, hood: string): Promise<string> {
  const meta = [bizName && `Business: ${bizName}`, hood && `Location: ${hood}`].filter(Boolean).join('\n');
  const userPrompt = `VOICE TRANSCRIPT:\n"""\n${transcript.trim()}\n"""${meta ? `\n\nMETADATA (supplement only):\n${meta}` : ''}\n\nGenerate the 3-sentence review now.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_API_KEY}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.85,
        topP: 0.95,
      },
    }),
  });

  if (!r.ok) {
    const errBody = await r.text();
    throw new Error(`Gemini ${r.status}: ${errBody}`);
  }
  const data = await r.json();
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text || '')
    .join('')
    .trim();
}

function sanitize(raw: string): string {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const sentences = lines.filter(l => /[.!?]$/.test(l)).slice(0, 3);
  return (sentences.length >= 2 ? sentences : lines.slice(0, 3)).join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { transcript, business_name = '', neighbourhood = '' } = req.body || {};

  if (!transcript?.trim()) return res.status(400).json({ error: 'transcript required' });
  if (!GEMINI_API_KEY) return res.status(200).json({ review: transcript.trim(), model: 'no-key' });

  try {
    const raw = await callGemini(transcript, business_name, neighbourhood);
    const review = sanitize(raw);
    if (!review) return res.status(200).json({ review: transcript.trim(), model: 'empty-response' });
    return res.status(200).json({ review, model: GEMINI_MODEL });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('voice-generate error:', msg);
    return res.status(200).json({ review: transcript.trim(), model: 'error-fallback', error: msg });
  }
}
