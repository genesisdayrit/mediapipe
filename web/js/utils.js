/**
 * Utility functions for MediaPipe Pose Verification
 * JavaScript equivalent of the Python utils.py
 */

/**
 * Calculate the angle between three points
 * @param {Object} pointA - First point {x, y}
 * @param {Object} pointB - Middle point (vertex) {x, y}
 * @param {Object} pointC - Third point {x, y}
 * @returns {number} Angle in degrees
 */
export function calculateAngle(pointA, pointB, pointC) {
    const vectorBA = {
        x: pointA.x - pointB.x,
        y: pointA.y - pointB.y
    };
    
    const vectorBC = {
        x: pointC.x - pointB.x,
        y: pointC.y - pointB.y
    };
    
    // Calculate dot product
    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    
    // Calculate magnitudes
    const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
    
    // Avoid division by zero
    if (magnitudeBA === 0 || magnitudeBC === 0) {
        return 0;
    }
    
    // Calculate cosine of angle
    let cosineAngle = dotProduct / (magnitudeBA * magnitudeBC);
    
    // Clamp to valid range for acos
    cosineAngle = Math.max(-1, Math.min(1, cosineAngle));
    
    // Convert to degrees
    const angleRadians = Math.acos(cosineAngle);
    const angleDegrees = angleRadians * (180 / Math.PI);
    
    return angleDegrees;
}

/**
 * Get landmark coordinates from MediaPipe pose landmarks
 * @param {Array} landmarks - MediaPipe pose landmarks
 * @param {number} landmarkIndex - Index of the landmark
 * @returns {Object} {x, y} coordinates
 */
export function getLandmarkCoordinates(landmarks, landmarkIndex) {
    if (!landmarks || landmarkIndex >= landmarks.length) {
        return { x: 0, y: 0 };
    }
    
    const landmark = landmarks[landmarkIndex];
    return {
        x: landmark.x,
        y: landmark.y
    };
}

/**
 * Verify posture based on exercise type and calculate relevant angles
 * @param {Array} landmarks - MediaPipe pose landmarks
 * @param {string} exerciseType - 'pushup' or 'handstand'
 * @returns {Object} Dictionary containing calculated angles
 */
export function verifyPosture(landmarks, exerciseType) {
    const angles = {
        elbow_angle_left: 0,
        elbow_angle_right: 0,
        shoulder_hip_ankle_angle_left: 0,
        shoulder_hip_ankle_angle_right: 0
    };
    
    if (!landmarks || landmarks.length === 0) {
        return angles;
    }
    
    try {
        if (exerciseType === 'pushup') {
            // Left arm angles
            const leftShoulder = getLandmarkCoordinates(landmarks, 11); // LEFT_SHOULDER
            const leftElbow = getLandmarkCoordinates(landmarks, 13);    // LEFT_ELBOW
            const leftWrist = getLandmarkCoordinates(landmarks, 15);    // LEFT_WRIST
            angles.elbow_angle_left = calculateAngle(leftShoulder, leftElbow, leftWrist);
            
            // Right arm angles
            const rightShoulder = getLandmarkCoordinates(landmarks, 12); // RIGHT_SHOULDER
            const rightElbow = getLandmarkCoordinates(landmarks, 14);    // RIGHT_ELBOW
            const rightWrist = getLandmarkCoordinates(landmarks, 16);    // RIGHT_WRIST
            angles.elbow_angle_right = calculateAngle(rightShoulder, rightElbow, rightWrist);
            
        } else if (exerciseType === 'handstand') {
            // Body alignment angles (shoulder-hip-ankle)
            const leftShoulder = getLandmarkCoordinates(landmarks, 11);  // LEFT_SHOULDER
            const leftHip = getLandmarkCoordinates(landmarks, 23);       // LEFT_HIP
            const leftAnkle = getLandmarkCoordinates(landmarks, 27);     // LEFT_ANKLE
            angles.shoulder_hip_ankle_angle_left = calculateAngle(leftShoulder, leftHip, leftAnkle);
            
            const rightShoulder = getLandmarkCoordinates(landmarks, 12); // RIGHT_SHOULDER
            const rightHip = getLandmarkCoordinates(landmarks, 24);      // RIGHT_HIP
            const rightAnkle = getLandmarkCoordinates(landmarks, 28);    // RIGHT_ANKLE
            angles.shoulder_hip_ankle_angle_right = calculateAngle(rightShoulder, rightHip, rightAnkle);
            
            // Elbow angles for arm stability
            const leftElbow = getLandmarkCoordinates(landmarks, 13);     // LEFT_ELBOW
            const leftWrist = getLandmarkCoordinates(landmarks, 15);     // LEFT_WRIST
            angles.elbow_angle_left = calculateAngle(leftShoulder, leftElbow, leftWrist);
            
            const rightElbow = getLandmarkCoordinates(landmarks, 14);    // RIGHT_ELBOW
            const rightWrist = getLandmarkCoordinates(landmarks, 16);    // RIGHT_WRIST
            angles.elbow_angle_right = calculateAngle(rightShoulder, rightElbow, rightWrist);
        }
    } catch (error) {
        console.warn('Error calculating angles:', error);
    }
    
    return angles;
}

