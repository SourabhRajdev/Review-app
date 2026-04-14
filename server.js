import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY || '';
// Server-side only — never exposed to the browser bundle
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';

// Configure multer for handling audio uploads
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ───────── Guide cache (LRU-style: read once, refresh on file change) ─────────
const GUIDE_PATH = path.join(
  __dirname,
  'reviewapp-premium',
  'src',
  'architecture',
  'REVIEW_GENERATION_GUIDE.md'
);
const guideCache = { text: '', mtimeMs: 0, checkedAt: 0 };
const CACHE_TTL_MS = 30_000; // re-stat every 30s, only re-read if file changed

async function getGuide() {
  const now = Date.now();
  if (guideCache.text && now - guideCache.checkedAt < CACHE_TTL_MS) {
    return guideCache.text;
  }
  try {
    const stat = await fs.stat(GUIDE_PATH);
    if (stat.mtimeMs !== guideCache.mtimeMs || !guideCache.text) {
      guideCache.text = await fs.readFile(GUIDE_PATH, 'utf8');
      guideCache.mtimeMs = stat.mtimeMs;
      console.log('guide cache: refreshed from disk');
    }
    guideCache.checkedAt = now;
  } catch (err) {
    console.warn('guide cache: file not found, using empty', err?.message);
  }
  return guideCache.text;
}

const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

async function ensureSessionsFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(SESSIONS_FILE);
  } catch {
    await fs.writeFile(SESSIONS_FILE, '[]');
  }
}

async function appendSession(record) {
  await ensureSessionsFile();
  const raw = await fs.readFile(SESSIONS_FILE, 'utf8');
  const arr = JSON.parse(raw || '[]');
  arr.push(record);
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(arr, null, 2));
}

// ------- System prompt: full review generation spec from REVIEW_GENERATION_GUIDE.md -------
const SYSTEM_PROMPT = `You are the Review Generation Engine. Your complete operating specification is in REVIEW_GENERATION_GUIDE.md, provided below. Read every section of it before generating.

INPUT TYPE: Structured JSON signals captured from a customer's gameplay session at a restaurant or café.

Your job:
1. Receive the JSON signals object.
2. Run the full generation algorithm from REVIEW_GENERATION_GUIDE.md §6 exactly as written, using every rule, chip map, tone table, and example in that document.
3. Output ONLY the final 3-sentence review — nothing else. No checklist, no reasoning, no metadata, no labels, no commentary. Just the 3 sentences separated by newlines.`;

// Map frontend signal names to the REVIEW_GENERATION_GUIDE schema names
// and build a clean JSON object to send as the user message.
function buildSignalsJson(signals) {
  const obj = {
    business_name:       signals.business_name || null,
    neighbourhood:       signals.neighbourhood || null,
    visit_type:          signals.visit_type || null,
    occasion:            signals.occasion || null,
    items_ordered:       signals.items_ordered || [],
    product_sentiment:   signals.product_sentiment || null,
    sensory_chips:       signals.sensory_chips || [],
    overall_score:       signals.overall_score ?? null,
    disappointment_chip: signals.disappointment_chip || 'nothing_perfect',
    return_intent:       signals.return_intent || null,
    comparison_chip:     signals.comparison_chip || null,
    vibe_chips:          signals.vibe_chips || [],
    recommend_for:       signals.recommend_for || null,
  };
  // Include slingshot phrases as extra context for linguistic variety
  if (Array.isArray(signals.selected_phrases) && signals.selected_phrases.length > 0) {
    obj.selected_phrases = signals.selected_phrases;
  }
  return JSON.stringify(obj, null, 2);
}

async function callGemini(systemPrompt, userPrompt, guideText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL
  )}:generateContent?key=${GEMINI_API_KEY}`;

  // System instruction = operating prompt + full guide as grounding reference.
  // Two parts: the first tells Gemini what to do, the second is the source of
  // truth it must follow (REVIEW_GENERATION_GUIDE.md). This eliminates
  // hallucination because every rule, chip map, and example is in context.
  const systemParts = [{ text: systemPrompt }];
  if (guideText) {
    systemParts.push({
      text: `--- REVIEW_GENERATION_GUIDE.md (SOURCE OF TRUTH — follow every rule below) ---\n\n${guideText}`
    });
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: systemParts },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        // 2.5 Flash counts internal "thinking" tokens against this budget,
        // so we give it real headroom for the visible review.
        maxOutputTokens: 400,
        temperature: 0.85,
        topP: 0.95,
        // Disable thinking — this is short structured creative writing,
        // thinking just burns the token budget for no quality gain.
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`gemini ${r.status}: ${body}`);
  }

  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();
  return text || '';
}

// ───────── VOICE PATH: transcript → structured SEO review ─────────
// The frontend calls this when the user records a voice transcript and
// selects "Polish with AI".  We send the transcript to Gemini together
// with the full REVIEW_GENERATION_GUIDE.md so the output follows the
// exact 3-sentence SEO architecture.

const VOICE_SYSTEM_PROMPT = `You are the Review Generation Engine. Your complete operating specification is in REVIEW_GENERATION_GUIDE.md, provided below. Read every section of it before generating.

