/**
 * AI Pose Coach - JavaScript equivalent of Python pose_coach.py
 * Provides intelligent coaching feedback for exercise form
 */

import { verifyPosture, getLandmarkCoordinates } from './utils.js';

export class PoseCoach {
    constructor() {
        this.frameHistory = [];
        this.maxHistoryFrames = 10;
        this.consistencyThreshold = 0.7;
        this.lastFeedbackTime = 0;
        this.feedbackCooldown = 1000; // 1 second
    }

    /**
     * Analyze pose and provide coaching feedback
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @param {string} exerciseType - 'pushup' or 'handstand'
     * @returns {Object} Coaching feedback
     */
    analyzeAndCoach(landmarks, exerciseType) {
        if (!landmarks || landmarks.length === 0) {
            return {
                primaryFeedback: "Position yourself in camera view",
                tips: ["Make sure your full body is visible"],
                priority: "critical",
                motivational: ""
            };
        }

        const angles = verifyPosture(landmarks, exerciseType);
        const feedback = this.generateFeedback(landmarks, angles, exerciseType);
        
        // Add to frame history for consistency checking
        this.frameHistory.push({
            timestamp: Date.now(),
            feedback: feedback,
            angles: angles
        });

        // Limit history size
        if (this.frameHistory.length > this.maxHistoryFrames) {
            this.frameHistory.shift();
        }

        // Get consistent feedback
        const consistentFeedback = this.getConsistentFeedback();
        
        return {
            ...consistentFeedback,
            currentAngles: angles,
            sessionStats: this.getSessionStats()
        };
    }

    /**
     * Generate exercise-specific feedback
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @param {Object} angles - Calculated angles
     * @param {string} exerciseType - Exercise type
     * @returns {Object} Feedback object
     */
    generateFeedback(landmarks, angles, exerciseType) {
        if (exerciseType === 'pushup') {
            return this.analyzePushup(landmarks, angles);
        } else if (exerciseType === 'handstand') {
            return this.analyzeHandstand(landmarks, angles);
        }
        
        return {
            primaryFeedback: "Select an exercise type",
            tips: [],
            priority: "minor",
            motivational: ""
        };
    }

    /**
     * Analyze pushup form
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @param {Object} angles - Calculated angles
     * @returns {Object} Pushup feedback
     */
    analyzePushup(landmarks, angles) {
        const feedback = {
            primaryFeedback: "",
            tips: [],
            priority: "minor",
            motivational: ""
        };

        const leftElbow = angles.elbow_angle_left;
        const rightElbow = angles.elbow_angle_right;
        
        // Critical issues first
        if (leftElbow < 70 || rightElbow < 70) {
            feedback.primaryFeedback = "⚠️ Arms too bent - push higher!";
            feedback.tips.push("Extend your arms more to complete the push-up");
            feedback.priority = "critical";
        } else if (leftElbow > 150 || rightElbow > 150) {
            feedback.primaryFeedback = "⚠️ Lower down more for full range";
            feedback.tips.push("Bend your elbows to 90-110 degrees for proper form");
            feedback.priority = "critical";
        } else {
            // Check for form issues
            const bodyAlignment = this.checkPushupBodyAlignment(landmarks);
            
            if (!bodyAlignment.straight) {
                feedback.primaryFeedback = "📐 Keep your body straight";
                feedback.tips.push("Engage your core to maintain a plank position");
                feedback.priority = "major";
            } else if (Math.abs(leftElbow - rightElbow) > 15) {
                feedback.primaryFeedback = "⚖️ Balance both arms equally";
                feedback.tips.push("Lower both arms at the same rate");
                feedback.priority = "major";
            } else {
                // Good form!
                feedback.primaryFeedback = "✅ Excellent form!";
                feedback.tips.push("Keep up this great technique");
                feedback.priority = "success";
                feedback.motivational = this.getMotivationalMessage("good");
            }
        }

        // Add specific tips
        if (leftElbow > 0 && rightElbow > 0) {
            if (leftElbow >= 90 && leftElbow <= 120 && rightElbow >= 90 && rightElbow <= 120) {
                feedback.tips.push("Perfect elbow angle range!");
            }
        }

        // Check head position
        const headPosition = this.checkHeadPosition(landmarks);
        if (!headPosition.neutral) {
            feedback.tips.push("Keep your head in neutral position");
        }

        return feedback;
    }

