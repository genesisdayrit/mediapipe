#!/usr/bin/env python3
"""
MediaPipe Pose Verification - Utility Functions

This module contains utility functions for calculating joint angles,
verifying postures, and visualizing results.
"""

import cv2
import mediapipe as mp
import numpy as np
import json
import os

# MediaPipe pose landmarks
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


def calculate_angle(point_a, point_b, point_c):
    """
    Calculate the angle between three points.
    
    Args:
        point_a (tuple): First point (x, y)
        point_b (tuple): Middle point (vertex) (x, y)
        point_c (tuple): Third point (x, y)
    
    Returns:
        float: Angle in degrees
    """
    a = np.array(point_a)
    b = np.array(point_b)
    c = np.array(point_c)
    
    # Calculate vectors
    ba = a - b
    bc = c - b
    
    # Calculate angle using dot product
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    
    # Handle numerical errors
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    
    # Convert to degrees
    angle = np.arccos(cosine_angle)
    angle_degrees = np.degrees(angle)
    
    return angle_degrees


def get_landmark_coordinates(landmarks, landmark_index):
    """
    Extract x, y coordinates from a MediaPipe landmark.
    
    Args:
        landmarks: MediaPipe pose landmarks
        landmark_index: Index of the landmark
    
    Returns:
        tuple: (x, y) coordinates
    """
    landmark = landmarks[landmark_index]
    return (landmark.x, landmark.y)


def verify_posture(landmarks, exercise):
    """
    Verify posture based on exercise type and calculate relevant angles.
    
    Args:
        landmarks: MediaPipe pose landmarks
        exercise (str): Exercise type ('handstand' or 'pushup')
    
    Returns:
        dict: Dictionary containing calculated angles
    """
    angles = {}
    
    try:
        if exercise == 'pushup':
            # Calculate elbow angles for push-ups
            # Left arm
            left_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            left_elbow = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_ELBOW.value)
            left_wrist = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_WRIST.value)
            angles['elbow_angle_left'] = calculate_angle(left_shoulder, left_elbow, left_wrist)
            
            # Right arm
            right_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
            right_elbow = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_ELBOW.value)
            right_wrist = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_WRIST.value)
            angles['elbow_angle_right'] = calculate_angle(right_shoulder, right_elbow, right_wrist)
            
        elif exercise == 'handstand':
            # Calculate body alignment angles for handstands
            # Left side body alignment (shoulder-hip-ankle)
            left_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            left_hip = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_HIP.value)
            left_ankle = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_ANKLE.value)
            angles['shoulder_hip_ankle_angle_left'] = calculate_angle(left_shoulder, left_hip, left_ankle)
            
            # Right side body alignment
            right_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
            right_hip = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_HIP.value)
            right_ankle = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_ANKLE.value)
            angles['shoulder_hip_ankle_angle_right'] = calculate_angle(right_shoulder, right_hip, right_ankle)
            
            # Also calculate elbow angles for arm stability
            left_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            left_elbow = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_ELBOW.value)
            left_wrist = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.LEFT_WRIST.value)
            angles['elbow_angle_left'] = calculate_angle(left_shoulder, left_elbow, left_wrist)
            
            right_shoulder = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
            right_elbow = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_ELBOW.value)
            right_wrist = get_landmark_coordinates(landmarks, mp_pose.PoseLandmark.RIGHT_WRIST.value)
            angles['elbow_angle_right'] = calculate_angle(right_shoulder, right_elbow, right_wrist)
            
    except (IndexError, ValueError) as e:
        print(f"Error calculating angles: {e}")
        # Return default values if calculation fails
        angles = {
            'elbow_angle_left': 0,
            'elbow_angle_right': 0,
            'shoulder_hip_ankle_angle_left': 0,
            'shoulder_hip_ankle_angle_right': 0
        }
    
    return angles