INPUT TYPE: Raw customer voice transcript.

Your job:
1. Extract every signal present in the transcript (business name, location, items, sentiment, vibe, occasion, return intent, comparisons, sensory details). Use only what the customer actually said — never invent signals.
2. For signals absent from the transcript, apply the defaults defined in REVIEW_GENERATION_GUIDE.md §2.
3. Run the full generation algorithm from REVIEW_GENERATION_GUIDE.md §6 exactly as written.
4. Output ONLY the final 3-sentence review — nothing else. No checklist, no reasoning, no metadata, no labels, no commentary. Just the 3 sentences separated by newlines.`;

// Strip any Gemini meta-output: checklists, confidence scores, constraint blocks, etc.
// Also enforce guide invariants that Gemini occasionally ignores.
function sanitizeReview(raw) {
  if (!raw) return '';

  // Replace em dashes (—, --, –) with ", " as the guide requires
  let text = raw
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/\s*–\s*/g, ', ');

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const clean = lines.filter(l => {
    if (/^\d+\.\s/.test(l)) return false;           // numbered list items
    if (/^\*\*/.test(l)) return false;              // bold markdown
    if (/^[-*•]\s/.test(l)) return false;           // bullet points
    if (/confidence score/i.test(l)) return false;
    if (/constraint/i.test(l)) return false;
    if (/checklist/i.test(l)) return false;
    if (/\bN\/A\b/.test(l)) return false;
    if (/^(yes|no|n\/a)\b/i.test(l)) return false;
    if (/here is/i.test(l)) return false;
    if (/^review:/i.test(l)) return false;
    return true;
  });

  // Take the first 3 sentence-like lines (end with . ! ?)
  const sentences = clean.filter(l => /[.!?]$/.test(l)).slice(0, 3);
  return sentences.length >= 2 ? sentences.join('\n') : clean.slice(0, 3).join('\n');
}

// Minimum signal check: transcript must have enough substance to generate a review
function hasEnoughSignals(transcript) {
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 1);
  return words.length >= 5;
}

app.post('/api/voice-generate', async (req, res) => {
  try {
    const { transcript } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    if (!hasEnoughSignals(transcript)) {
      return res.status(422).json({
        error: 'insufficient_signals',
        message: 'Not enough detail to write a review. Try saying what you had, where you were, or how it felt.'
      });
    }

    if (!GEMINI_API_KEY) {
      return res.json({
        review: transcript.trim(),
        model: 'local-fallback',
        warning: 'No API key — returned raw transcript'
      });
    }

    const guide = await getGuide();
    if (!guide) {
      console.error('CRITICAL: REVIEW_GENERATION_GUIDE.md not loaded — refusing to generate without it');
      return res.status(500).json({
        error: 'Review generation guide not available. Cannot generate SEO review without it.',
        review: transcript.trim(),
        model: 'none'
      });
    }
    console.log('Using REVIEW_GENERATION_GUIDE (%d chars)', guide.length);
    console.log('Transcript:', transcript.substring(0, 120));

    // Pull optional business metadata from body — no hardcoded defaults.
    // The AI extracts the business name and location from the transcript itself.
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
Extract ALL signals (business name, location, items, sentiment, vibe, etc.) directly from the transcript above. Generate the 3-sentence SEO review following REVIEW_GENERATION_GUIDE.md exactly. Output ONLY the 3 sentences.`;

    const raw = await callGemini(VOICE_SYSTEM_PROMPT, userPrompt, guide);
    const review = sanitizeReview(raw || '');
    console.log('Generated:', review);

    if (!review) {
      return res.json({
        review: transcript.trim(),
        model: 'local-fallback',
        warning: 'AI returned empty — used raw transcript'
      });
    }

    res.json({ review, model: MODEL });
  } catch (err) {
    console.error('voice-generate error:', err?.message || err);
    res.status(200).json({
      review: (req.body?.transcript || '').trim(),
      model: 'local-fallback',
      warning: 'AI call failed, used raw transcript'
    });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const signals = req.body || {};

    if (!GEMINI_API_KEY) {
      // Fallback so the app remains demoable without an API key.
      return res.json({
        review: localFallbackReview(signals),
        model: 'local-fallback'
      });
    }

    const signalsJson = buildSignalsJson(signals);
    const guide = await getGuide();
    if (!guide) {
      console.error('CRITICAL: REVIEW_GENERATION_GUIDE.md not loaded — falling back to local generation');
      return res.json({
        review: localFallbackReview(signals),
        model: 'local-fallback',
        warning: 'Guide file not available — used local fallback'
      });
    }
    console.log('Using REVIEW_GENERATION_GUIDE (%d chars)', guide.length);
    const raw = await callGemini(SYSTEM_PROMPT, signalsJson, guide);
    const review = sanitizeReview(raw || '') || localFallbackReview(signals);

    res.json({ review, model: MODEL });
  } catch (err) {
    console.error('generate error:', err?.message || err);
    res.status(200).json({
      review: localFallbackReview(req.body || {}),
      model: 'local-fallback',
      warning: 'AI call failed, used local fallback'
    });
  }
});

