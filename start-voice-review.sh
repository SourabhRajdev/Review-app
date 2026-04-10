#!/bin/bash

# Start script for voice review system
# Starts both Whisper service and Node.js server

echo "🎙️  Starting Voice Review System..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Start Whisper service in background
echo "1️⃣  Starting Whisper transcription service..."
cd whisper-service

if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo "   Loading Whisper model (this may take a minute first time)..."
python app.py &
WHISPER_PID=$!
cd ..

# Wait for Whisper to be ready
echo "   Waiting for Whisper service to start..."
sleep 5

# Check if Whisper is running
if curl -s http://localhost:5000/health > /dev/null; then
    echo "   ✅ Whisper service ready on http://localhost:5000"
else
    echo "   ⚠️  Whisper service may still be loading..."
fi

echo ""
echo "2️⃣  Starting Node.js server..."
npm start &
NODE_PID=$!

echo ""
echo "3️⃣  Starting React frontend..."
cd reviewapp-premium
npm run dev &
VITE_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "📱 Frontend: http://localhost:5174"
echo "🔧 Backend:  http://localhost:3000"
echo "🎙️  Whisper:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C and kill all processes
trap "echo ''; echo 'Stopping all services...'; kill $WHISPER_PID $NODE_PID $VITE_PID 2>/dev/null; exit" INT

# Wait for all processes
wait
