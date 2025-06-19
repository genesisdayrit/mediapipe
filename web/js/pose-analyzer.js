/**
 * PoseAnalyzer - Main class for MediaPipe pose analysis
 * Handles camera input, pose detection, and real-time feedback
 */

import { drawLandmarksAndAngles, calculateFPS, formatTime } from './utils.js';
import { PoseCoach } from './pose-coach.js';

export class PoseAnalyzer {
    constructor(speakCallback = null) {
        this.pose = null;
        this.camera = null;
        this.coach = new PoseCoach(speakCallback);
        this.isRunning = false;
        this.exerciseType = 'pushup';
        this.lastPoseDetected = false;
        
        // Performance tracking
        this.frameTimes = [];
        this.maxFrameTimes = 30;
        this.sessionStartTime = null;
        this.totalFrames = 0;
        this.detectedFrames = 0;
        
        // UI elements
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasContext = null;
        
        this.initializeElements();
    }

    /**
     * Initialize UI elements
     */
    initializeElements() {
        this.videoElement = document.getElementById('videoElement');
        this.canvasElement = document.getElementById('canvasElement');
        
        if (this.canvasElement) {
            this.canvasContext = this.canvasElement.getContext('2d');
        }
    }

    /**
     * Initialize MediaPipe Pose
     */
    async initializePose() {
        try {
            console.log('🤖 Initializing MediaPipe Pose...');
            
            // Check if Pose is available
            if (typeof Pose === 'undefined') {
                throw new Error('MediaPipe Pose not loaded. Check CDN connection.');
            }

            this.pose = new Pose({
                locateFile: (file) => {
                    console.log(`📁 Loading MediaPipe file: ${file}`);
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            console.log('⚙️ Setting MediaPipe options...');
            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.pose.onResults(this.onResults.bind(this));
            
            console.log('✅ MediaPipe Pose initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize MediaPipe Pose:', error);
            return false;
        }
    }

    /**
     * Start camera and pose analysis
     */
    async start(cameraDeviceId = null) {
        try {
            console.log('🎥 Starting camera and pose analysis...');
            
            // Initialize pose if not already done
            if (!this.pose) {
                console.log('🤖 Pose not initialized, initializing now...');
                const success = await this.initializePose();
                if (!success) {
                    throw new Error('Failed to initialize pose detection');
                }
            }

            // Update analysis overlay
            window.fitnessApp?.updateAnalysisOverlay({
                mediaPipeStatus: 'Ready ✅'
            });

            console.log('📷 Requesting camera access...');
            // Get camera access
            const constraints = {
                video: {
                    width: 640,
                    height: 480,
                    deviceId: cameraDeviceId ? { exact: cameraDeviceId } : undefined
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = stream;
            console.log('✅ Camera stream acquired');

            // Update analysis overlay
            window.fitnessApp?.updateAnalysisOverlay({
                cameraStatus: 'Connected ✅'
            });

            // Check if Camera utility is available
            if (typeof Camera === 'undefined') {
                throw new Error('MediaPipe Camera utility not loaded. Check CDN connection.');
            }

            console.log('🎬 Initializing MediaPipe Camera...');
            // Initialize camera
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isRunning) {
                        // Log every 30th frame to avoid spam
                        if (this.totalFrames % 30 === 0) {
                            console.log('🔄 Processing frame...', this.totalFrames);
                        }
                        await this.pose.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480
            });

            await this.camera.start();
            console.log('✅ MediaPipe Camera started');
            
            this.isRunning = true;
            this.sessionStartTime = Date.now();
            this.coach.reset();
            
            console.log('🚀 Camera and pose analysis fully started');
            return true;
        } catch (error) {
            console.error('❌ Failed to start camera:', error);
            this.showError('Failed to access camera. Please check permissions.');
            
            // Update analysis overlay with error
            window.fitnessApp?.updateAnalysisOverlay({
                cameraStatus: 'Failed ❌',
                mediaPipeStatus: 'Error ❌'
            });
            
            return false;
        }
    }

    /**
     * Stop pose analysis and camera
     */
    stop() {
        this.isRunning = false;
        
        if (this.camera) {
            this.camera.stop();
        }
        
        if (this.videoElement && this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        
        // Clear canvas
        if (this.canvasContext) {
            this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }
        
        console.log('Camera and pose analysis stopped');
    }

    /**
     * Process pose detection results
     */
    onResults(results) {
        if (!this.isRunning) return;

        const frameStart = performance.now();
        
        // Track frame statistics
        this.totalFrames++;
        const poseDetected = !!results.poseLandmarks;
        
        // Log every 60th frame or when pose status changes
        const logFrame = this.totalFrames % 60 === 0 || 
                        (poseDetected !== this.lastPoseDetected);
        
        if (logFrame) {
            console.log('📊 Processing pose results... Frame:', this.totalFrames);
        }
        
        if (poseDetected) {
            this.detectedFrames++;
            if (logFrame) {
                console.log('👤 Pose detected! Landmarks:', results.poseLandmarks.length);
            }
        } else if (logFrame) {
            console.log('👤 No pose detected in this frame');
        }
        
        this.lastPoseDetected = poseDetected;

        // Update analysis overlay
        window.fitnessApp?.updateAnalysisOverlay({
            poseDetected: poseDetected,
            coachingActive: poseDetected
        });

        // Clear canvas and draw results
        if (this.canvasContext) {
            this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            
            if (results.poseLandmarks) {
                if (logFrame) {
                    console.log('🎨 Drawing pose landmarks...');
                }
                // Draw pose landmarks
                this.drawPose(results);
                
                if (logFrame) {
                    console.log('🧠 Getting coaching feedback...');
                }
                // Get coaching feedback
                const feedback = this.coach.analyzeAndCoach(results.poseLandmarks, this.exerciseType);
                if (logFrame) {
                    console.log('💬 Coaching feedback:', feedback.primaryFeedback);
                }
                
                // Update UI with feedback
                this.updateFeedbackUI(feedback);
            }
        }

        // Update performance stats
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxFrameTimes) {
            this.frameTimes.shift();
        }
        
        this.updateStatsUI();
        if (logFrame) {
            console.log(`⚡ Frame processed in ${frameTime.toFixed(2)}ms`);
        }
    }

    /**
     * Draw pose landmarks and connections
     */
    drawPose(results) {
        if (!results.poseLandmarks) return;

        const ctx = this.canvasContext;
        
        // Draw connections
        if (window.drawConnectors) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 2
            });
        }
        
        // Draw landmarks
        if (window.drawLandmarks) {
            drawLandmarks(ctx, results.poseLandmarks, {
                color: '#FF0000',
                radius: 3
            });
        }
        
        // Fallback drawing if MediaPipe drawing utils not available
        if (!window.drawConnectors || !window.drawLandmarks) {
            this.drawSimplePose(results.poseLandmarks);
        }
    }

