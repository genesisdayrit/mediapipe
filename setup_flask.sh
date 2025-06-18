#!/bin/bash
# Setup script for MediaPipe Pose Verification Flask App

echo "🏋️ Setting up AI Fitness Coach Flask App..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads
mkdir -p web/css

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the app:"
echo "   Development mode:  python app.py"
echo "   Production mode:   python run_flask_app.py --mode prod"
echo "   Docker:           docker-compose up"
echo ""
echo "📱 The app will be available at:"
echo "   Development:      http://localhost:5000"
echo "   Production:       http://localhost:8000"
echo ""
echo "🔧 API endpoints:"
echo "   Health check:     /api/health"
echo "   Exercises:        /api/exercises"
echo "   Start session:    /api/session/start (POST)"
echo "   End session:      /api/session/end (POST)"
echo ""
echo "💡 Press Ctrl+C to stop the server when running" 