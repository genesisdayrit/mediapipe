#!/usr/bin/env python3
"""
Pose Coaching Module for MediaPipe Pose Verification

This module provides real-time feedback and coaching tips for improving
pushup and handstand form based on detected pose angles and landmarks.
"""

import mediapipe as mp
import numpy as np
from utils import calculate_angle, get_landmark_coordinates

# MediaPipe pose landmarks
mp_pose = mp.solutions.pose


class PoseCoach:
    """Real-time pose coaching for exercise form improvement."""
    
    def __init__(self, exercise_type):
        self.exercise_type = exercise_type
        self.feedback_history = []
        self.max_history = 10  # Keep last 10 feedback entries for consistency
        
        # Reference ranges for good form
        self.reference_ranges = {
            'pushup': {
                'elbow_angle': (90, 120),
                'body_alignment': (160, 180),  # shoulder-hip-knee alignment
                'head_neck_angle': (150, 180)
            },
            'handstand': {
                'elbow_angle': (160, 180),
                'body_alignment': (170, 180),  # shoulder-hip-ankle alignment
                'shoulder_stability': (80, 100)  # shoulder angle for stability
            }
        }
        
        # Feedback priorities (higher number = more important)
        self.feedback_priorities = {
            'critical': 3,  # Safety issues
            'major': 2,     # Form issues affecting effectiveness
            'minor': 1      # Fine-tuning suggestions
        }
    
    def analyze_pushup_form(self, landmarks, angles):
        """
        Analyze pushup form and provide specific feedback.
        
        Args:
            landmarks: MediaPipe pose landmarks
            angles: Calculated angles dictionary
        
        Returns:
            dict: Feedback with priority levels
        """
        feedback = []
        
        # Check elbow angles
        left_elbow = angles.get('elbow_angle_left', 0)
        right_elbow = angles.get('elbow_angle_right', 0)
        
        if left_elbow > 0 and right_elbow > 0:
            avg_elbow = (left_elbow + right_elbow) / 2
            elbow_diff = abs(left_elbow - right_elbow)
            
            # Elbow angle feedback
            if avg_elbow < 70:
                feedback.append({
                    'message': "Elbows too narrow - widen your arm position",
                    'priority': 'major',
                    'icon': '↔️'
                })
            elif avg_elbow > 140:
                feedback.append({
                    'message': "Elbows too wide - bring arms closer to body",
                    'priority': 'major',
                    'icon': '↩️'
                })
            elif avg_elbow < 90:
                feedback.append({
                    'message': "Go deeper - lower your chest more",
                    'priority': 'minor',
                    'icon': '⬇️'
                })
            elif avg_elbow > 120:
                feedback.append({
                    'message': "Don't go too deep - raise up slightly",
                    'priority': 'minor',
                    'icon': '⬆️'
                })
            
            # Asymmetry check
            if elbow_diff > 15:
                feedback.append({
                    'message': "Uneven arms - keep elbows symmetric",
                    'priority': 'major',
                    'icon': '⚖️'
                })
        
        # Check body alignment
        try:
            # Calculate body line (shoulder-hip-knee)
            left_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            left_hip = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_HIP.value)
            left_knee = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_KNEE.value)
            
            body_angle = calculate_angle(left_shoulder, left_hip, left_knee)
            
            if body_angle < 150:
                feedback.append({
                    'message': "Keep your body straight - engage your core",
                    'priority': 'critical',
                    'icon': '📐'
                })
            elif body_angle < 160:
                feedback.append({
                    'message': "Slight hip sag - tighten your core",
                    'priority': 'major',
                    'icon': '💪'
                })
        except:
            pass
        
        # Check head position
        try:
            nose = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.NOSE.value)
            left_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            
            # If head is significantly forward of shoulders
            head_forward = nose[0] - left_shoulder[0]
            if abs(head_forward) > 0.1:  # Threshold for head position
                feedback.append({
                    'message': "Keep head neutral - look down at floor",
                    'priority': 'minor',
                    'icon': '👀'
                })
        except:
            pass
        
        return feedback
    
    def analyze_handstand_form(self, landmarks, angles):
        """
        Analyze handstand form and provide specific feedback.
        
        Args:
            landmarks: MediaPipe pose landmarks
            angles: Calculated angles dictionary
        
        Returns:
            dict: Feedback with priority levels
        """
        feedback = []
        
        # Check body alignment (most critical for handstands)
        left_alignment = angles.get('shoulder_hip_ankle_angle_left', 0)
        right_alignment = angles.get('shoulder_hip_ankle_angle_right', 0)
        
        if left_alignment > 0 and right_alignment > 0:
            avg_alignment = (left_alignment + right_alignment) / 2
            alignment_diff = abs(left_alignment - right_alignment)
            
            # Body line feedback
            if avg_alignment < 160:
                feedback.append({
                    'message': "Banana shape detected - push hips forward",
                    'priority': 'critical',
                    'icon': '🍌'
                })
            elif avg_alignment < 170:
                feedback.append({
                    'message': "Slight arch - engage core, push hips up",
                    'priority': 'major',
                    'icon': '⬆️'
                })
            elif avg_alignment > 185:
                feedback.append({
                    'message': "Pike position - open shoulders, lean forward",
                    'priority': 'major',
                    'icon': '📐'
                })
            
            # Asymmetry check
            if alignment_diff > 10:
                feedback.append({
                    'message': "Body tilted - center your weight",
                    'priority': 'major',
                    'icon': '⚖️'
                })
        
        # Check arm extension
        left_elbow = angles.get('elbow_angle_left', 0)
        right_elbow = angles.get('elbow_angle_right', 0)
        
        if left_elbow > 0 and right_elbow > 0:
            avg_elbow = (left_elbow + right_elbow) / 2
            
            if avg_elbow < 150:
                feedback.append({
                    'message': "Bent arms - fully extend your elbows",
                    'priority': 'critical',
                    'icon': '💪'
                })
            elif avg_elbow < 160:
                feedback.append({
                    'message': "Lock out your arms completely",
                    'priority': 'major',
                    'icon': '🔒'
                })
        
        # Check shoulder position
        try:
            left_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            left_wrist = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_WRIST.value)
            left_elbow = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_ELBOW.value)
            
            # Check if shoulders are over hands
            shoulder_wrist_diff = abs(left_shoulder[0] - left_wrist[0])
            if shoulder_wrist_diff > 0.1:  # Threshold for shoulder position
                if left_shoulder[0] > left_wrist[0]:
                    feedback.append({
                        'message': "Lean forward - shoulders over hands",
                        'priority': 'major',
                        'icon': '↗️'
                    })
                else:
                    feedback.append({
                        'message': "Too far forward - shift weight back",
                        'priority': 'major',
                        'icon': '↙️'
                    })
        except:
            pass
        
        return feedback
    
    def get_form_feedback(self, landmarks, angles):
        """
        Get comprehensive form feedback for the current exercise.
        
        Args:
            landmarks: MediaPipe pose landmarks
            angles: Calculated angles dictionary
        
        Returns:
            dict: Primary feedback message and additional tips
        """
        if self.exercise_type == 'pushup':
            feedback_list = self.analyze_pushup_form(landmarks, angles)
        elif self.exercise_type == 'handstand':
            feedback_list = self.analyze_handstand_form(landmarks, angles)
        else:
            return {'primary': "Keep up the good work!", 'tips': [], 'priority': 'minor'}
        
        # Add feedback to history for consistency
        self.feedback_history.append(feedback_list)
        if len(self.feedback_history) > self.max_history:
            self.feedback_history.pop(0)
        
        # Find most consistent feedback
        primary_feedback = self._get_consistent_feedback()
        
        return primary_feedback
    
    def _get_consistent_feedback(self):
        """
        Get the most consistent and important feedback from recent history.
        
        Returns:
            dict: Primary feedback message with priority
        """
        if not self.feedback_history:
            return {'primary': "Great form! Keep it up!", 'tips': [], 'priority': 'minor', 'icon': '✅'}
        
        # Flatten all feedback from recent history
        all_feedback = []
        for frame_feedback in self.feedback_history[-5:]:  # Last 5 frames
            all_feedback.extend(frame_feedback)
        
        if not all_feedback:
            return {'primary': "Perfect form! Well done!", 'tips': [], 'priority': 'minor', 'icon': '⭐'}
        
        # Count frequency of each message
        message_counts = {}
        for feedback in all_feedback:
            msg = feedback['message']
            if msg not in message_counts:
                message_counts[msg] = {'count': 0, 'feedback': feedback}
            message_counts[msg]['count'] += 1
        
        # Find most frequent critical/major issues
        critical_feedback = []
        major_feedback = []
        minor_feedback = []
        
        for msg, data in message_counts.items():
            if data['count'] >= 2:  # Appeared in at least 2 recent frames
                feedback = data['feedback']
                if feedback['priority'] == 'critical':
                    critical_feedback.append(feedback)
                elif feedback['priority'] == 'major':
                    major_feedback.append(feedback)
                else:
                    minor_feedback.append(feedback)
        
        # Return highest priority consistent feedback
        if critical_feedback:
            primary = critical_feedback[0]
            tips = [f['message'] for f in major_feedback[:2]]  # Add 2 major tips
        elif major_feedback:
            primary = major_feedback[0]
            tips = [f['message'] for f in major_feedback[1:3]]  # Add 2 more major tips
        elif minor_feedback:
            primary = minor_feedback[0]
            tips = [f['message'] for f in minor_feedback[1:3]]
        else:
            return {'primary': "Excellent technique!", 'tips': [], 'priority': 'minor', 'icon': '🏆'}
        
        return {
            'primary': primary['message'],
            'tips': tips,
            'priority': primary['priority'],
            'icon': primary.get('icon', '💡')
        }
    
    def get_encouragement_message(self, session_time, good_form_percentage):
        """
        Get motivational messages based on performance.
        
        Args:
            session_time: Current session duration in seconds
            good_form_percentage: Percentage of frames with good form
        
        Returns:
            str: Encouragement message
        """
        messages = {
            'excellent': [
                "Outstanding form! You're a natural! 🌟",
                "Perfect technique! Keep this up! 💪",
                "Incredible control and precision! 🎯",
                "You've mastered this exercise! 👑"
            ],
            'good': [
                "Great job! Your form is improving! 💪",
                "Nice work! Keep focusing on technique! 👍",
                "Solid performance! You're getting stronger! 🔥",
                "Good form! Stay consistent! ⭐"
            ],
            'improving': [
                "Keep practicing! You're getting better! 📈",
                "Focus on the feedback - you've got this! 💪",
                "Every rep counts! Keep improving! 🎯",
                "Stay strong! Technique comes with practice! 🏋️"
            ],
            'beginner': [
                "Great start! Focus on quality over quantity! 🌱",
                "Building good habits! Keep it up! 📚",
                "Learning proper form is key! You're doing great! 🎓",
                "Take your time - perfect practice makes perfect! ⏰"
            ]
        }
        
        # Choose message category based on performance
        if good_form_percentage >= 90:
            category = 'excellent'
        elif good_form_percentage >= 70:
            category = 'good'
        elif good_form_percentage >= 50:
            category = 'improving'
        else:
            category = 'beginner'
        
        # Select message based on session time (rotate through messages)
        message_index = int(session_time // 10) % len(messages[category])
        return messages[category][message_index]
    
    def get_exercise_specific_tips(self):
        """Get general tips specific to the current exercise."""
        tips = {
            'pushup': [
                "💡 Tip: Keep your core tight throughout the movement",
                "💡 Tip: Breathe in going down, breathe out pushing up",
                "💡 Tip: Your body should move as one rigid plank",
                "💡 Tip: Focus on controlled movement, not speed",
                "💡 Tip: Hand placement should be slightly wider than shoulders"
            ],
            'handstand': [
                "💡 Tip: Press firmly through your fingertips for control",
                "💡 Tip: Engage your core as if someone's about to punch you",
                "💡 Tip: Look at your hands, not forward",
                "💡 Tip: Squeeze your glutes to maintain straight line",
                "💡 Tip: Practice hollow body holds to build core strength"
            ]
        }
        
        return tips.get(self.exercise_type, ["Keep practicing! 💪"]) 