    /**
     * Simple pose drawing fallback
     */
    drawSimplePose(landmarks) {
        const ctx = this.canvasContext;
        const width = this.canvasElement.width;
        const height = this.canvasElement.height;
        
        // Draw landmarks
        ctx.fillStyle = '#FF0000';
        landmarks.forEach(landmark => {
            const x = landmark.x * width;
            const y = landmark.y * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Draw some basic connections for visibility
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        
        const connections = [
            [11, 12], // shoulders
            [11, 13], [13, 15], // left arm
            [12, 14], [14, 16], // right arm
            [11, 23], [12, 24], // torso
            [23, 24], // hips
            [23, 25], [25, 27], // left leg
            [24, 26], [26, 28], // right leg
        ];
        
        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
                ctx.beginPath();
                ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
                ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
                ctx.stroke();
            }
        });
    }

    /**
     * Update feedback UI
     */
    updateFeedbackUI(feedback) {
        // Update primary feedback
        const primaryFeedbackEl = document.getElementById('primaryFeedback');
        if (primaryFeedbackEl) {
            primaryFeedbackEl.textContent = feedback.primaryFeedback;
            primaryFeedbackEl.className = `primary-feedback ${feedback.priority}`;
        }

        // Update tips
        const feedbackTipsEl = document.getElementById('feedbackTips');
        if (feedbackTipsEl) {
            feedbackTipsEl.innerHTML = '';
            feedback.tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                feedbackTipsEl.appendChild(li);
            });
        }

        // Show motivational message if available
        const encouragementEl = document.getElementById('encouragementMessage');
        if (encouragementEl && feedback.motivational) {
            encouragementEl.textContent = feedback.motivational;
            encouragementEl.classList.remove('hidden');
        } else if (encouragementEl) {
            encouragementEl.classList.add('hidden');
        }

        // Update good form percentage and speedometer
        if (feedback.sessionStats) {
            const formPercentageEl = document.getElementById('formPercentage');
            if (formPercentageEl) {
                formPercentageEl.textContent = `${feedback.sessionStats.goodFormPercentage}%`;
            }
            
            // Update speedometer gauge
            this.updateSpeedometer(feedback.sessionStats.goodFormPercentage);
        }
    }

    /**
     * Update statistics UI
     */
    updateStatsUI() {
        // Update FPS
        const fpsEl = document.getElementById('fps');
        if (fpsEl) {
            const fps = calculateFPS(this.frameTimes);
            fpsEl.textContent = fps.toString();
        }

        // Update detection rate
        const detectionRateEl = document.getElementById('detectionRate');
        if (detectionRateEl) {
            const rate = this.totalFrames > 0 ? 
                Math.round((this.detectedFrames / this.totalFrames) * 100) : 0;
            detectionRateEl.textContent = `${rate}%`;
        }
    }

    /**
     * Update speedometer gauge
     */
    updateSpeedometer(percentage) {
        const gaugeProgress = document.getElementById('gaugeProgress');
        const gaugeNeedle = document.getElementById('gaugeNeedle');
        
        if (gaugeProgress) {
            // Calculate stroke-dashoffset for arc (219.9 is approximately the circumference of the semi-circle)
            const circumference = 219.9;
            const offset = circumference - (percentage / 100) * circumference;
            gaugeProgress.style.strokeDashoffset = offset;
        }
        
        if (gaugeNeedle) {
            // Calculate needle rotation (-90 to +90 degrees for 0% to 100%)
            const rotation = -90 + (percentage / 100) * 180;
            gaugeNeedle.style.transform = `rotate(${rotation}deg)`;
        }
    }

    /**
     * Set exercise type
     */
    setExerciseType(exerciseType) {
        this.exerciseType = exerciseType;
        this.coach.reset(); // Reset coaching history when changing exercise
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        const errorTextEl = document.getElementById('errorText');
        
        if (errorEl && errorTextEl) {
            errorTextEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }
} 