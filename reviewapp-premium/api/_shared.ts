// Shared utilities for Vercel serverless functions
import fs from 'fs';
import path from 'path';

// Cache the guide in memory across warm invocations
let guideCache = '';

function resolveGuidePath(): string {
  const GUIDE_REL = path.join('reviewapp-premium', 'src', 'architecture', 'REVIEW_GENERATION_GUIDE.md');
  const GUIDE_REL_LOCAL = path.join('src', 'architecture', 'REVIEW_GENERATION_GUIDE.md');

  // Try to find the guide in multiple locations to support both root and subproject deployments
  const candidates = [
    path.join(process.cwd(), GUIDE_REL),               // Root deployment
    path.join(process.cwd(), GUIDE_REL_LOCAL),         // Subproject deployment (local dev)
  ];

  // Also try relative to this file
  try {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    candidates.push(path.join(__dirname, '..', GUIDE_REL));
    candidates.push(path.join(__dirname, '..', GUIDE_REL_LOCAL));
  } catch { /* skip if ESM/CommonJS mismatch */ }

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch { /* skip */ }
  }
  return candidates[0]; 
}

export function getGuide(): string {
  if (guideCache) return guideCache;
  try {
    const guidePath = resolveGuidePath();
    guideCache = fs.readFileSync(guidePath, 'utf8');
  } catch (err) {
    console.warn('REVIEW_GENERATION_GUIDE.md not found:', err);
  }
  return guideCache;
}

export function getApiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim();
}

export function getModel(): string {
  return (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
}

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  guideText: string
): Promise<string> {
  const apiKey = getApiKey();
  const model = getModel();

  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

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
    .replace(/\s*–\s*/g, ', ')
    .replace(/^review:/i, '')
    .trim();

  // Robust sentence splitting using regex (handles . ! ? followed by space or end of string)
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$/)
    .map(s => s.trim())
    .filter(s => {
      if (s.length < 5) return false;
      if (/^\d+\.\s/.test(s)) return false;
      if (/^\*\*/.test(s)) return false;
      if (/^[-*•]\s/.test(s)) return false;
      if (/confidence score/i.test(s)) return false;
      if (/constraint/i.test(s)) return false;
      if (/checklist/i.test(s)) return false;
      if (/\bN\/A\b/.test(s)) return false;
      if (/^(yes|no|n\/a)\b/i.test(s)) return false;
      if (/here is/i.test(s)) return false;
      return true;
    });

  // Return exactly 3 sentences if possible, otherwise what we have (up to 3)
  const result = sentences.slice(0, 3);
  return result.join('\n');
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
