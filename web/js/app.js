/**
 * Main Application - Coordinates the entire web app
 * Handles UI interactions, camera setup, and pose analysis coordination
 */

import { PoseAnalyzer } from './pose-analyzer.js';
import { PoseCoach } from './pose-coach.js';
import { getAvailableCameras, requestCameraPermission } from './utils.js';

class FitnessCoachApp {
    constructor() {
        this.analyzer = null;
        this.isRunning = false;
        this.isPaused = false;
        this.currentExercise = 'pushup';
        
        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        console.log('🚀 Initializing AI Fitness Coach...');
        
        try {
            // Hide loading and show interface
            this.hideLoading();
            
            // Setup UI event listeners
            this.setupEventListeners();
            
            // Load available cameras
            await this.loadCameras();
            
            // Update exercise tips
            this.updateExerciseTips();
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Exercise selection
        const exerciseSelect = document.getElementById('exerciseSelect');
        if (exerciseSelect) {
            exerciseSelect.addEventListener('change', (e) => {
                this.currentExercise = e.target.value;
                if (this.analyzer) {
                    this.analyzer.setExerciseType(this.currentExercise);
                }
                this.updateExerciseTips();
                console.log(`Exercise changed to: ${this.currentExercise}`);
            });
        }

        // Start button
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startAnalysis();
            });
        }

        // Stop button
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopAnalysis();
            });
        }

        // Camera selection
        const cameraSelect = document.getElementById('cameraSelect');
        if (cameraSelect) {
            cameraSelect.addEventListener('change', (e) => {
                console.log(`Camera selected: ${e.target.value}`);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRunning) {
                    this.stopAnalysis();
                } else {
                    this.startAnalysis();
                }
            } else if (e.code === 'Escape') {
                if (this.isRunning) {
                    this.stopAnalysis();
                }
            }
        });
    }

    /**
     * Load available cameras into the select dropdown
     */
    async loadCameras() {
        try {
            // Request camera permission first
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) {
                this.showError('Camera permission is required for pose analysis.');
                return;
            }

            const cameras = await getAvailableCameras();
            const cameraSelect = document.getElementById('cameraSelect');
            
            if (cameraSelect && cameras.length > 0) {
                // Clear existing options except the first one
                cameraSelect.innerHTML = '<option value="">Select Camera</option>';
                
                cameras.forEach((camera, index) => {
                    const option = document.createElement('option');
                    option.value = camera.deviceId;
                    option.textContent = camera.label || `Camera ${index + 1}`;
                    cameraSelect.appendChild(option);
                });

                // Auto-select first camera
                if (cameras.length > 0) {
                    cameraSelect.value = cameras[0].deviceId;
                }
                
                console.log(`Found ${cameras.length} camera(s)`);
            } else {
                this.showError('No cameras found. Please connect a camera and refresh the page.');
            }
        } catch (error) {
            console.error('Error loading cameras:', error);
            this.showError('Failed to access cameras. Please check permissions.');
        }
    }

    /**
     * Start pose analysis
     */
    async startAnalysis() {
        if (this.isRunning) return;

        try {
            console.log('🎬 Starting pose analysis...');
            this.showStatus('Initializing camera...', 'info');
            
            const cameraSelect = document.getElementById('cameraSelect');
            const selectedCamera = cameraSelect ? cameraSelect.value : null;
            
            if (!selectedCamera) {
                this.showError('Please select a camera first.');
                return;
            }

            console.log('📷 Selected camera:', selectedCamera);

            // Update UI
            this.updateStartStopButtons(true);
            this.hideError();
            this.showMainInterface();
            this.showStatus('Starting camera...', 'info');

            // Initialize analyzer if not created
            if (!this.analyzer) {
                console.log('🚀 Creating pose analyzer...');
                this.analyzer = new PoseAnalyzer();
            }

            // Start the analyzer
            console.log('🚀 Starting pose analyzer...');
            const success = await this.analyzer.start(selectedCamera);
            
            if (success) {
                this.isRunning = true;
                console.log('✅ Pose analysis started successfully');
                this.showStatus('Analysis running - Move into view!', 'success');
                
                // Add analysis status overlay
                this.addAnalysisOverlay();
            } else {
                this.updateStartStopButtons(false);
                this.showError('Failed to start pose analysis. Please try again.');
                this.showStatus('Failed to start analysis', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error starting analysis:', error);
            this.updateStartStopButtons(false);
            this.showError('Failed to start camera. Please check permissions and try again.');
            this.showStatus('Camera access failed', 'error');
        }
    }

    /**
     * Stop pose analysis
     */
    stopAnalysis() {
        if (!this.isRunning) return;

        console.log('⏹️ Stopping pose analysis...');
        
        if (this.analyzer) {
            this.analyzer.stop();
        }
        this.isRunning = false;
        this.isPaused = false;
        
        // Update UI
        this.updateStartStopButtons(false);
        this.resetStats();
        
        // Hide main interface and show setup
        const setupContainer = document.getElementById('setupContainer');
        const mainInterface = document.getElementById('mainInterface');
        
        if (setupContainer) {
            setupContainer.classList.remove('hidden');
        }
        
        if (mainInterface) {
            mainInterface.classList.add('hidden');
        }
        
        // Reset pause button text
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }
        
        console.log('✅ Pose analysis stopped');
    }

    /**
     * Update start/stop button states
     */
    updateStartStopButtons(isRunning) {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (startBtn) {
            startBtn.disabled = isRunning;
            startBtn.innerHTML = isRunning ? '<i class="fas fa-sync-alt fa-spin"></i> Running...' : '<i class="fas fa-video"></i> Start Analysis';
        }
        
        if (stopBtn) {
            if (isRunning) {
                stopBtn.classList.remove('hidden');
            } else {
                stopBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Update exercise tips based on current exercise
     */
    updateExerciseTips() {
        const tipsListEl = document.getElementById('exerciseTipsList');
        if (!tipsListEl) return;

        const tips = PoseCoach.getExerciseTips(this.currentExercise);
        
        tipsListEl.innerHTML = '';
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsListEl.appendChild(li);
        });
    }

    /**
     * Show main interface
     */
    showMainInterface() {
        const setupContainer = document.getElementById('setupContainer');
        const mainInterface = document.getElementById('mainInterface');
        const loadingMessage = document.getElementById('loadingMessage');
        
        if (setupContainer) {
            setupContainer.classList.add('hidden');
        }
        
        if (mainInterface) {
            mainInterface.classList.remove('hidden');
        }
        
        if (loadingMessage) {
            loadingMessage.classList.add('hidden');
        }
        
        // Update exercise badge
        this.updateExerciseBadge();
        
        // Setup overlay controls
        this.setupOverlayControls();
    }

    /**
     * Update exercise badge in the overlay
     */
    updateExerciseBadge() {
        const exerciseSelect = document.getElementById('exerciseSelect');
        const exerciseBadge = document.getElementById('exerciseBadge');
        
        if (exerciseSelect && exerciseBadge) {
            const exerciseType = exerciseSelect.value;
            exerciseBadge.textContent = exerciseType.toUpperCase();
        }
    }

    /**
     * Setup overlay control event listeners
     */
    setupOverlayControls() {
        const stopBtnOverlay = document.getElementById('stopBtnOverlay');
        const pauseBtn = document.getElementById('pauseBtn');
        const exerciseDropdown = document.getElementById('exerciseDropdown');

        if (stopBtnOverlay) {
            stopBtnOverlay.addEventListener('click', () => this.stopAnalysis());
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        if (exerciseDropdown) {
            exerciseDropdown.addEventListener('change', (e) => this.changeExercise(e.target.value));
        }
    }

    /**
     * Toggle pause/resume
     */
    togglePause() {
        const pauseBtn = document.getElementById('pauseBtn');
        if (this.analyzer && this.analyzer.isRunning) {
            if (this.isPaused) {
                this.analyzer.resume?.();
                if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                this.isPaused = false;
                this.showStatus('Analysis resumed', 'info');
            } else {
                this.analyzer.pause?.();
                if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
                this.isPaused = true;
                this.showStatus('Analysis paused', 'warning');
            }
        }
    }

    /**
     * Change exercise type from dropdown
     */
    changeExercise(newValue) {
        const exerciseSelect = document.getElementById('exerciseSelect');
        const exerciseDropdown = document.getElementById('exerciseDropdown');
        
        if (newValue && exerciseSelect) {
            // Update the main exercise select
            exerciseSelect.value = newValue;
            
            // Update the exercise badge
            this.updateExerciseBadge();
            
            // Update the analyzer if it exists
            if (this.analyzer) {
                this.analyzer.setExerciseType(newValue);
            }
            
            // Reset the dropdown to default
            if (exerciseDropdown) {
                exerciseDropdown.value = '';
            }
            
            this.showStatus(`Switched to ${newValue}`, 'info');
        }
    }

    /**
     * Hide loading message
     */
    hideLoading() {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.classList.add('hidden');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
        }
        
        console.error('Error:', message);
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    }

    /**
     * Reset statistics display
     */
    resetStats() {
        const statsElements = {
            'fps': '0',
            'detectionRate': '0%',
            'formPercentage': '0%'
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Reset speedometer
        const gaugeProgress = document.getElementById('gaugeProgress');
        const gaugeNeedle = document.getElementById('gaugeNeedle');
        
        if (gaugeProgress) {
            gaugeProgress.style.strokeDashoffset = '219.9'; // Reset to 0%
        }
        
        if (gaugeNeedle) {
            gaugeNeedle.style.transform = 'rotate(-90deg)'; // Reset to 0%
        }

        // Reset feedback
        const primaryFeedback = document.getElementById('primaryFeedback');
        if (primaryFeedback) {
            primaryFeedback.innerHTML = '<i class="fas fa-running"></i> Get ready to start your workout!';
            primaryFeedback.className = 'primary-feedback minor';
        }

        const feedbackTips = document.getElementById('feedbackTips');
        if (feedbackTips) {
            feedbackTips.innerHTML = '';
        }

        const encouragement = document.getElementById('encouragementMessage');
        if (encouragement) {
            encouragement.classList.add('hidden');
        }

        // Remove analysis overlay
        this.removeAnalysisOverlay();
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        console.log(`📊 Status (${type}):`, message);
        
        // Create or update status element
        let statusElement = document.getElementById('analysisStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'analysisStatus';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: bold;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusElement);
        }

        // Set message and style based on type
        statusElement.textContent = message;
        statusElement.className = '';
        
        switch (type) {
            case 'success':
                statusElement.style.backgroundColor = '#10b981';
                statusElement.style.color = 'white';
                break;
            case 'error':
                statusElement.style.backgroundColor = '#ef4444';
                statusElement.style.color = 'white';
                break;
            case 'warning':
                statusElement.style.backgroundColor = '#f59e0b';
                statusElement.style.color = 'white';
                break;
            default: // info
                statusElement.style.backgroundColor = '#3b82f6';
                statusElement.style.color = 'white';
        }

        // Auto-hide after 3 seconds for non-persistent messages
        if (type !== 'success') {
            setTimeout(() => {
                if (statusElement && statusElement.parentNode) {
                    statusElement.remove();
                }
            }, 3000);
        }
    }

    /**
     * Add analysis overlay to video
     */
    addAnalysisOverlay() {
        const videoContainer = document.querySelector('.video-container');
        if (!videoContainer) return;

        // Remove existing overlay
        this.removeAnalysisOverlay();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'analysisOverlay';
        overlay.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 20;
            min-width: 200px;
        `;

        // Add initial content
        overlay.innerHTML = `
            <div style="margin-bottom: 5px;">🔍 <strong>Analysis Status</strong></div>
            <div id="overlayCamera">📷 Camera: Initializing...</div>
            <div id="overlayMediaPipe">🤖 MediaPipe: Loading...</div>
            <div id="overlayPoseDetection">👤 Pose: Not detected</div>
            <div id="overlayCoaching">🧠 Coaching: Waiting...</div>
        `;

        videoContainer.appendChild(overlay);
        console.log('📊 Analysis overlay added');
    }

    /**
     * Remove analysis overlay
     */
    removeAnalysisOverlay() {
        const overlay = document.getElementById('analysisOverlay');
        if (overlay) {
            overlay.remove();
            console.log('📊 Analysis overlay removed');
        }
    }

    /**
     * Update analysis overlay
     */
    updateAnalysisOverlay(data) {
        const overlayCamera = document.getElementById('overlayCamera');
        const overlayMediaPipe = document.getElementById('overlayMediaPipe');
        const overlayPoseDetection = document.getElementById('overlayPoseDetection');
        const overlayCoaching = document.getElementById('overlayCoaching');

        if (overlayCamera && data.cameraStatus) {
            overlayCamera.textContent = `📷 Camera: ${data.cameraStatus}`;
        }

        if (overlayMediaPipe && data.mediaPipeStatus) {
            overlayMediaPipe.textContent = `🤖 MediaPipe: ${data.mediaPipeStatus}`;
        }

        if (overlayPoseDetection && data.poseDetected !== undefined) {
            const status = data.poseDetected ? 'Detected ✅' : 'Searching...';
            overlayPoseDetection.textContent = `👤 Pose: ${status}`;
        }

        if (overlayCoaching && data.coachingActive !== undefined) {
            const status = data.coachingActive ? 'Active ✅' : 'Standby';
            overlayCoaching.textContent = `🧠 Coaching: ${status}`;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing AI Fitness Coach...');
    
    // Check for MediaPipe support
    console.log('🔍 Checking MediaPipe availability...');
    if (typeof Pose === 'undefined') {
        console.error('❌ MediaPipe Pose not found. Please check your internet connection.');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('errorText').textContent = 'MediaPipe not loaded. Please refresh the page.';
        return;
    }
    console.log('✅ MediaPipe Pose is available');

    // Check for camera support
    console.log('🔍 Checking camera support...');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ Camera not supported in this browser.');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('errorText').textContent = 'Camera not supported. Please use a modern browser.';
        return;
    }
    console.log('✅ Camera API is available');

    // Check for MediaPipe utilities
    console.log('🔍 Checking MediaPipe utilities...');
    if (typeof Camera === 'undefined') {
        console.warn('⚠️ MediaPipe Camera utility not loaded');
    } else {
        console.log('✅ MediaPipe Camera utility is available');
    }

    if (typeof drawConnectors === 'undefined' || typeof drawLandmarks === 'undefined') {
        console.warn('⚠️ MediaPipe drawing utilities not loaded');
    } else {
        console.log('✅ MediaPipe drawing utilities are available');
    }

    // Initialize the app
    console.log('🎯 Initializing FitnessCoachApp...');
    window.fitnessApp = new FitnessCoachApp();
    console.log('✅ FitnessCoachApp initialized successfully');
});

// Add global error handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

console.log('🏋️ AI Fitness Coach - Ready to load!'); 