    /**
     * Analyze handstand form
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @param {Object} angles - Calculated angles
     * @returns {Object} Handstand feedback
     */
    analyzeHandstand(landmarks, angles) {
        const feedback = {
            primaryFeedback: "",
            tips: [],
            priority: "minor",
            motivational: ""
        };

        const leftAlignment = angles.shoulder_hip_ankle_angle_left;
        const rightAlignment = angles.shoulder_hip_ankle_angle_right;
        const leftElbow = angles.elbow_angle_left;
        const rightElbow = angles.elbow_angle_right;

        // Critical issues first
        if (leftElbow < 160 || rightElbow < 160) {
            feedback.primaryFeedback = "💪 Extend your arms fully";
            feedback.tips.push("Lock your elbows for better stability");
            feedback.priority = "critical";
        } else if (leftAlignment < 160 || rightAlignment < 160) {
            feedback.primaryFeedback = "📏 Straighten your body line";
            feedback.tips.push("Engage your core and point your toes up");
            feedback.priority = "critical";
        } else {
            // Check for balance and form
            const balance = this.checkHandstandBalance(landmarks);
            
            if (!balance.centered) {
                feedback.primaryFeedback = "⚖️ Center your weight over hands";
                feedback.tips.push("Shift your body to find the balance point");
                feedback.priority = "major";
            } else if (Math.abs(leftAlignment - rightAlignment) > 10) {
                feedback.primaryFeedback = "📐 Keep both sides aligned";
                feedback.tips.push("Engage your core evenly on both sides");
                feedback.priority = "major";
            } else {
                // Excellent handstand!
                feedback.primaryFeedback = "🌟 Amazing handstand form!";
                feedback.tips.push("Hold this position as long as you can");
                feedback.priority = "success";
                feedback.motivational = this.getMotivationalMessage("excellent");
            }
        }

        // Add specific handstand tips
        if (leftAlignment > 170 && rightAlignment > 170) {
            feedback.tips.push("Perfect body alignment!");
        }

        // Check shoulder position
        const shoulderPosition = this.checkShoulderPosition(landmarks);
        if (!shoulderPosition.stable) {
            feedback.tips.push("Keep your shoulders directly over your wrists");
        }

        return feedback;
    }

    /**
     * Check pushup body alignment
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @returns {Object} Body alignment assessment
     */
    checkPushupBodyAlignment(landmarks) {
        try {
            const shoulder = getLandmarkCoordinates(landmarks, 11);
            const hip = getLandmarkCoordinates(landmarks, 23);
            const ankle = getLandmarkCoordinates(landmarks, 27);
            
            // Calculate if body forms a straight line
            const shoulderHipDistance = Math.abs(shoulder.y - hip.y);
            const hipAnkleDistance = Math.abs(hip.y - ankle.y);
            
            const straight = shoulderHipDistance < 0.1 && hipAnkleDistance < 0.1;
            
            return { straight };
        } catch (error) {
            return { straight: true }; // Default to true if can't calculate
        }
    }

    /**
     * Check head position during pushups
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @returns {Object} Head position assessment
     */
    checkHeadPosition(landmarks) {
        try {
            const nose = getLandmarkCoordinates(landmarks, 0);
            const shoulder = getLandmarkCoordinates(landmarks, 11);
            
            // Head should be roughly in line with shoulders
            const headAlignment = Math.abs(nose.y - shoulder.y);
            const neutral = headAlignment < 0.15;
            
            return { neutral };
        } catch (error) {
            return { neutral: true };
        }
    }

    /**
     * Check handstand balance
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @returns {Object} Balance assessment
     */
    checkHandstandBalance(landmarks) {
        try {
            const leftWrist = getLandmarkCoordinates(landmarks, 15);
            const rightWrist = getLandmarkCoordinates(landmarks, 16);
            const leftShoulder = getLandmarkCoordinates(landmarks, 11);
            const rightShoulder = getLandmarkCoordinates(landmarks, 12);
            
            // Check if weight is centered over hands
            const wristCenterX = (leftWrist.x + rightWrist.x) / 2;
            const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
            
            const centered = Math.abs(wristCenterX - shoulderCenterX) < 0.1;
            
            return { centered };
        } catch (error) {
            return { centered: true };
        }
    }

    /**
     * Check shoulder position in handstand
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @returns {Object} Shoulder position assessment
     */
    checkShoulderPosition(landmarks) {
        try {
            const leftShoulder = getLandmarkCoordinates(landmarks, 11);
            const rightShoulder = getLandmarkCoordinates(landmarks, 12);
            const leftWrist = getLandmarkCoordinates(landmarks, 15);
            const rightWrist = getLandmarkCoordinates(landmarks, 16);
            
            // Shoulders should be directly over wrists
            const leftAlignment = Math.abs(leftShoulder.x - leftWrist.x);
            const rightAlignment = Math.abs(rightShoulder.x - rightWrist.x);
            
            const stable = leftAlignment < 0.05 && rightAlignment < 0.05;
            
            return { stable };
        } catch (error) {
            return { stable: true };
        }
    }

