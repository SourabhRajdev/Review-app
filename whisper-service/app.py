#!/usr/bin/env python3
"""
Free self-hosted Whisper transcription service.
No API keys needed. Runs locally on CPU or GPU.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Load Whisper model on startup (base model for speed, use 'small' or 'medium' for better accuracy)
print("Loading Whisper model...")
model = whisper.load_model("base")  # Options: tiny, base, small, medium, large
print("Whisper model loaded!")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "whisper-base"})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name
        
        try:
            # Transcribe
            result = model.transcribe(tmp_path, language='en')
            text = result['text'].strip()
            
            return jsonify({
                "text": text,
                "model": "whisper-base",
                "language": result.get('language', 'en')
            })
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    except Exception as e:
        print(f"Transcription error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
