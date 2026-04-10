# Quick Test Guide - Voice Review Feature

## Step-by-Step Testing

### 1. Refresh the Page
- Open http://localhost:5174
- **Press Cmd+R (Mac) or Ctrl+R (Windows)** to refresh
- You should see the entry screen

### 2. Entry Screen
You should see:
```
┌─────────────────────────────┐
│  How was your visit?        │
│  Takes less than a minute   │
│                             │
│  ┌───────────────────────┐ │
│  │       Start           │ │ ← Black button
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │ 🎤 Use Voice Instead  │ │ ← Blue button (NEW!)
│  └───────────────────────┘ │
└─────────────────────────────┘
```

### 3. Click "Use Voice Instead"
This takes you to VoiceEntryScreen

### 4. Voice Recording Screen
```
┌─────────────────────────────┐
│  Tell us about your visit   │
│                             │
│  Speak naturally for        │
│  15-30 seconds...           │
│                             │
│  ┌───────────────────────┐ │
│  │  Start Recording      │ │
│  └───────────────────────┘ │
│                             │
│  Use tap interface instead  │
└─────────────────────────────┘
```

### 5. Click "Start Recording"
- Browser will ask for microphone permission
- **Click "Allow"**
- You'll see a red pulsing circle
- Start speaking!

### 6. While Recording
```
┌─────────────────────────────┐
│      Listening...           │
│                             │
│  ┌───────────────────────┐ │
│  │ I came here for a     │ │ ← Live transcript
│  │ quick work break...   │ │
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │   Done Recording      │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

### 7. Click "Done Recording"
This takes you to **TranscriptReviewScreen** (THE NEW SCREEN!)

### 8. Transcript Review Screen (THE TOGGLE!)
```
┌─────────────────────────────┐
│  Your transcript            │
│  Edit if needed...          │
│                             │
│  ┌───────────────────────┐ │
│  │ [Editable textarea]   │ │
│  │ I came here for a...  │ │
│  └───────────────────────┘ │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │ 💡 BLUE  │ │ ✏️ Gray  │ │ ← THE TOGGLE!
│  │ Polish   │ │ Keep     │ │
│  │ with AI  │ │ as is    │ │
│  └──────────┘ └──────────┘ │
│                             │
│  ℹ️  AI mode: We'll extract │
│     key details...          │
│                             │
│  ┌───────────────────────┐ │
│  │      Continue         │ │
│  └───────────────────────┘ │
│                             │
│      Record again           │
└─────────────────────────────┘
```

### 9. Toggle Options

**Option A: Polish with AI (Default - Blue)**
- Click "Continue"
- See "Writing your review..." (GeneratingScreen)
- Get 3-sentence SEO-optimized review

**Option B: Keep as is (Gray)**
- Click the "Keep as is" button first
- Then click "Continue"
- Skip directly to review (no AI processing)
- Your exact words are used

### 10. Final Review Screen
```
┌─────────────────────────────┐
│  Here's your review         │
│                             │
│  ┌───────────────────────┐ │
│  │ [Editable review]     │ │
│  │ Stopped into Pure...  │ │
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │    Copy Review        │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

---

## Troubleshooting

### "I don't see the voice button"
- **Refresh the page** (Cmd+R / Ctrl+R)
- Clear browser cache
- Check you're on http://localhost:5174

### "Microphone permission denied"
- Click the 🔒 icon in browser address bar
- Allow microphone access
- Refresh and try again

### "Speech recognition not supported"
- Use Chrome, Edge, or Safari
- Firefox doesn't support SpeechRecognition API

### "I don't see the toggle"
- Make sure you clicked "Done Recording"
- Check browser console for errors (F12)
- The toggle appears on TranscriptReviewScreen (after recording)

### "Nothing happens when I click Continue"
- Check backend is running: http://localhost:3000
- Check browser console (F12) for errors
- Make sure Gemini API key is in .env

---

## What to Say When Recording

Example script:
```
"I came here for a quick work break and ordered the iced latte 
and a croissant. The latte was really good, strong and cold, 
exactly what I needed. The croissant was warm and flaky, super 
fresh. The place was quiet enough to actually focus, which is 
rare around here. Service was a bit slow but honestly the 
quality made up for it. I'll definitely be back, probably my 
new regular spot in JBR."
```

Keep it natural, 15-30 seconds.

---

## Expected Results

### With AI Mode:
**Input (your speech):**
"I came here for a work break, ordered iced latte, it was good..."

**Output (AI-generated):**
```
Stopped into Pure Bean JBR between meetings and it immediately 
earned a permanent slot in the rotation.

The Iced Latte at Pure Bean JBR was strong, cold, and exactly 
right — wait was a little long but the quality made up for it.

Work-friendly, quiet, and better than my usual spot — definitely 
coming back.
```

### With Raw Mode:
**Input (your speech):**
"I came here for a work break, ordered iced latte, it was good..."

**Output (unchanged):**
```
I came here for a work break, ordered iced latte, it was good...
```

---

## Quick Debug Commands

```bash
# Check if servers are running
curl http://localhost:3000/api/sessions
curl http://localhost:5174

# Restart Vite dev server
cd reviewapp-premium
npm run dev

# Check for TypeScript errors
npm run build
```

---

## Still Not Working?

1. Open browser console (F12)
2. Take a screenshot
3. Share the error message

The most common issue is **not refreshing the page** after code changes!