/**
 * Load reference posture data
 * @returns {Object} Reference posture data
 */
export function loadReferenceData() {
    return {
        pushup: {
            elbow_angle: [90, 120]
        },
        handstand: {
            shoulder_hip_ankle_angle: [170, 180],
            elbow_angle: [160, 180]
        }
    };
}

/**
 * Check if the calculated angles fall within expected ranges
 * @param {Object} angles - Calculated angles
 * @param {string} exerciseType - Exercise type
 * @returns {Object} Correctness assessment for each angle
 */
export function checkPostureCorrectness(angles, exerciseType) {
    const reference = loadReferenceData();
    const correctness = {};
    
    if (!(exerciseType in reference)) {
        return correctness;
    }
    
    const exerciseRef = reference[exerciseType];
    
    for (const [angleName, angleValue] of Object.entries(angles)) {
        if (angleName.includes('elbow_angle') && 'elbow_angle' in exerciseRef) {
            const [minAngle, maxAngle] = exerciseRef.elbow_angle;
            correctness[angleName] = angleValue >= minAngle && angleValue <= maxAngle;
        } else if (angleName.includes('shoulder_hip_ankle') && 'shoulder_hip_ankle_angle' in exerciseRef) {
            const [minAngle, maxAngle] = exerciseRef.shoulder_hip_ankle_angle;
            correctness[angleName] = angleValue >= minAngle && angleValue <= maxAngle;
        }
    }
    
    return correctness;
}

/**
 * Draw pose landmarks and angles on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} results - MediaPipe pose results
 * @param {Object} angles - Calculated angles
 * @param {string} exerciseType - Exercise type
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
export function drawLandmarksAndAngles(ctx, results, angles, exerciseType, canvasWidth, canvasHeight) {
    if (!results.poseLandmarks) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw pose landmarks using MediaPipe drawing utilities
    if (window.drawingUtils) {
        window.drawingUtils.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
        });
        window.drawingUtils.drawLandmarks(ctx, results.poseLandmarks, {
            color: '#FF0000',
            radius: 3
        });
    } else {
        // Fallback: draw simple landmarks
        drawSimpleLandmarks(ctx, results.poseLandmarks, canvasWidth, canvasHeight);
    }
    
    // Draw angle information
    drawAngleInfo(ctx, angles, exerciseType);
}

/**
 * Simple landmark drawing fallback
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Pose landmarks
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function drawSimpleLandmarks(ctx, landmarks, width, height) {
    ctx.fillStyle = '#FF0000';
    
    landmarks.forEach(landmark => {
        const x = landmark.x * width;
        const y = landmark.y * height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
}

/**
 * Draw angle information on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} angles - Calculated angles
 * @param {string} exerciseType - Exercise type
 */
function drawAngleInfo(ctx, angles, exerciseType) {
    const correctness = checkPostureCorrectness(angles, exerciseType);
    
    ctx.font = '16px Arial';
    let yOffset = 30;
    
    for (const [angleName, angleValue] of Object.entries(angles)) {
        if (angleValue > 0) {
            // Color based on correctness
            const isCorrect = correctness[angleName];
            ctx.fillStyle = isCorrect ? '#00FF00' : '#FF0000';
            
            // Format angle name for display
            const displayName = angleName.replace(/_/g, ' ').replace(/angle/g, '').trim();
            const text = `${displayName}: ${angleValue.toFixed(1)}°`;
            
            ctx.fillText(text, 10, yOffset);
            yOffset += 25;
        }
    }
    
    // Display exercise type
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px Arial';
    ctx.fillText(`Exercise: ${exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)}`, 10, ctx.canvas.height - 20);
}

/**
 * Calculate FPS from frame times
 * @param {Array} frameTimes - Array of frame processing times
 * @returns {number} Average FPS
 */
export function calculateFPS(frameTimes) {
    if (frameTimes.length === 0) return 0;
    
    const averageTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    return averageTime > 0 ? Math.round(1000 / averageTime) : 0;
}

/**
 * Format time in seconds to readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/**
 * Get available cameras
 * @returns {Promise<Array>} Array of camera devices
 */
export async function getAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('Error getting cameras:', error);
        return [];
    }
}

/**
 * Request camera permissions
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Camera permission denied:', error);
        return false;
    }
} 