    /**
     * Get consistent feedback across multiple frames
     * @returns {Object} Consistent feedback
     */
    getConsistentFeedback() {
        if (this.frameHistory.length === 0) {
            return {
                primaryFeedback: "Get ready to start!",
                tips: [],
                priority: "minor",
                motivational: ""
            };
        }

        // Count feedback frequency
        const feedbackCount = {};
        const recentFrames = this.frameHistory.slice(-5); // Last 5 frames
        
        recentFrames.forEach(frame => {
            const key = frame.feedback.primaryFeedback;
            feedbackCount[key] = (feedbackCount[key] || 0) + 1;
        });

        // Find most frequent feedback
        let mostFrequent = "";
        let maxCount = 0;
        let mostFrequentPriority = "minor";
        let mostFrequentTips = [];
        let mostFrequentMotivational = "";

        for (const [feedback, count] of Object.entries(feedbackCount)) {
            if (count > maxCount && count >= this.consistencyThreshold * recentFrames.length) {
                maxCount = count;
                mostFrequent = feedback;
                
                // Get the corresponding full feedback
                const frame = recentFrames.find(f => f.feedback.primaryFeedback === feedback);
                if (frame) {
                    mostFrequentPriority = frame.feedback.priority;
                    mostFrequentTips = frame.feedback.tips;
                    mostFrequentMotivational = frame.feedback.motivational;
                }
            }
        }

        // Use most recent if no consistent feedback
        if (!mostFrequent) {
            const latest = this.frameHistory[this.frameHistory.length - 1].feedback;
            return {
                primaryFeedback: latest.primaryFeedback,
                tips: latest.tips,
                priority: latest.priority,
                motivational: latest.motivational
            };
        }

        return {
            primaryFeedback: mostFrequent,
            tips: mostFrequentTips,
            priority: mostFrequentPriority,
            motivational: mostFrequentMotivational
        };
    }

    /**
     * Get motivational messages based on performance
     * @param {string} level - Performance level ('good', 'excellent', 'improving')
     * @returns {string} Motivational message
     */
    getMotivationalMessage(level) {
        const messages = {
            excellent: [
                "🌟 Outstanding form! You're a natural!",
                "💫 Perfect execution! Keep it up!",
                "🏆 Flawless technique! You're crushing it!",
                "⭐ Incredible control! Well done!"
            ],
            good: [
                "💪 Great job! You're getting stronger!",
                "🔥 Nice work! Keep pushing!",
                "✨ Solid form! You're improving!",
                "👏 Well done! Stay consistent!"
            ],
            improving: [
                "📈 You're making progress! Keep going!",
                "💯 Every rep counts! Stay focused!",
                "🎯 You're on the right track!",
                "⚡ Keep practicing! You've got this!"
            ]
        };

        const levelMessages = messages[level] || messages.improving;
        return levelMessages[Math.floor(Math.random() * levelMessages.length)];
    }

    /**
     * Get session statistics
     * @returns {Object} Session statistics
     */
    getSessionStats() {
        if (this.frameHistory.length === 0) {
            return {
                totalFrames: 0,
                goodFormFrames: 0,
                goodFormPercentage: 0
            };
        }

        const totalFrames = this.frameHistory.length;
        const goodFormFrames = this.frameHistory.filter(frame => 
            frame.feedback.priority === 'success' || frame.feedback.priority === 'minor'
        ).length;

        return {
            totalFrames,
            goodFormFrames,
            goodFormPercentage: Math.round((goodFormFrames / totalFrames) * 100)
        };
    }

    /**
     * Reset coaching session
     */
    reset() {
        this.frameHistory = [];
        this.lastFeedbackTime = 0;
    }

    /**
     * Get exercise-specific tips
     * @param {string} exerciseType - Exercise type
     * @returns {Array} Array of tips
     */
    static getExerciseTips(exerciseType) {
        const tips = {
            pushup: [
                "Start in a plank position with hands shoulder-width apart",
                "Keep your body in a straight line from head to heels",
                "Lower your chest to nearly touch the ground",
                "Push back up to the starting position",
                "Keep your core engaged throughout the movement",
                "Breathe in on the way down, out on the way up"
            ],
            handstand: [
                "Start against a wall for support while learning",
                "Place hands shoulder-width apart on the ground",
                "Engage your core and keep your body straight",
                "Look at your hands, not forward",
                "Keep your arms locked and strong",
                "Practice hollow body holds to build core strength"
            ]
        };

        return tips[exerciseType] || [];
    }
} 