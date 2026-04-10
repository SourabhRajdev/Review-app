// Shared utilities for Vercel serverless functions
import fs from 'fs';
import path from 'path';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Cache the guide in memory across warm invocations
let guideCache = '';

export function getGuide(): string {
  if (guideCache) return guideCache;
  try {
    // In Vercel serverless, the working directory is the project root
    const guidePath = path.join(process.cwd(), 'src', 'architecture', 'REVIEW_GENERATION_GUIDE.md');
    guideCache = fs.readFileSync(guidePath, 'utf8');
  } catch {
    console.warn('REVIEW_GENERATION_GUIDE.md not found');
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

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
