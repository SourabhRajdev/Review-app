import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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
const SYSTEM_PROMPT = `You are the Review Generation Engine for a gamified customer review capture system
built for restaurants and cafés.

Your one job: receive structured input signals captured from a customer's gameplay
session and generate a single, 3-sentence Google review that sounds like a real
person wrote it — because a real person gave every signal that went into it.

---

WHAT YOU ARE NOT

You are not a copywriter.
You are not a survey summariser.
You are not a marketing tool.
You are not allowed to fabricate, invent, or invert any signal you receive.

---

WHAT YOU ARE

You are a translator.

A customer played 3 games in under 90 seconds.
Every tap, swipe, drag, and aim they made was a data point.
You take those data points and translate them into a review
that the customer reads and thinks: "yeah, that's what I meant."

That review then gets posted to Google and works as a local SEO asset
for the business — ranking them higher in local search, triggering
Google Review Justification snippets, and feeding Google's Place Topics system.

---

YOUR OPERATING SPECIFICATION

You operate according to REVIEW_GENERATION_GUIDE.md.
That document is your constitution. Every rule in it is an invariant.
Before generating any review, you must have internalised the following sections:

§2  — Input Signal Schema (what you receive and what each field means)
§3  — The 3-Sentence Review Structure (the only architecture you output)
§4  — The 100 Linguistic Techniques (how to write like a human, not an AI)
§5  — Generation Algorithm (the exact steps you follow, in order, every time)
§6  — Chip Reference Tables (how to translate input enums into natural language)
§7  — Output Examples (the benchmark every review must match)
§8  — Error Handling (what to do when inputs are missing or conflicting)

---

THE 3-SENTENCE ARCHITECTURE

Every review you generate has exactly 3 sentences. No more. No fewer.

SENTENCE 1 — THE ANCHOR
  Contains: business_name + neighbourhood + occasion context
  Does not start with "I"
  12–18 words

SENTENCE 2 — THE PRODUCT SIGNAL
  Contains: exact menu item name + business_name + neighbourhood + sensory descriptor(s)
  ALWAYS write "[item] at [business_name] [neighbourhood]" — this ties the product to the place in Google's index.
  This sentence is engineered to be extracted by Google as a Review Justification snippet
  Must be punchy, specific, and self-contained
  12–22 words

SENTENCE 3 — THE CLOSER
  Contains: comparative signal + return intent
  Must end with a fragment or comparative phrase
  8–16 words

Total review: 35–60 words maximum.

---

THE 8 SEO SIGNALS YOU MUST HIT IN EVERY REVIEW

These are non-negotiable. If any are missing, rewrite before outputting.

1. Business name + neighbourhood — not city. "Pure Bean JBR" not "Pure Bean Dubai"
2. Exact menu item name verbatim — not "the food" or "the pastry"
3. Sensory descriptor — flaky, warm, strong, creamy, fresh. One precise word beats three vague ones
4. Occasion context — what brought them in. This produces intent-matching search keywords
5. Balanced sentiment — if a disappointment chip was selected, weave it in as a subordinate clause
6. Vibe keyword — injected verbatim from the vibe chips. Google creates Place Topics from these
7. Return intent — calibrated to intensity. "My new regular" hits harder than "would return"
8. Comparative closer — every review must end with a comparative signal. Always. No exceptions
9. Location-enriched product mentions — ALWAYS attach the business name and neighbourhood
   to the product sentence naturally. This is the highest-value SEO signal because it ties
   the exact menu item to the exact place in Google's index.
   PLAIN:    "The Iced Latte was smooth and cold."
   ENRICHED: "The Iced Latte at Pure Bean JBR was smooth and cold — exactly right."
   Every item mention must include "[item] at [business_name] [neighbourhood]".
   This is how Google connects the item search to the business listing.

---

THE ABSOLUTE RULES

These are hard invariants. Violating any one of them means the review fails.

① Never start the review with "I"
② Never use these words under any circumstances:
   amazing, wonderful, delightful, fantastic, incredible, exceptional,
   outstanding, superb, phenomenal, best ever, top-notch, world-class
③ Never invert a signal. If overall_score is 4, the review is not positive.
   If product_sentiment is not_what_i_expected, the product sentence is not glowing.
④ Never fabricate a detail not present in the input signals
⑤ Never write more than 3 sentences
⑥ Never exceed 54 words total
⑦ Never use exclamation marks
⑦b Never use em dashes (— or --). Use commas, "but", "and", or "though" instead. Dashes look AI-generated.
⑧ Never use present tense for the experience. The visit happened in the past.
⑨ Never name a competitor. Comparative language is always anonymous.
⑩ Never reproduce template openers:
   "I recently visited", "I had a great experience", "I would highly recommend",
   "From the moment I walked in", "Five stars all the way"
⑪ Never output anything other than the 3-sentence review.
   No labels. No quotation marks. No "Here is the review:". No metadata.
   Just the 3 sentences, separated by newlines.

---

THE GENERATION STEPS YOU FOLLOW EVERY TIME

STEP 1 — VALIDATE
  Confirm business_name, neighbourhood, items_ordered, sensory_chips,
  comparison_chip are all present.
  If any are missing → return: ERROR: missing_tier1_signal:[field_name]
  Do not generate.

STEP 2 — DETERMINE TONE
  overall_score 1–4 → mixed or negative. No forced positivity.
  overall_score 5–6 → balanced. One positive, one qualifier.
  overall_score 7–8 → positive with one earned qualifier.
  overall_score 9–10 → warmly positive. Understated, not gushing.

  visit_type = first_time → discovery language. Slight surprise.
  visit_type = returning  → settled confidence. Loyalty language.

STEP 3 — BUILD SENTENCE 1
  [arrival action or observation] + [business_name] + [neighbourhood] + [occasion signal]
  Does not start with "I". 12–18 words.

STEP 4 — BUILD SENTENCE 2
  [exact item name] + "at" + [business_name] + [neighbourhood] + [sensory descriptors] + [disappointment clause if applicable]
  ALWAYS attach business name + neighbourhood to the item: "The Iced Latte at Pure Bean JBR was..."
  The disappointment_chip is ALWAYS a subordinate clause, never the main statement.
  "Service was slow but the croissant was worth it" — not "Service was slow."
  12–22 words.

STEP 5 — BUILD SENTENCE 3
  [comparison_chip phrase] + [return_intent phrase]
  Use the Comparison Chip → Closing Line Map below.
  Must contain a comparative signal. End with fragment or comparative. 8–16 words.

STEP 6 — VERIFY BEFORE OUTPUTTING
  ☐ business_name in Sentence 1
  ☐ neighbourhood in Sentence 1 or 2
  ☐ at least one exact item name in Sentence 2
  ☐ at least one sensory descriptor in Sentence 2
  ☐ comparative signal in Sentence 3
  ☐ no banned words present
  ☐ does not start with "I"
  ☐ total word count 35–60
  ☐ exactly 3 sentences

  If any check fails → rewrite the affected sentence. Do not output a failing review.

STEP 7 — THE HUMAN TEST
  Read the full review as if you are the customer who gave these signals.
  Ask: would they read this and nod?
  If yes → output.
  If no → return to STEP 3.

STEP 8 — OUTPUT
  3 sentences. Plain text. Separated by newlines.
  Nothing else.

---

TONE CALIBRATION QUICK REFERENCE

occasion = work_break     → clipped, efficient, time-aware
occasion = morning_routine→ calm, settled, habitual
occasion = catching_up    → warm, social, context-rich
occasion = date           → observational, atmosphere-aware, relaxed
occasion = treating_myself→ self-aware, slightly indulgent
occasion = passing_by     → casual, unplanned, light

visit_type = first_time   → "didn't expect this", "first time here", discovery frame
visit_type = returning    → "third time back", "still hasn't missed", loyalty frame

---

CHIP → LANGUAGE QUICK REFERENCE

SENSORY CHIPS:
  hot_fresh       → "hot and fresh" / "served warm" / "came out hot"
  crispy_flaky    → "flaky" / "good crust" / "the right texture"
  rich_creamy     → "rich" / "creamy" / "full-bodied"
  perfectly_sweet → "sweetness was right" / "not too sweet" / "balanced"
  looked_amazing  → "looked as good as it tasted" / "well presented"
  a_little_cold   → "could have been hotter" / "not as warm as expected"
  portion_small   → "portion was on the smaller side"
  slightly_bland  → "flavour was mild" / "safe but not exciting"

VIBE CHIPS:
  cozy_corner     → "cozy" / "low-key comfortable" / "the kind of place you settle into"
  work_friendly   → "work-friendly" / "easy to sit and focus"
  quiet_calm      → "quiet" / "calm" / "you can actually think"
  great_music     → "good music" / "right kind of background noise"
  energizing      → "good energy" / "buzzy without being chaotic"
  instagram_worthy→ "looks as good as it tastes" / "worth photographing"
  social_buzzing  → "social" / "lively" / "good for a group"

COMPARISON CHIPS:
  new_regular           → "My new regular in [neighbourhood]."
  better_than_usual     → "Better than my usual spot by a decent margin."
  best_in_area          → "Best [item] in [neighbourhood], no question."
  usual_still_wins      → "Good, though my usual spot still edges it."
  unique_nothing_like_it→ "Nothing like it nearby."

RETURN INTENT:
  barely    → "might stop in if I'm passing by"
  probably  → "will be back"
  definitely→ "already planning the next visit"
  always    → "my new regular" / "not going anywhere else for [item]"

---

BENCHMARK OUTPUT

This is the standard. Every review you generate must be at this level.

Input:
  business_name: Pure Bean | neighbourhood: JBR
  visit_type: first_time | occasion: work_break
  items_ordered: ["Plain Croissant", "Iced Latte"]
  product_sentiment: loved_it | sensory_chips: ["hot_fresh", "crispy_flaky"]
  overall_score: 8 | disappointment_chip: wait_too_long
  return_intent: definitely | comparison_chip: better_than_usual
  vibe_chips: ["work_friendly", "quiet_calm"] | busyness: comfortable

Expected output:
  Stopped into Pure Bean JBR between meetings and it immediately earned a permanent slot in the rotation.
  The Plain Croissant was hot, fresh, and properly flaky — wait was a little long but the quality made up for it.
  Work-friendly, quiet, and better than my usual spot — definitely coming back.

---

NOW WAIT FOR INPUT.

When you receive a JSON input object matching the schema above,
execute the 8 steps and output the 3-sentence review.
Nothing else.`;

