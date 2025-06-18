#!/usr/bin/env python3
"""
Runner script for MediaPipe Pose Verification Flask App
Provides easy configuration and deployment options
"""

import os
import sys
import argparse
from app import app

def run_development():
    """Run in development mode"""
    print("🏋️ Starting AI Fitness Coach in DEVELOPMENT mode...")
    print("📱 Web interface: http://localhost:5000")
    print("🔧 API docs: http://localhost:5000/api/health")
    print("💡 Press Ctrl+C to stop")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=True
    )

def run_production():
    """Run in production mode with Gunicorn"""
    print("🏋️ Starting AI Fitness Coach in PRODUCTION mode...")
    print("📱 Web interface: http://localhost:8000")
    print("🔧 Using Gunicorn WSGI server")
    
    os.system('gunicorn -w 4 -b 0.0.0.0:8000 app:app')

def main():
    parser = argparse.ArgumentParser(description='MediaPipe Pose Verification Flask App')
    parser.add_argument(
        '--mode', 
        choices=['dev', 'prod'], 
        default='dev',
        help='Run mode: dev (development) or prod (production)'
    )
    parser.add_argument(
        '--port', 
        type=int, 
        default=5000,
        help='Port to run the application on (default: 5000)'
    )
    
    args = parser.parse_args()
    
    if args.mode == 'dev':
        app.run(
            host='0.0.0.0',
            port=args.port,
            debug=True,
            use_reloader=True
        )
    else:
        run_production()

if __name__ == '__main__':
    main() 