/**
 * Main Application - Coordinates the entire web app
 * Handles UI interactions, camera setup, and pose analysis coordination
 */

import { PoseAnalyzer } from './pose-analyzer.js';
import { PoseCoach } from './pose-coach.js';
import { getAvailableCameras, requestCameraPermission } from './utils.js';

class FitnessCoachApp {
    constructor() {
        this.analyzer = new PoseAnalyzer();
        this.isRunning = false;
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
                this.analyzer.setExerciseType(this.currentExercise);
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
            
            const cameraSelect = document.getElementById('cameraSelect');
            const selectedCamera = cameraSelect ? cameraSelect.value : null;
            
            if (!selectedCamera) {
                this.showError('Please select a camera first.');
                return;
            }

            // Update UI
            this.updateStartStopButtons(true);
            this.hideError();
            this.showMainInterface();

            // Start the analyzer
            const success = await this.analyzer.start(selectedCamera);
            
            if (success) {
                this.isRunning = true;
                console.log('✅ Pose analysis started successfully');
            } else {
                this.updateStartStopButtons(false);
                this.showError('Failed to start pose analysis. Please try again.');
            }
            
        } catch (error) {
            console.error('❌ Error starting analysis:', error);
            this.updateStartStopButtons(false);
            this.showError('Failed to start camera. Please check permissions and try again.');
        }
    }

    /**
     * Stop pose analysis
     */
    stopAnalysis() {
        if (!this.isRunning) return;

        console.log('⏹️ Stopping pose analysis...');
        
        this.analyzer.stop();
        this.isRunning = false;
        
        // Update UI
        this.updateStartStopButtons(false);
        this.resetStats();
        
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
            startBtn.textContent = isRunning ? '🔄 Running...' : '🎥 Start Analysis';
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
        const mainInterface = document.getElementById('mainInterface');
        if (mainInterface) {
            mainInterface.classList.remove('hidden');
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
            'sessionTime': '0s',
            'fps': '0',
            'detectionRate': '0%',
            'goodFormRate': '0%'
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Reset feedback
        const primaryFeedback = document.getElementById('primaryFeedback');
        if (primaryFeedback) {
            primaryFeedback.textContent = '🏃 Get ready to start your workout!';
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
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for MediaPipe support
    if (typeof Pose === 'undefined') {
        console.error('MediaPipe Pose not found. Please check your internet connection.');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('errorText').textContent = 'MediaPipe not loaded. Please refresh the page.';
        return;
    }

    // Check for camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera not supported in this browser.');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('errorText').textContent = 'Camera not supported. Please use a modern browser.';
        return;
    }

    // Initialize the app
    window.fitnessApp = new FitnessCoachApp();
});

// Add global error handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

console.log('🏋️ AI Fitness Coach - Ready to load!'); 