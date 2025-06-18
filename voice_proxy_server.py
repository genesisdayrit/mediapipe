#!/usr/bin/env python3
"""
ElevenLabs Voice Proxy Server
Simple Flask server to proxy TTS requests to ElevenLabs API
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import tempfile
import os
import io

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ElevenLabs API configuration
ELEVENLABS_API_KEY = "sk_fb116093257dc988bde710e13a00c2f19139cefde616aac8"
ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "ElevenLabs Voice Proxy"})

@app.route('/tts', methods=['POST'])
def text_to_speech():
    """
    Convert text to speech using ElevenLabs API
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' in request body"}), 400
        
        text = data['text']
        voice_id = data.get('voice_id', 'nPczCjzI2devNBz1zQrb')  # Default voice
        model_id = data.get('model_id', 'eleven_flash_v2_5')
        
        print(f"🎤 TTS Request: '{text[:50]}...' (voice: {voice_id})")
        
        # Prepare ElevenLabs API request
        headers = {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
        }
        
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }
        
        # Make request to ElevenLabs
        response = requests.post(
            f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            error_msg = f"ElevenLabs API error: {response.status_code}"
            print(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), response.status_code
        
        # Return audio data directly
        audio_data = response.content
        print(f"✅ TTS Generated: {len(audio_data)} bytes")
        
        # Create a BytesIO object to serve the audio
        audio_stream = io.BytesIO(audio_data)
        audio_stream.seek(0)
        
        return send_file(
            audio_stream,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='tts_audio.mp3'
        )
        
    except requests.exceptions.Timeout:
        print("❌ ElevenLabs API timeout")
        return jsonify({"error": "ElevenLabs API timeout"}), 504
    except requests.exceptions.RequestException as e:
        print(f"❌ ElevenLabs API request error: {e}")
        return jsonify({"error": "ElevenLabs API request failed"}), 502
    except Exception as e:
        print(f"❌ Server error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/voices', methods=['GET'])
def get_voices():
    """
    Get available voices from ElevenLabs API
    """
    try:
        headers = {
            'Accept': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
        }
        
        response = requests.get(
            f"{ELEVENLABS_BASE_URL}/voices",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch voices"}), response.status_code
        
        return jsonify(response.json())
        
    except Exception as e:
        print(f"❌ Error fetching voices: {e}")
        return jsonify({"error": "Failed to fetch voices"}), 500

@app.route('/test', methods=['POST'])
def test_tts():
    """
    Test TTS endpoint
    """
    test_text = "This is a test of the ElevenLabs voice coaching system! Everything is working perfectly!"
    
    try:
        return text_to_speech()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting ElevenLabs Voice Proxy Server...")
    print("🎤 Ready to process TTS requests from fitness app")
    print("🌐 Server will run on http://localhost:5000")
    print("📡 CORS enabled for frontend access")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    ) 