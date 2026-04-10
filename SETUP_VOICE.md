# Free Voice Review Setup Guide

## ✅ What You Get

- **100% Free** - No API keys, no usage limits
- Self-hosted Whisper transcription
- Runs on your computer (CPU or GPU)

## 📋 Prerequisites

1. **Python 3.8+**
   ```bash
   python3 --version
   ```

2. **Node.js 18+**
   ```bash
   node --version
   ```

3. **ffmpeg** (required by Whisper)
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt install ffmpeg
   ```

## 🚀 Quick Start

### Option 1: Automatic (Recommended)

```bash
./start-voice-review.sh
```

This starts everything:
- Whisper service (port 5000)
- Node.js backend (port 3000)
- React frontend (port 5174)

### Option 2: Manual

**Terminal 1 - Whisper Service:**
```bash
cd whisper-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Terminal 2 - Backend:**
```bash
npm start
```

**Terminal 3 - Frontend:**
```bash
cd reviewapp-premium
npm run dev
```

## 🧪 Test It

1. Open http://localhost:5174
2. Click "Use Voice Instead"
3. Allow microphone access
4. Speak for 15-30 seconds
5. Click "Done Recording"
6. Wait for transcription (~5-10 seconds on CPU)
7. See your generated review!

## ⚙️ Configuration

### Change Whisper Model

Edit `whisper-service/app.py` line 15:

```python
model = whisper.load_model("base")  # Change this
```

**Model options:**
- `tiny` - Fastest (39M params, ~1GB RAM)
- `base` - Fast (74M params, ~1GB RAM) ← Default
- `small` - Better (244M params, ~2GB RAM)
- `medium` - Great (769M params, ~5GB RAM)
- `large` - Best (1550M params, ~10GB RAM)

### GPU Acceleration (Optional)

If you have NVIDIA GPU:

```bash
cd whisper-service
source venv/bin/activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

Whisper will automatically use GPU. Transcription becomes 5-10x faster!

## 📊 Performance

### CPU (base model)
- 30-second audio: ~5-10 seconds
- Good enough for most use cases

### GPU (base model)
- 30-second audio: ~1-2 seconds
- Near real-time transcription

## 🐛 Troubleshooting

### "Connection refused" on port 5000
Whisper service isn't running. Start it:
```bash
cd whisper-service
python app.py
```

### "Could not access microphone"
- Check browser permissions
- Use HTTPS or localhost only
- Try different browser

### Slow transcription
- Use smaller model (`tiny` instead of `base`)
- Or get GPU acceleration
- Or wait longer (it's free!)

### "ffmpeg not found"
Install ffmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

## 💰 Cost Comparison

| Solution | Cost per Review | Setup | Speed |
|----------|----------------|-------|-------|
| **Self-hosted Whisper** | $0.00 | Medium | 5-10s CPU |
| OpenAI Whisper API | $0.003 | Easy | 2-3s |
| NVIDIA NeMo | $0.00 | Hard | 5-10s GPU |

## 🎯 Next Steps

1. Test with real reviews
2. If too slow, upgrade to `small` model
3. If still slow, add GPU
4. If you scale to 100K+ reviews/month, consider OpenAI API

## 📝 Notes

- First transcription is slower (model loading)
- Subsequent transcriptions are faster (model cached)
- Model stays in memory while service runs
- Restart service to free memory

## 🔄 Switching Back to OpenAI API

If you want to use OpenAI API later:

1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Update `server.js` to use OpenAI endpoint
4. Stop Whisper service

But honestly, free is better! 🎉
