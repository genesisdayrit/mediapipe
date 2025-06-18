# MediaPipe Pose Verification

A Python-based repository for verifying MediaPipe Pose accuracy on handstand and push-up videos. This project processes exercise videos using MediaPipe to detect keypoints, calculates joint angles, and evaluates posture correctness against expected ranges.

## 🎯 Purpose

Verify MediaPipe Pose performance for real-time posture analysis in fitness applications, specifically focusing on:
- **Handstands**: Body alignment and arm stability
- **Push-ups**: Elbow angles and form assessment

## ✨ Features

- **📹 Video Processing**: Process videos frame-by-frame using MediaPipe Pose (33 keypoints)
- **🎥 Live Camera Analysis**: Real-time pose analysis with immediate feedback (NEW!)
- **🤖 AI Coaching**: Smart form feedback with specific improvement suggestions (NEW!)
- **📐 Angle Calculation**: Calculate key joint angles (elbow, shoulder-hip-ankle alignment)
- **✅ Posture Verification**: Compare detected angles against reference ranges for correct form
- **🎨 Visual Feedback**: Overlay keypoints and angles on video frames with color-coded correctness
- **💬 Real-time Coaching**: Priority-based feedback ("Engage core", "Elbows too wide", etc.)
- **📊 Performance Metrics**: Log processing FPS, pose detection rates, and angle statistics
- **🏆 Progress Tracking**: Good form percentage and motivational encouragement
- **💾 Session Recording**: Save live sessions with video and detailed metrics
- **🧪 Comprehensive Testing**: Unit tests for angle calculations and posture verification

## 📁 Project Structure

```
mediapipe-pose-verification/
├── src/
│   ├── main.py              # Main script for video processing
│   ├── live_analysis.py     # Live camera analysis script (NEW!)
│   └── utils.py             # Utility functions for calculations and visualization
├── scripts/
│   └── analyze_results.py   # Analysis script for processing results
├── tests/
│   └── test_utils.py        # Unit tests for utility functions
├── data/
│   ├── reference.json       # Reference posture data and angle ranges
│   ├── handstand.mp4        # [Add your handstand video here]
│   └── pushup.mp4          # [Add your push-up video here]
├── output/                  # Generated processed videos and metrics
├── requirements.txt         # Python dependencies
├── .gitignore              # Git ignore patterns
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd mediapipe-pose-verification

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Add Your Videos

Place your exercise videos in the `data/` directory:
- `data/handstand.mp4` - Your handstand video
- `data/pushup.mp4` - Your push-up video

**Video Requirements:**
- Format: MP4, AVI, or MOV
- Duration: 10-30 seconds recommended
- Quality: 720p or higher for better keypoint detection
- Lighting: Good lighting conditions
- Framing: Full body visible in frame

### 3. Run Analysis

#### Pre-recorded Video Analysis
```bash
# Analyze handstand video
python src/main.py --video data/handstand.mp4 --exercise handstand

# Analyze push-up video
python src/main.py --video data/pushup.mp4 --exercise pushup

# Specify custom output directory
python src/main.py --video data/pushup.mp4 --exercise pushup --output my_results
```

#### 🎥 Live Camera Analysis with AI Coaching (NEW!)
```bash
# Live push-up analysis with real-time coaching
python src/live_analysis.py --exercise pushup

# Live handstand analysis with session recording
python src/live_analysis.py --exercise handstand --save

