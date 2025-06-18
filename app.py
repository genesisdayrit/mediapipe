#!/usr/bin/env python3
"""
Flask Web Application for MediaPipe Pose Verification
Serves the AI Fitness Coach web interface with additional server-side features
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
import os
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'mediapipe-pose-coach-2024'

# Configuration
UPLOAD_FOLDER = 'uploads'
STATIC_FOLDER = 'web'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    """Serve the main web application"""
    return send_from_directory('web', 'index.html')

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    return send_from_directory('web/js', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files if any"""
    return send_from_directory('web/css', filename)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'service': 'MediaPipe Pose Verification'
    })

@app.route('/api/exercises')
def get_exercises():
    """Get available exercises and their configurations"""
    exercises = {
        'pushup': {
            'name': 'Push-ups',
            'description': 'Upper body strength exercise',
            'target_angles': {
                'elbow_angle': [90, 120]
            },
            'tips': [
                "Start in a plank position with hands shoulder-width apart",
                "Keep your body in a straight line from head to heels",
                "Lower your chest to nearly touch the ground",
                "Push back up to the starting position",
                "Keep your core engaged throughout the movement",
                "Breathe in on the way down, out on the way up"
            ]
        },
        'handstand': {
            'name': 'Handstands',
            'description': 'Inverted bodyweight exercise',
            'target_angles': {
                'shoulder_hip_ankle_angle': [170, 180],
                'elbow_angle': [160, 180]
            },
            'tips': [
                "Start against a wall for support while learning",
                "Place hands shoulder-width apart on the ground",
                "Engage your core and keep your body straight",
                "Look at your hands, not forward",
                "Keep your arms locked and strong",
                "Practice hollow body holds to build core strength"
            ]
        }
    }
    return jsonify(exercises)

@app.route('/api/session/start', methods=['POST'])
def start_session():
    """Start a new workout session"""
    data = request.get_json()
    exercise_type = data.get('exercise_type', 'pushup')
    
    session_data = {
        'session_id': f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        'exercise_type': exercise_type,
        'start_time': datetime.now().isoformat(),
        'status': 'active'
    }
    
    logger.info(f"Started new session: {session_data['session_id']}")
    return jsonify(session_data)

@app.route('/api/session/end', methods=['POST'])
def end_session():
    """End a workout session"""
    data = request.get_json()
    session_id = data.get('session_id')
    stats = data.get('stats', {})
    
    session_summary = {
        'session_id': session_id,
        'end_time': datetime.now().isoformat(),
        'duration': stats.get('duration', 0),
        'total_frames': stats.get('total_frames', 0),
        'good_form_percentage': stats.get('good_form_percentage', 0),
        'average_fps': stats.get('average_fps', 0)
    }
    
    logger.info(f"Ended session: {session_id}")
    return jsonify(session_summary)

@app.route('/api/feedback', methods=['POST'])
def save_feedback():
    """Save user feedback about the coaching system"""
    data = request.get_json()
    
    feedback_entry = {
        'timestamp': datetime.now().isoformat(),
        'exercise_type': data.get('exercise_type'),
        'rating': data.get('rating'),
        'comment': data.get('comment'),
        'session_id': data.get('session_id')
    }
    
    # In a real app, you'd save this to a database
    logger.info(f"Received feedback: {feedback_entry}")
    
    return jsonify({'status': 'success', 'message': 'Feedback saved'})

@app.route('/api/stats/summary')
def get_stats_summary():
    """Get usage statistics summary"""
    # In a real app, you'd query a database
    summary = {
        'total_sessions': 0,
        'total_exercises': 2,
        'average_session_duration': 0,
        'top_exercise': 'pushup',
        'last_updated': datetime.now().isoformat()
    }
    
    return jsonify(summary)

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🏋️ Starting AI Fitness Coach Flask App...")
    print("📱 Access the web app at: http://localhost:5000")
    print("🔧 API endpoints available at: http://localhost:5000/api/")
    print("💡 Press Ctrl+C to stop the server")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=True
    ) 