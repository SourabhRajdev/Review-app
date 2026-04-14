import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CORS_HEADERS } from './_shared';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type')
      .setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      .end();
  }

  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY not configured on server' });
  }

  res.setHeader('Access-Control-Allow-Origin', CORS_HEADERS['Access-Control-Allow-Origin']);
  return res.status(200).json({ token: key });
}