# Use external camera and save to custom directory
python src/live_analysis.py --exercise pushup --camera 1 --save --output my_live_session
```

### 4. Review Results

#### Pre-recorded Video Results
After processing, check the `output/` directory for:
- `*_output.mp4`: Processed video with keypoint overlays and angle displays
- `*_metrics.csv`: Detailed frame-by-frame analysis data

#### Live Camera Results
During live analysis, you'll see:
- **Real-time feedback**: Immediate form assessment with color-coded angles
- **AI Coaching messages**: Specific improvement suggestions at bottom of screen
- **Performance stats**: Live FPS and pose detection rates
- **Progress tracking**: Good form percentage and session time
- **Interactive controls**: Pause, screenshot, reset stats, quit

If recording is enabled (`--save` flag), you'll get:
- `live_session_*.mp4`: Recorded session with overlays and coaching feedback
- `live_session_*.csv`: Session metrics data with form analysis
- `screenshot_*.jpg`: Screenshots taken during session

#### 🤖 AI Coaching Features
The live analysis now includes intelligent coaching that provides:
- **Priority-based feedback**: Critical issues (red) > Major issues (orange) > Minor tips (green)
- **Exercise-specific advice**: Tailored feedback for pushups vs handstands
- **Consistency checking**: Only shows feedback that appears consistently across frames
- **Motivational messages**: Encouragement based on your performance level
- **Progress assessment**: Real-time good form percentage tracking

## 📊 Understanding the Results

### Video Output
- **Green angles**: Within expected range (good form)
- **Red angles**: Outside expected range (needs improvement)
- **Pose landmarks**: Blue lines connecting detected body keypoints

### 🎮 Live Camera Controls
During live analysis, use these keyboard controls:
- **`q`** - Quit the session
- **`s`** - Take a screenshot
- **`r`** - Reset statistics (frame count, FPS, etc.)
- **`SPACE`** - Pause/Resume analysis
- **Position your full body** in the camera frame for best results

### Metrics CSV
Contains frame-by-frame data:
- `pose_detected`: Whether pose was detected in the frame
- `elbow_angle_left/right`: Elbow angles in degrees
- `shoulder_hip_ankle_angle_left/right`: Body alignment angles
- `processing_fps`: Real-time processing performance

### Reference Ranges

#### Push-ups
- **Elbow Angle**: 90-120° (at bottom position)
- Focus on maintaining straight body line and controlled movement

#### Handstands
- **Body Alignment**: 170-180° (shoulder-hip-ankle)
- **Arm Extension**: 160-180° (elbow angle)
- Focus on vertical alignment and engaged core

#### 🎯 Example Coaching Messages

**Push-up Coaching:**
- 🔴 Critical: "Keep your body straight - engage your core"
- 🟠 Major: "Elbows too wide - bring arms closer to body"
- 🟢 Minor: "Go deeper - lower your chest more"

**Handstand Coaching:**
- 🔴 Critical: "Banana shape detected - push hips forward"
- 🟠 Major: "Lean forward - shoulders over hands"
- 🟢 Minor: "Lock out your arms completely"

## 🧪 Testing

Run the test suite to verify functionality:

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python tests/test_utils.py

# Run tests with coverage (if pytest-cov installed)
python -m pytest tests/ --cov=src --cov-report=html
```

## 🔧 Customization

### Modify Reference Angles

Edit `data/reference.json` to adjust expected angle ranges:

```json
{
  "pushup": {
    "elbow_angle": [85, 125]  // Adjust range as needed
  },
  "handstand": {
    "shoulder_hip_ankle_angle": [168, 180],
    "elbow_angle": [155, 180]
  }
}
```

### Add New Exercise Types

1. Extend the `verify_posture()` function in `src/utils.py`
2. Add reference data in `data/reference.json`
3. Update the argument choices in `src/main.py`

## 📈 Performance Verification

### Expected Performance
- **Processing FPS**: >30 FPS for real-time analysis
- **Pose Detection Rate**: >95% in good lighting conditions
- **Angle Accuracy**: ±5° compared to manual measurement

### Verification Steps

1. **Visual Inspection**: Check that keypoints align with actual joints
2. **Angle Validation**: Compare detected angles with manual measurements
3. **Performance Testing**: Verify processing speed meets real-time requirements
4. **Edge Case Testing**: Test with varying lighting, angles, and clothing

## 🔍 Troubleshooting

### Common Issues

**Low Pose Detection Rate**
- Ensure good lighting conditions
- Keep full body in frame
- Avoid baggy clothing that obscures body shape
- Try adjusting `min_detection_confidence` in `main.py`

**Inaccurate Angles**
- Check camera angle (front-facing works best)
- Verify proper exercise form
- Consider adjusting reference ranges for your body type

**Slow Processing**
- Reduce video resolution
- Adjust MediaPipe model complexity in `main.py`
- Close other applications to free up CPU/GPU resources

### HandStand-Specific Challenges

Handstands can be challenging for pose detection due to body inversion:
- Consider recording from multiple angles
- Ensure hands and head are clearly visible
- May need to adjust detection confidence thresholds

## 🛠 Dependencies

- `mediapipe==0.10.14` - Pose detection and keypoint estimation
- `opencv-python==4.10.0.84` - Video processing and visualization
- `numpy==1.26.4` - Numerical computations
- `argparse` - Command-line argument parsing

## 📝 Development

### Adding Features

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run tests: `python -m pytest tests/`
5. Commit changes: `git commit -am 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Create Pull Request

### Code Style

- Follow PEP 8 guidelines
- Add docstrings to all functions
- Include type hints where appropriate
- Write tests for new functionality

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) - Google's framework for building perception pipelines
- [OpenCV](https://opencv.org/) - Computer vision library
- Fitness community for exercise form guidelines

## 📞 Support

If you encounter issues or have questions:

1. Check the troubleshooting section above
2. Review existing issues in the repository
3. Create a new issue with detailed description and video/data samples
4. Include system information (OS, Python version, etc.)

---

**Happy training and pose verification!** 💪🤸‍♂️ 