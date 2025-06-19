/**
 * AI Pose Coach - JavaScript equivalent of Python pose_coach.py
 * Provides intelligent coaching feedback for exercise form with ElevenLabs voice integration
 */

import { verifyPosture, getLandmarkCoordinates } from './utils.js';

export class PoseCoach {
    constructor(speakCallback = null) {
        this.frameHistory = [];
        this.maxHistoryFrames = 10;
        this.consistencyThreshold = 0.7;
        this.lastFeedbackTime = 0;
        this.feedbackCooldown = 1000; // 1 second
        
        // --- Voice Coaching System ---
        this.speakCallback = speakCallback;
        this.lastSpokenFeedback = { type: '', time: 0 };
        this.speechCooldown = 4000; // 4 seconds between spoken feedback
        this.recentFeedbackTypes = []; // Track recent feedback to avoid repetition
        this.maxRecentFeedback = 3;
        
        // Voice feedback variations - inspired by Python script
        this.feedbackVariations = {
            // Pushup - Rep completion and form
            'pushup_rep_completed': [
                "Perfect form! That's {reps} reps!",
                "Excellent! {reps} down, keep it up!",
                "Outstanding form! {reps} reps completed!",
                "Beautiful push-up! That's {reps}!",
                "Fantastic! {reps} perfect reps!"
            ],
            'pushup_good_form': [
                "Perfect form! Keep it up!",
                "Excellent technique!",
                "That's how it's done!",
                "Beautiful form!",
                "Outstanding control!",
                "Perfect push-up form!"
            ],
            'pushup_good_depth': [
                "Good depth! Now push up strong!",
                "Perfect depth! Drive up with power!",
                "Excellent range! Now explode up!",
                "Great depth! Push through those arms!",
                "Nice low position! Now drive up!"
            ],
            'pushup_need_depth': [
                "Go deeper! Get that chest closer to the ground!",
                "Lower down more! Full range of motion!",
                "Deeper! Touch that chest to the floor!",
                "More depth! Get lower on the way down!",
                "Go all the way down! Full push-up!"
            ],
            'pushup_need_extension': [
                "Lock out those arms! Full extension!",
                "Push all the way up! Straighten those arms!",
                "Complete the rep! Arms fully extended!",
                "All the way up! Lock those elbows!",
                "Full extension! Push to the top!"
            ],
            'pushup_body_alignment': [
                "Keep your body straight! Engage that core!",
                "Straight line from head to heels!",
                "Tighten that core! Hold the plank position!",
                "Body alignment! Keep it straight!",
                "Engage your core! Perfect plank form!"
            ],
            
            // Handstand feedback
            'handstand_entry': [
                "Awesome! You're in a handstand!",
                "Incredible! Perfect handstand entry!",
                "Amazing balance! You're inverted!",
                "Outstanding! Handstand achieved!",
                "Fantastic! You nailed the handstand!"
            ],
            'handstand_exit': [
                "Nice work! Try to hold it longer next time!",
                "Great effort! Build up that hold time!",
                "Good attempt! Work on extending the hold!",
                "Well done! Keep practicing those holds!",
                "Nice try! Aim for a longer handstand next time!"
            ],
            'handstand_perfect_form': [
                "Perfect line! Hold steady!",
                "Outstanding alignment! Stay strong!",
                "Beautiful handstand! Maintain it!",
                "Incredible form! Keep it up!",
                "Perfect balance! Hold that position!"
            ],
            'handstand_body_alignment': [
                "Keep that body straight! Engage your core!",
                "Straighten that line! Core tight!",
                "Body alignment! Pull everything in line!",
                "Engage that core! Straight body position!",
                "Tighten up! Keep that perfect line!"
            ],
            'handstand_arm_extension': [
                "Lock those elbows! Full arm extension!",
                "Straighten those arms! Push the ground away!",
                "Extend your arms fully for better stability!",
                "Lock out those arms! Strong foundation!",
                "Full arm extension! Push through your hands!"
            ],
            
            // General encouragement
            'general_encouragement': [
                "You're doing great! Keep pushing!",
                "Excellent work! Don't give up!",
                "Amazing effort! Stay focused!",
                "You've got this! Keep going!",
                "Outstanding! Push through!",
                "Incredible dedication! Keep it up!"
            ],
            
            // Milestone celebrations
            'milestone_5_reps': [
                "Five reps! You're on fire!",
                "That's five! Amazing work!",
                "Five perfect reps! Keep the momentum!",
                "Five down! You're crushing it!",
                "Five reps complete! Unstoppable!"
            ],
            'milestone_10_reps': [
                "Ten reps! You're a machine!",
                "Double digits! Incredible strength!",
                "Ten perfect reps! Outstanding!",
                "That's ten! You're dominating!",
                "Ten reps! Absolutely crushing it!"
            ],
            'milestone_15_reps': [
                "Fifteen reps! Unbelievable!",
                "Fifteen! You're in beast mode!",
                "Fifteen perfect reps! Legendary!",
                "That's fifteen! Absolutely amazing!",
                "Fifteen reps! You're unstoppable!"
            ],
            
            // Welcome and mode switches
            'welcome_start': [
                "Voice coach ready! Show me your exercise form!",
                "Let's get started! Time to work on that form!",
                "Ready to coach! Let's see what you've got!",
                "Voice coach activated! Bring your best effort!",
                "I'm here to help! Let's perfect that technique!"
            ]
        };
        
        // Exercise state tracking for rep counting
        this.exerciseState = {
            pushup: { position: 'up', repCount: 0, lastRepTime: 0 },
            handstand: { isInHandstand: false, entryTime: 0, repCount: 0 }
        };
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
     * Analyze pushup form with voice coaching
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
        const avgElbow = (leftElbow + rightElbow) / 2;
        
        // Track rep progression for voice feedback
        const now = Date.now();
        const currentState = this.exerciseState.pushup;
        
        // Rep counting and voice feedback
        if (avgElbow > 160 && currentState.position === 'down') {
            // Moving to up position - rep completed
            currentState.position = 'up';
            currentState.repCount++;
            currentState.lastRepTime = now;
            
            // Voice feedback for rep milestones
            if (currentState.repCount === 5) {
                this.speak('milestone_5_reps', {}, true);
            } else if (currentState.repCount === 10) {
                this.speak('milestone_10_reps', {}, true);
            } else if (currentState.repCount === 15) {
                this.speak('milestone_15_reps', {}, true);
            } else if (currentState.repCount % 5 === 0 && currentState.repCount > 15) {
                this.speak('pushup_rep_completed', { reps: currentState.repCount }, true);
            } else {
                this.speak('pushup_good_form');
            }
        } else if (avgElbow < 90 && currentState.position === 'up') {
            // Moving to down position
            currentState.position = 'down';
            this.speak('pushup_good_depth');
        }
        
        // Critical issues first
        if (leftElbow < 70 || rightElbow < 70) {
            feedback.primaryFeedback = "⚠️ Arms too bent - push higher!";
            feedback.tips.push("Extend your arms more to complete the push-up");
            feedback.priority = "critical";
            this.speak('pushup_need_extension');
        } else if (leftElbow > 150 || rightElbow > 150) {
            feedback.primaryFeedback = "⚠️ Lower down more for full range";
            feedback.tips.push("Bend your elbows to 90-110 degrees for proper form");
            feedback.priority = "critical";
            this.speak('pushup_need_depth');
        } else {
            // Check for form issues
            const bodyAlignment = this.checkPushupBodyAlignment(landmarks);
            
            if (!bodyAlignment.straight) {
                feedback.primaryFeedback = "📐 Keep your body straight";
                feedback.tips.push("Engage your core to maintain a plank position");
                feedback.priority = "major";
                this.speak('pushup_body_alignment');
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
                
                // Only speak good form occasionally to avoid spam
                if (now - currentState.lastRepTime > 3000) {
                    this.speak('pushup_good_form');
                }
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
     * Analyze handstand form with voice coaching
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
        
        // Check if person is inverted (basic handstand detection)
        const isInverted = this.checkHandstandInversion(landmarks);
        const now = Date.now();
        const currentState = this.exerciseState.handstand;
        
        // Handstand entry/exit detection with voice feedback
        if (isInverted && !currentState.isInHandstand) {
            // Just entered handstand
            currentState.isInHandstand = true;
            currentState.entryTime = now;
            currentState.repCount++;
            this.speak('handstand_entry', {}, true);
        } else if (!isInverted && currentState.isInHandstand) {
            // Just exited handstand
            currentState.isInHandstand = false;
            const holdTime = (now - currentState.entryTime) / 1000;
            this.speak('handstand_exit', { holdTime: holdTime.toFixed(1) }, true);
        }

        // Critical issues first
        if (leftElbow < 160 || rightElbow < 160) {
            feedback.primaryFeedback = "💪 Extend your arms fully";
            feedback.tips.push("Lock your elbows for better stability");
            feedback.priority = "critical";
            this.speak('handstand_arm_extension');
        } else if (leftAlignment < 160 || rightAlignment < 160) {
            feedback.primaryFeedback = "📏 Straighten your body line";
            feedback.tips.push("Engage your core and point your toes up");
            feedback.priority = "critical";
            this.speak('handstand_body_alignment');
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
                this.speak('handstand_body_alignment');
            } else {
                // Excellent handstand!
                feedback.primaryFeedback = "🌟 Amazing handstand form!";
                feedback.tips.push("Hold this position as long as you can");
                feedback.priority = "success";
                feedback.motivational = this.getMotivationalMessage("excellent");
                
                // Only speak perfect form occasionally during holds
                if (currentState.isInHandstand && (now - currentState.entryTime) > 2000) {
                    this.speak('handstand_perfect_form');
                }
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
     * Check if person is in handstand (inverted) position
     * @param {Array} landmarks - MediaPipe pose landmarks
     * @returns {boolean} Whether person is inverted
     */
    checkHandstandInversion(landmarks) {
        try {
            const leftShoulder = getLandmarkCoordinates(landmarks, 11);
            const leftWrist = getLandmarkCoordinates(landmarks, 15);
            const leftHip = getLandmarkCoordinates(landmarks, 23);
            
            // Check if wrists are above shoulders and shoulders are above hips (inverted)
            const wristsAboveShoulders = leftWrist.y < leftShoulder.y;
            const shouldersAboveHips = leftShoulder.y < leftHip.y;
            
            return wristsAboveShoulders && shouldersAboveHips;
        } catch (error) {
            return false;
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
        
        // Reset voice coaching state
        this.lastSpokenFeedback = { type: '', time: 0 };
        this.recentFeedbackTypes = [];
        
        // Reset exercise state tracking
        this.exerciseState = {
            pushup: { position: 'up', repCount: 0, lastRepTime: 0 },
            handstand: { isInHandstand: false, entryTime: 0, repCount: 0 }
        };
        
        console.log('🔄 PoseCoach reset - ready for new session');
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

    /**
     * Get a random variation of feedback message
     * @param {string} feedbackType - Type of feedback
     * @param {Object} context - Context for message formatting (e.g., reps)
     * @returns {string} Formatted feedback message
     */
    getFeedback(feedbackType, context = {}) {
        if (!this.feedbackVariations[feedbackType]) {
            console.warn(`Feedback type "${feedbackType}" not found in variations`);
            return `Keep going! ${feedbackType}`;
        }
        
        const variations = this.feedbackVariations[feedbackType];
        const selected = variations[Math.floor(Math.random() * variations.length)];
        
        // Format with context (e.g., rep count)
        try {
            return selected.replace(/\{(\w+)\}/g, (match, key) => {
                return context[key] !== undefined ? context[key] : match;
            });
        } catch (error) {
            console.warn('Error formatting feedback message:', error);
            return selected;
        }
    }

    /**
     * Speak feedback with cooldown and anti-repetition logic
     * @param {string} feedbackType - Type of feedback to speak
     * @param {Object} context - Context for message formatting
     * @param {boolean} priority - Whether to bypass cooldown for important messages
     */
    speak(feedbackType, context = {}, priority = false) {
        // Check if speech callback is available
        if (!this.speakCallback || typeof this.speakCallback !== 'function') {
            return;
        }
        
        const now = Date.now();
        const timeSinceLastSpoken = now - this.lastSpokenFeedback.time;
        
        // Cooldown check - bypass for priority messages
        if (!priority && timeSinceLastSpoken < this.speechCooldown) {
            return;
        }
        
        // Anti-repetition check - don't repeat recent feedback types
        if (!priority && this.recentFeedbackTypes.includes(feedbackType)) {
            return;
        }
        
        // Generate and speak the message
        const message = this.getFeedback(feedbackType, context);
        if (message) {
            console.log(`🔊 Speaking: ${message}`);
            this.speakCallback(message);
            
            // Update tracking
            this.lastSpokenFeedback = { type: feedbackType, time: now };
            this.recentFeedbackTypes.push(feedbackType);
            
            // Limit recent feedback history
            if (this.recentFeedbackTypes.length > this.maxRecentFeedback) {
                this.recentFeedbackTypes.shift();
            }
        }
    }
} 