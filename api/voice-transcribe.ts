import type { VercelRequest, VercelResponse } from '@vercel/node';

// Disable Vercel's built-in bodyParser — we need the raw audio binary
export const config = { api: { bodyParser: false } };

const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY || '';
const BASE = 'https://api.assemblyai.com';

// Read raw request body into a single Buffer
function readBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!ASSEMBLYAI_KEY) return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY not configured' });

  const authHeaders = { authorization: ASSEMBLYAI_KEY };

  // ── Step 1: Read audio body ──────────────────────────────────────
  let audioBuffer: Buffer;
  try {
    audioBuffer = await readBody(req);
    console.log('[voice-transcribe] Received audio bytes:', audioBuffer.length);
  } catch (err) {
    console.error('[voice-transcribe] Body read failed:', err);
    return res.status(400).json({ error: 'Failed to read audio data' });
  }

  if (!audioBuffer.length) {
    return res.status(400).json({ error: 'Empty audio body' });
  }

  // ── Step 2: Upload audio to AssemblyAI ───────────────────────────
  let uploadUrl: string;
  try {
    const uploadRes = await fetch(`${BASE}/v2/upload`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/octet-stream' },
      body: audioBuffer,
    });
    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error('[voice-transcribe] Upload failed:', uploadRes.status, text);
      return res.status(500).json({ error: `AssemblyAI upload failed: ${uploadRes.status}` });
    }
    const uploadData = await uploadRes.json();
    uploadUrl = uploadData.upload_url;
    console.log('[voice-transcribe] Upload OK, url:', uploadUrl);
  } catch (err) {
    console.error('[voice-transcribe] Upload error:', err);
    return res.status(500).json({ error: 'AssemblyAI upload error' });
  }

  // ── Step 3: Submit transcript request ────────────────────────────
  let transcriptId: string;
  try {
    const transcriptRes = await fetch(`${BASE}/v2/transcript`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speech_models: ['universal-3-pro', 'universal-2'],
        language_detection: true,
      }),
    });
    if (!transcriptRes.ok) {
      const text = await transcriptRes.text();
      console.error('[voice-transcribe] Transcript submit failed:', transcriptRes.status, text);
      return res.status(500).json({ error: `Transcript submit failed: ${transcriptRes.status}` });
    }
    const transcriptData = await transcriptRes.json();
    transcriptId = transcriptData.id;
    console.log('[voice-transcribe] Transcript submitted, id:', transcriptId);
  } catch (err) {
    console.error('[voice-transcribe] Submit error:', err);
    return res.status(500).json({ error: 'Transcript submit error' });
  }

  // ── Step 4: Poll until complete (max 25s, poll every 1.5s) ───────
  // Vercel function maxDuration is 30s. 25s polling + ~3s for upload/submit = safe.
  const pollUrl = `${BASE}/v2/transcript/${transcriptId}`;
  const deadline = Date.now() + 25000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1500));

    try {
      const pollRes = await fetch(pollUrl, { headers: authHeaders });
      if (!pollRes.ok) continue;

      const result = await pollRes.json();
      console.log('[voice-transcribe] Poll status:', result.status);

      if (result.status === 'completed') {
        const transcript = (result.text || '').trim();
        console.log('[voice-transcribe] Done. transcript length:', transcript.length);
        return res.status(200).json({ transcript });
      }

      if (result.status === 'error') {
        console.error('[voice-transcribe] AssemblyAI error:', result.error);
        return res.status(500).json({ error: result.error || 'Transcription failed' });
      }
      // status === 'queued' or 'processing' — keep polling
    } catch (err) {
      console.error('[voice-transcribe] Poll error:', err);
      // transient error — keep polling
    }
  }

  return res.status(504).json({ error: 'Transcription timed out. Please try a shorter recording.' });
}
