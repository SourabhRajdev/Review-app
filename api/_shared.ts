// Shared utilities for Vercel serverless functions
import fs from 'fs';
import path from 'path';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Cache the guide in memory across warm invocations
let guideCache = '';

const GUIDE_REL = path.join('reviewapp-premium', 'src', 'architecture', 'REVIEW_GENERATION_GUIDE.md');

function resolveGuidePath(): string {
  // Vercel Lambda working directory is /var/task (project root).
  // __dirname for a file at api/_shared.js would be /var/task/api.
  // Try every reasonable base so the function works regardless of
  // how the Lambda sandbox sets cwd.
  const candidates = [
    path.join(process.cwd(), GUIDE_REL),               // cwd = /var/task  (most common)
    path.join(__dirname, '..', GUIDE_REL),              // __dirname = /var/task/api
    path.join(__dirname, GUIDE_REL),                    // cwd already in /var/task/api
    path.join('/var/task', GUIDE_REL),                  // absolute fallback
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch { /* skip */ }
  }
  return candidates[0]; // default — will throw a readable error in readFileSync
}

export function getGuide(): string {
  if (guideCache) return guideCache;
  try {
    const guidePath = resolveGuidePath();
    console.log('[_shared] loading guide from', guidePath);
    guideCache = fs.readFileSync(guidePath, 'utf8');
    console.log('[_shared] guide loaded:', guideCache.length, 'chars');
  } catch (err) {
    console.error('[_shared] REVIEW_GENERATION_GUIDE.md not found:', err instanceof Error ? err.message : err);
  }
  return guideCache;
}

export function getApiKey(): string {
  return GEMINI_API_KEY;
}

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  guideText: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL
  )}:generateContent?key=${GEMINI_API_KEY}`;

  const systemParts: { text: string }[] = [{ text: systemPrompt }];
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
        maxOutputTokens: 400,
        temperature: 0.85,
        topP: 0.95,
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
    ?.map((p: { text?: string }) => p.text || '')
    .join('')
    .trim();
  return text || '';
}

export function sanitizeReview(raw: string): string {
  if (!raw) return '';
  let text = raw
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/\s*–\s*/g, ', ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const clean = lines.filter(l => {
    if (/^\d+\.\s/.test(l)) return false;
    if (/^\*\*/.test(l)) return false;
    if (/^[-*•]\s/.test(l)) return false;
    if (/confidence score/i.test(l)) return false;
    if (/constraint/i.test(l)) return false;
    if (/checklist/i.test(l)) return false;
    if (/\bN\/A\b/.test(l)) return false;
    if (/^(yes|no|n\/a)\b/i.test(l)) return false;
    if (/here is/i.test(l)) return false;
    if (/^review:/i.test(l)) return false;
    return true;
  });
  const sentences = clean.filter(l => /[.!?]$/.test(l)).slice(0, 3);
  return sentences.length >= 2 ? sentences.join('\n') : clean.slice(0, 3).join('\n');
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
