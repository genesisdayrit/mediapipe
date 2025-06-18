#!/usr/bin/env python3
"""
MediaPipe Pose Verification - Main Script

This script processes videos using MediaPipe Pose to detect keypoints,
calculate joint angles, and verify posture correctness for handstands and push-ups.
"""

import cv2
import mediapipe as mp
import numpy as np
import argparse
import csv
import os
import time
from utils import calculate_angle, verify_posture, draw_landmarks_and_angles

# Initialize MediaPipe
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


def process_video(video_path, exercise, output_dir="output"):
    """
    Process a video file using MediaPipe Pose and save results.
    
    Args:
        video_path (str): Path to input video
        exercise (str): Type of exercise ('handstand' or 'pushup')
        output_dir (str): Directory to save output files
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Setup video capture and writer
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Output video path
    video_name = os.path.basename(video_path).split('.')[0]
    output_video_path = os.path.join(output_dir, f"{video_name}_output.mp4")
    
    # Video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
    
    # CSV file for metrics
    metrics_path = os.path.join(output_dir, f"{video_name}_metrics.csv")
    
    # Initialize pose detection
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as pose:
        
        frame_count = 0
        total_processing_time = 0
        
        with open(metrics_path, 'w', newline='') as csvfile:
            fieldnames = ['frame', 'timestamp', 'exercise', 'elbow_angle_left', 'elbow_angle_right', 
                         'shoulder_hip_ankle_angle_left', 'shoulder_hip_ankle_angle_right', 
                         'processing_fps', 'pose_detected']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            print(f"Processing video: {video_path}")
            print(f"Exercise type: {exercise}")
            print(f"Output video: {output_video_path}")
            print(f"Metrics file: {metrics_path}")
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                start_time = time.time()
                
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Process frame with MediaPipe
                results = pose.process(frame_rgb)
                
                # Calculate processing time
                processing_time = time.time() - start_time
                total_processing_time += processing_time
                processing_fps = 1.0 / processing_time if processing_time > 0 else 0
                
                # Initialize metrics
                metrics = {
                    'frame': frame_count,
                    'timestamp': frame_count / fps,
                    'exercise': exercise,
                    'elbow_angle_left': 0,
                    'elbow_angle_right': 0,
                    'shoulder_hip_ankle_angle_left': 0,
                    'shoulder_hip_ankle_angle_right': 0,
                    'processing_fps': processing_fps,
                    'pose_detected': False
                }
                
                # Process landmarks if detected
                if results.pose_landmarks:
                    metrics['pose_detected'] = True
                    landmarks = results.pose_landmarks.landmark
                    
                    # Calculate angles based on exercise type
                    angles = verify_posture(landmarks, exercise)
                    metrics.update(angles)
                    
                    # Draw landmarks and angles on frame
                    draw_landmarks_and_angles(frame, results, angles, exercise)
                
                # Write metrics to CSV
                writer.writerow(metrics)
                
                # Write frame to output video
                out.write(frame)
                
                # Display progress
                if frame_count % 30 == 0:  # Print every 30 frames
                    print(f"Processed {frame_count} frames, Avg FPS: {frame_count/total_processing_time:.2f}")
    
    # Cleanup
    cap.release()
    out.release()
    
    # Print summary
    avg_fps = frame_count / total_processing_time if total_processing_time > 0 else 0
    print(f"\nProcessing complete!")
    print(f"Total frames: {frame_count}")
    print(f"Average processing FPS: {avg_fps:.2f}")
    print(f"Output saved to: {output_video_path}")
    print(f"Metrics saved to: {metrics_path}")


def main():
    """Main function to parse arguments and process video."""
    parser = argparse.ArgumentParser(
        description="Verify MediaPipe Pose on exercise videos",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python src/main.py --video data/handstand.mp4 --exercise handstand
  python src/main.py --video data/pushup.mp4 --exercise pushup
        """
    )
    parser.add_argument(
        '--video', 
        required=True, 
        help="Path to input video file"
    )
    parser.add_argument(
        '--exercise', 
        required=True, 
        choices=['handstand', 'pushup'], 
        help="Exercise type to analyze"
    )
    parser.add_argument(
        '--output', 
        default='output', 
        help="Output directory (default: output)"
    )
    
    args = parser.parse_args()
    
    # Validate input file
    if not os.path.exists(args.video):
        print(f"Error: Video file '{args.video}' not found!")
        return
    
    # Process the video
    try:
        process_video(args.video, args.exercise, args.output)
    except Exception as e:
        print(f"Error processing video: {e}")
        return


if __name__ == "__main__":
    main() 