// Proxy endpoint for NVIDIA Whisper API to avoid CORS issues
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ error: 'NVIDIA API key not configured on server' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('Received audio file:', req.file.size, 'bytes, type:', req.file.mimetype);

    // Create FormData for NVIDIA API
    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', audioBlob, 'audio.webm');
    
    console.log('Calling NVIDIA Whisper API...');

    const response = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: formData
    });

    const responseText = await response.text();
    console.log('NVIDIA API response:', response.status, responseText.substring(0, 200));

    if (!response.ok) {
      console.error('NVIDIA API error:', response.status, responseText);
      return res.status(response.status).json({ error: responseText });
    }

    const data = JSON.parse(responseText);
    console.log('Transcription successful:', data.text?.substring(0, 100));
    res.json(data);
  } catch (err) {
    console.error('Transcribe error:', err?.message || err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

app.post('/api/session', async (req, res) => {
  try {
    const record = {
      ...req.body,
      receivedAt: new Date().toISOString()
    };
    await appendSession(record);
    res.json({ ok: true });
  } catch (err) {
    console.error('session error:', err?.message || err);
    res.status(500).json({ ok: false });
  }
});

// Simple analytics endpoint for the business dashboard.
app.get('/api/sessions', async (_req, res) => {
  try {
    await ensureSessionsFile();
    const raw = await fs.readFile(SESSIONS_FILE, 'utf8');
    res.json(JSON.parse(raw || '[]'));
  } catch (err) {
    res.status(500).json({ error: err?.message || 'failed' });
  }
});

// Local fallback — 3-sentence architecture matching the review generation guide.
function localFallbackReview(s) {
  const biz = s.business_name || 'this spot';
  const hood = s.neighbourhood ? ` ${s.neighbourhood}` : '';
  const item = (s.items_ordered && s.items_ordered[0]) || 'what we ordered';
  const sensory = (s.sensory_chips || []).slice(0, 2).join(' and ') || 'fresh and well-made';
  const comp = s.comparison_chip || 'better_than_usual';
  const returnIntent = s.return_intent || s.putt_power_label || 'definitely';

  // Sentence 1 — THE ANCHOR: business + neighbourhood + occasion
  const occasion = s.occasion
    ? s.occasion.replace(/_/g, ' ')
    : 'a quick visit';
  const s1 =
    s.visit_type === 'returning'
      ? `Back at ${biz}${hood} for ${occasion} and it still hits.`
      : `Stopped into ${biz}${hood} for ${occasion} and it was exactly what was needed.`;

  // Sentence 2 — THE PRODUCT SIGNAL: exact item + sensory descriptors
  const disappointment = s.disappointment_chip && s.disappointment_chip !== 'nothing_perfect'
    ? ` — ${s.disappointment_chip.replace(/_/g, ' ')} but worth it`
    : '';
  const s2 = `The ${item} was ${sensory}${disappointment}.`;

  // Sentence 3 — THE CLOSER: comparison + return intent
  const compMap = {
    new_regular: `My new regular in${hood}.`,
    better_than_usual: 'Better than my usual spot by a decent margin.',
    best_in_area: `Best ${item} in${hood}, no question.`,
    usual_still_wins: 'Good, though my usual spot still edges it.',
    unique_nothing_like_it: 'Nothing like it nearby.'
  };
  const returnMap = {
    barely: 'Might stop in if passing by.',
    probably: 'Will be back.',
    definitely: 'Already planning the next visit.',
    always: `Not going anywhere else for ${item}.`
  };
  const s3 = compMap[comp] || returnMap[returnIntent] || 'Worth the stop.';

  return [s1, s2, s3].join('\n');
}


// ───────── AssemblyAI real-time token exchange ─────────
// Browser WebSocket cannot send custom Authorization headers, so we exchange
// the raw API key here (server-side) for a short-lived session token.
// Frontend calls GET /api/voice-token → gets a token → passes it as ?token=
// in the WebSocket URL. Token expires after 5 minutes.
app.get('/api/voice-token', async (_req, res) => {
  if (!ASSEMBLYAI_API_KEY) {
    return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY not configured on server' });
  }
  try {
    // The /v2/realtime/token endpoint requires a higher-tier plan.
    // On the current plan, the raw API key authenticates directly via ?token= query param.
    // This endpoint keeps the key off the browser bundle — swap to token exchange when available.
    console.log('AssemblyAI voice token issued (raw key passthrough)');
    res.json({ token: ASSEMBLYAI_API_KEY });
  } catch (err) {
    console.error('voice-token error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate voice token' });
  }
});

app.listen(PORT, () => {
  console.log(`reviewapp listening on http://localhost:${PORT}`);
  console.log(`model: ${MODEL}`);
  console.log(`gemini key: ${GEMINI_API_KEY ? 'configured' : 'NOT set — using local fallback'}`);
});
