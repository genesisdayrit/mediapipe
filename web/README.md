# MediaPipe Pose Verification - Web App 🏋️

A browser-based AI fitness coach that provides real-time pose analysis and coaching feedback for exercises using MediaPipe.

## Features ✨

- **Real-time Pose Detection**: Live camera analysis using MediaPipe Pose
- **AI Coaching**: Intelligent feedback for push-ups and handstands
- **Exercise Selection**: Support for multiple exercise types
- **Performance Tracking**: Session stats, FPS monitoring, form percentage
- **Responsive Design**: Works on desktop and mobile devices
- **No Installation Required**: Runs directly in your browser

## Quick Start 🚀

1. **Open the web app**:
   ```bash
   # Simple HTTP server
   python -m http.server 8000
   
   # Or with Node.js
   npx http-server
   
   # Or with PHP
   php -S localhost:8000
   ```

2. **Navigate to**: `http://localhost:8000`

3. **Allow camera permissions** when prompted

4. **Select your exercise type** (Push-ups or Handstands)

5. **Choose your camera** from the dropdown

6. **Click "Start Analysis"** to begin!

## How It Works 🔬

### Real-time Analysis
- MediaPipe detects 33 body landmarks in real-time
- JavaScript calculates joint angles and body alignment
- AI coach provides instant feedback on form

### Exercise Support
- **Push-ups**: Elbow angle analysis, body alignment checks
- **Handstands**: Body line assessment, arm stability, balance

### Feedback System
- **Critical** (Red): Major form issues requiring immediate attention
- **Major** (Orange): Important corrections for better form
- **Minor** (Green): Small tweaks for optimization
- **Success** (Green): Perfect form with motivational messages

## Browser Requirements 📱

- **Chrome 76+** (recommended)
- **Firefox 65+**
- **Safari 12+**
- **Edge 79+**

### Features Required:
- WebRTC camera access
- ES6 modules support
- Canvas 2D context
- WebAssembly (for MediaPipe)

## Keyboard Shortcuts ⌨️

- **Spacebar**: Start/Stop analysis
- **Escape**: Stop analysis

## File Structure 📁

```
web/
├── index.html          # Main HTML interface
├── js/
│   ├── app.js         # Main application logic
│   ├── pose-analyzer.js # MediaPipe integration
│   ├── pose-coach.js   # AI coaching system
│   └── utils.js       # Utility functions
└── README.md          # This file
```

## Performance Tips 🚀

### For Better Performance:
- Use Chrome browser for best MediaPipe performance
- Ensure good lighting for pose detection
- Position yourself 3-6 feet from camera
- Make sure your full body is visible in frame

### Troubleshooting:
- **Low FPS**: Try reducing video quality or closing other tabs
- **No pose detection**: Check lighting and body visibility
- **Camera issues**: Refresh page and allow permissions
- **Loading errors**: Check internet connection for MediaPipe CDN

## Exercise Guidelines 💪

### Push-ups:
- Start in plank position, hands shoulder-width apart
- Keep body straight from head to heels
- Lower chest to nearly touch ground (90-120° elbow angle)
- Push back up to starting position

### Handstands:
- Start against wall for support while learning
- Place hands shoulder-width apart
- Keep body straight and arms locked (160-180° angles)
- Engage core and point toes up

## Technical Details 🔧

### MediaPipe Configuration:
- Model complexity: 1 (balanced speed/accuracy)
- Min detection confidence: 0.5
- Min tracking confidence: 0.5
- Smooth landmarks: enabled

### Angle Calculations:
- Uses vector dot product for accurate angle measurement
- Filters based on exercise-specific requirements
- Consistency checking across frames

## Privacy & Security 🔒

- **No Data Collection**: All processing happens locally in your browser
- **No Video Storage**: Camera feed is processed in real-time only
- **No Server Communication**: Pure client-side application
- **Secure**: Uses HTTPS for MediaPipe CDN resources

## Browser Compatibility 🌐

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome  | ✅      | ✅     | Best performance |
| Firefox | ✅      | ⚠️     | Limited mobile support |
| Safari  | ✅      | ✅     | iOS 14.3+ required |
| Edge    | ✅      | ✅     | Chromium-based |

## Development 🛠️

### Local Development:
```bash
# Clone repository
git clone <repository-url>
cd mediapipe/web

# Start local server
python -m http.server 8000

# Open in browser
open http://localhost:8000
```

### Code Structure:
- **ES6 Modules**: Modern JavaScript with import/export
- **Async/Await**: Promise-based asynchronous operations
- **Canvas API**: Real-time pose visualization
- **MediaPipe Web**: Google's pose estimation library

## Contributing 🤝

1. Fork the repository
2. Create your feature branch
3. Test in multiple browsers
4. Submit a pull request

## License 📄

This project is open source and available under the MIT License.

---

**Ready to train with AI? 🏋️‍♀️ Open the web app and start your workout!** 