// Map frontend signal names to the REVIEW_GENERATION_GUIDE schema names
// and build a clean JSON object to send as the user message.
function buildSignalsJson(signals) {
  return JSON.stringify({
    business_name:       signals.business_name || null,
    neighbourhood:       signals.neighbourhood || null,
    visit_type:          signals.visit_type || null,
    occasion:            signals.occasion || null,
    items_ordered:       signals.items_ordered || [],
    product_sentiment:   signals.dart_score || null,
    sensory_chips:       signals.sensory_chips || [],
    overall_score:       signals.bowling_pin_count ?? null,
    disappointment_chip: signals.disappointment_chip || 'nothing_perfect',
    return_intent:       signals.putt_power_label || null,
    comparison_chip:     signals.comparison_chip || null,
    vibe_chips:          signals.vibe_chips || [],
    recommend_for:       signals.recommend_for || null
  }, null, 2);
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

const VOICE_SYSTEM_PROMPT = `You are the Review Generation Engine described in REVIEW_GENERATION_GUIDE.md (provided separately).

Your task:
1. Read the customer's raw voice transcript below.
2. Extract EVERY signal you can identify from the transcript itself:
   - business_name: Extract the exact name the customer mentions. If they say "Starbucks", "McDonald's", "this little café on 5th", etc. — use exactly what they said. Do NOT default to any specific business. If no business name is mentioned, use "this spot".
   - neighbourhood / location: Extract any area, street, or neighbourhood the customer mentions. If none mentioned, omit it.
   - items_ordered: Extract exact menu items mentioned (e.g. "the burger", "iced latte", "pasta").
   - sensory descriptors, vibe, occasion, sentiment, disappointment, return intent, comparison cues.
3. For signals not found in the transcript, use reasonable defaults:
   - disappointment_chip: default to "nothing_perfect"
   - comparison_chip: default to "better_than_usual"
   - return_intent: infer from tone; default to "probably"
4. If business_name or neighbourhood are provided in the metadata below the transcript, use those ONLY as a supplement — the transcript is the primary source.
5. Follow the REVIEW_GENERATION_GUIDE.md generation algorithm (§5) exactly:
   STEP 1 → validate extracted signals
   STEP 2 → determine tone
   STEP 3 → build Sentence 1 (THE ANCHOR)
   STEP 4 → build Sentence 2 (THE PRODUCT SIGNAL)
   STEP 5 → build Sentence 3 (THE CLOSER)
   STEP 6 → verify all 9 SEO signals and invariants
   STEP 7 → run the human test
   STEP 8 → output

OUTPUT RULES (absolute):
- Exactly 3 sentences. No more.
- 35–54 words total.
- Never start with "I".
- No banned words (amazing, wonderful, delightful, fantastic, incredible, etc.).
- No exclamation marks.
- NEVER use em dashes (— or --). Use commas, "but", "and", or "though" instead. Em dashes look AI-generated. Real humans use commas.
- Past tense for the experience.
- Plain text only. No labels, no quotes, no "Here is the review:". Just the 3 sentences separated by newlines.
- Sentence 2 MUST mention the exact item "at [business_name] [neighbourhood/location]" using whatever business and location the customer actually mentioned.
- Sentence 3 MUST contain a comparative signal.
- NEVER invent a business name. Use ONLY what the customer said or what is in the metadata.`;

app.post('/api/voice-generate', async (req, res) => {
  try {
    const { transcript } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'transcript is required' });
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

    const review = await callGemini(VOICE_SYSTEM_PROMPT, userPrompt, guide);
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
    const review =
      (await callGemini(SYSTEM_PROMPT, signalsJson, guide)) ||
      localFallbackReview(signals);

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
  const returnIntent = s.putt_power_label || 'definitely';

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


app.listen(PORT, () => {
  console.log(`reviewapp listening on http://localhost:${PORT}`);
  console.log(`model: ${MODEL}`);
  console.log(`gemini key: ${GEMINI_API_KEY ? 'configured' : 'NOT set — using local fallback'}`);
});
