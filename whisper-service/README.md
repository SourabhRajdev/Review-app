# Free Whisper Transcription Service

Self-hosted Whisper service. No API keys, completely free.

## Setup

### 1. Install Python Dependencies

```bash
cd whisper-service
pip install -r requirements.txt
```

Or with conda:
```bash
conda create -n whisper python=3.10
conda activate whisper
pip install -r requirements.txt
```

### 2. Install ffmpeg (Required by Whisper)

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 3. Start the Service

```bash
python app.py
```

Service runs on http://localhost:5000

## Model Options

Edit `app.py` line 15 to change model size:

```python
model = whisper.load_model("base")  # Change this
```

Options (speed vs accuracy):
- `tiny` - Fastest, lowest accuracy (~1GB RAM)
- `base` - Fast, good accuracy (~1GB RAM) ← Default
- `small` - Slower, better accuracy (~2GB RAM)
- `medium` - Slow, great accuracy (~5GB RAM)
- `large` - Slowest, best accuracy (~10GB RAM)

## GPU Acceleration (Optional)

If you have NVIDIA GPU:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

Whisper will automatically use GPU if available.

## Testing

```bash
curl -X POST http://localhost:5000/health
```

Should return:
```json
{"status": "ok", "model": "whisper-base"}
```

## Performance

**CPU (base model):**
- 30-second audio: ~5-10 seconds
- 60-second audio: ~10-20 seconds

**GPU (base model):**
- 30-second audio: ~1-2 seconds
- 60-second audio: ~2-4 seconds

## Cost

**Completely free!** No API keys, no usage limits.

Only cost is your compute resources (electricity).
