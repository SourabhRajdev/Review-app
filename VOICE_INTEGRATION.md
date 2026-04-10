# Voice Review Integration

## Overview

**100% FREE** voice review feature using self-hosted Whisper. No API keys, no usage limits.

The system:
1. Records audio (15-30 seconds)
2. Transcribes using **self-hosted Whisper** (free!)
3. Extracts structured signals using Gemini AI
4. Generates a polished 3-sentence review
5. Jumps directly to the final review screen

## Cost

**Completely FREE!**
- No OpenAI API key needed
- No usage limits
- Only cost is your electricity

## Quick Start

```bash
# One command to start everything
./start-voice-review.sh
```

Or see [SETUP_VOICE.md](SETUP_VOICE.md) for detailed instructions.

## Flow Comparison

### Traditional Flow (16 screens):
Entry → VisitType → Occasion → Menu → ProductChoice → Archery → SensoryChips → ExperienceChoice → Bowling → Disappointment → ReturnChoice → Putt → Comparison → Bonus → Generating → Review

### Voice Flow (3 screens):
Entry → VoiceEntry → Review

## Setup

### 1. Install Prerequisites

**Python 3.8+:**
```bash
python3 --version
```

**ffmpeg (required by Whisper):**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

### 2. Install Whisper Service

```bash
cd whisper-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start Services

**Terminal 1 - Whisper:**
```bash
cd whisper-service
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

Or use the startup script:
```bash
./start-voice-review.sh
```

## Models Used

### Self-Hosted Whisper (base model)
- **Purpose**: Speech-to-text transcription
- **Cost**: FREE
- **Speed**: 5-10 seconds on CPU, 1-2 seconds on GPU
- **Accuracy**: 95%+ (same as OpenAI API)
- **Model size**: 74M parameters, ~1GB RAM

### Google Gemini 2.5 Flash
- **Purpose**: Signal extraction + review generation
- **Cost**: Very low (free tier available)
- **Already configured in your project**

## Signal Extraction

The system extracts these signals from natural speech:

- **visitType**: "first time here" → first_time, "back again" → returning
- **occasion**: "work break", "morning coffee", "catching up", etc.
- **itemsOrdered**: Exact menu item names mentioned
- **productOpinion**: Sentiment analysis (loved/okay/not_great)
- **sensoryChips**: "hot", "fresh", "flaky", "creamy", etc.
- **disappointment**: "wait was long", "too noisy", "portion small", etc.
- **returnIntent**: "definitely coming back" → will_return
- **comparisonChip**: "better than usual", "best in area", etc.
- **vibeChips**: "cozy", "work-friendly", "quiet", etc.

## User Experience

### Voice Recording Screen

1. **Idle State**: Shows microphone icon, "Start Recording" button
2. **Recording State**: Pulsing red circle, "Done Recording" button
3. **Processing State**: Loading spinner, shows transcript preview
4. **Error State**: Error message, "Try Again" button

### Prompts for Users

The screen guides users to:
- Speak naturally for 15-30 seconds
- Mention what they ordered
- Describe how it was
- Say if they'd come back

### Example Voice Input

> "Hey, so I came here for a quick work break between meetings. I ordered the iced latte and a croissant. The latte was really good, strong and cold, exactly what I needed. The croissant was warm and flaky, super fresh. The place was quiet enough to actually focus, which is rare around here. Service was a bit slow but honestly the quality made up for it. I'll definitely be back, probably my new regular spot in JBR."

### Generated Output

> Stopped into Pure Bean JBR between meetings and it immediately earned a permanent slot in the rotation.
> The Iced Latte was strong, cold, and exactly right — wait was a little long but the quality made up for it.
> Work-friendly, quiet, and better than my usual spot — definitely coming back.

## Browser Compatibility

Voice recording requires:
- HTTPS (or localhost for development)
- MediaRecorder API support
- getUserMedia API support

Supported browsers:
- Chrome/Edge 49+
- Firefox 25+
- Safari 14.1+
- Mobile browsers (iOS Safari 14.3+, Chrome Android)

## Error Handling

The system handles:
- Microphone permission denied
- No audio recorded
- Transcription API failures
- Signal extraction failures
- Network errors

All errors show user-friendly messages with retry options.

## Cost Estimation

Per voice review:
- Whisper transcription: ~$0.003 (30 seconds)
- Gemini signal extraction: ~$0.0001
- Gemini review generation: ~$0.0001
- **Total: ~$0.0032 per voice review**

Compare to traditional flow:
- No API costs during gameplay
- Only Gemini generation at end: ~$0.0001

Voice is ~30x more expensive but 10x faster for users.

## Testing

1. Start the servers:
```bash
npm start  # Backend on :3000
cd reviewapp-premium && npm run dev  # Frontend on :5174
```

2. Open http://localhost:5174
3. Click "Use Voice Instead"
4. Allow microphone access
5. Speak your review naturally
6. Click "Done Recording"
7. Wait for processing
8. See your generated review

## Troubleshooting

### "Could not access microphone"
- Check browser permissions
- Ensure HTTPS or localhost
- Try different browser

### "Transcription failed"
- Check OPENAI_API_KEY in .env
- Verify API key is valid
- Check OpenAI account has credits

### "Signal extraction failed"
- Check GEMINI_API_KEY in .env
- Review server logs for details
- Transcript may be too short/unclear

### Audio not recording
- Check MediaRecorder support
- Try different audio format
- Check browser console for errors

## Future Enhancements

- [ ] Support multiple languages
- [ ] Real-time transcription preview
- [ ] Audio waveform visualization
- [ ] Confidence scores for extracted signals
- [ ] Fallback to manual editing if extraction fails
- [ ] Voice activity detection (auto-stop when silent)
- [ ] Noise cancellation
- [ ] Speaker diarization (multiple people)