def load_reference_data():
    """
    Load reference posture data from JSON file.
    
    Returns:
        dict: Reference posture data
    """
    reference_path = os.path.join('data', 'reference.json')
    try:
        with open(reference_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: Reference file {reference_path} not found. Using default values.")
        return {
            "pushup": {
                "elbow_angle": [90, 120]
            },
            "handstand": {
                "shoulder_hip_ankle_angle": [170, 180],
                "elbow_angle": [160, 180]
            }
        }


def check_posture_correctness(angles, exercise):
    """
    Check if the calculated angles fall within expected ranges.
    
    Args:
        angles (dict): Calculated angles
        exercise (str): Exercise type
    
    Returns:
        dict: Correctness assessment for each angle
    """
    reference = load_reference_data()
    correctness = {}
    
    if exercise in reference:
        exercise_ref = reference[exercise]
        
        for angle_name, angle_value in angles.items():
            # Map angle names to reference keys
            if 'elbow_angle' in angle_name and 'elbow_angle' in exercise_ref:
                min_angle, max_angle = exercise_ref['elbow_angle']
                correctness[angle_name] = min_angle <= angle_value <= max_angle
            elif 'shoulder_hip_ankle' in angle_name and 'shoulder_hip_ankle_angle' in exercise_ref:
                min_angle, max_angle = exercise_ref['shoulder_hip_ankle_angle']
                correctness[angle_name] = min_angle <= angle_value <= max_angle
    
    return correctness


def draw_landmarks_and_angles(frame, results, angles, exercise):
    """
    Draw pose landmarks and angle information on the frame.
    
    Args:
        frame: OpenCV frame
        results: MediaPipe pose results
        angles (dict): Calculated angles
        exercise (str): Exercise type
    """
    # Draw pose landmarks
    mp_drawing.draw_landmarks(
        frame, 
        results.pose_landmarks, 
        mp_pose.POSE_CONNECTIONS,
        mp_drawing.DrawingSpec(color=(245, 117, 66), thickness=2, circle_radius=2),
        mp_drawing.DrawingSpec(color=(245, 66, 230), thickness=2)
    )
    
    # Draw angle information
    y_offset = 30
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.6
    thickness = 2
    
    # Check posture correctness
    correctness = check_posture_correctness(angles, exercise)
    
    # Display angles with color coding
    for angle_name, angle_value in angles.items():
        if angle_value > 0:  # Only display non-zero angles
            # Color based on correctness
            color = (0, 255, 0) if correctness.get(angle_name, False) else (0, 0, 255)
            
            # Format angle name for display
            display_name = angle_name.replace('_', ' ').title()
            text = f"{display_name}: {angle_value:.1f}°"
            
            cv2.putText(frame, text, (10, y_offset), font, font_scale, color, thickness)
            y_offset += 25
    
    # Display exercise type
    cv2.putText(frame, f"Exercise: {exercise.title()}", (10, frame.shape[0] - 10), 
                font, 0.7, (255, 255, 255), 2)


def analyze_video_metrics(csv_path):
    """
    Analyze metrics from a processed video CSV file.
    
    Args:
        csv_path (str): Path to the metrics CSV file
    
    Returns:
        dict: Analysis summary
    """
    import pandas as pd
    
    try:
        df = pd.read_csv(csv_path)
        
        summary = {
            'total_frames': len(df),
            'frames_with_pose': df['pose_detected'].sum(),
            'pose_detection_rate': df['pose_detected'].mean() * 100,
            'avg_processing_fps': df['processing_fps'].mean(),
            'angle_statistics': {}
        }
        
        # Calculate angle statistics for frames with detected poses
        pose_frames = df[df['pose_detected'] == True]
        
        angle_columns = [col for col in df.columns if 'angle' in col]
        for col in angle_columns:
            if not pose_frames[col].empty:
                summary['angle_statistics'][col] = {
                    'mean': pose_frames[col].mean(),
                    'std': pose_frames[col].std(),
                    'min': pose_frames[col].min(),
                    'max': pose_frames[col].max()
                }
        
        return summary
        
    except Exception as e:
        print(f"Error analyzing metrics: {e}")
        return None 