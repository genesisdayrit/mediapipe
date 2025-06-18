#!/usr/bin/env python3
"""
MediaPipe Pose Verification - Live Camera Analysis

This script provides real-time pose analysis using your camera with immediate
visual feedback for handstands and push-ups.
"""

import cv2
import mediapipe as mp
import numpy as np
import argparse
import csv
import os
import time
from datetime import datetime
from utils import calculate_angle, verify_posture, draw_landmarks_and_angles, check_posture_correctness
from pose_coach import PoseCoach

# Initialize MediaPipe
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


class LivePoseAnalyzer:
    """Real-time pose analyzer for live camera input."""
    
    def __init__(self, exercise_type, camera_id=0, save_session=False, output_dir="output"):
        self.exercise_type = exercise_type
        self.camera_id = camera_id
        self.save_session = save_session
        self.output_dir = output_dir
        
        # Initialize pose detection
        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.7,  # Higher confidence for live
            min_tracking_confidence=0.5
        )
        
        # Session tracking
        self.session_data = []
        self.frame_count = 0
        self.start_time = time.time()
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Performance tracking
        self.fps_history = []
        self.pose_detection_count = 0
        
        # Real-time feedback
        self.current_status = "Ready"
        self.current_angles = {}
        self.form_feedback = {}
        
        # Initialize pose coach
        self.pose_coach = PoseCoach(exercise_type)
        self.good_form_frames = 0
        self.current_coaching_feedback = {'primary': "Get ready!", 'tips': [], 'priority': 'minor', 'icon': '🏃'}
        
        # Video recording setup
        self.video_writer = None
        if save_session:
            os.makedirs(output_dir, exist_ok=True)
    
    def initialize_camera(self):
        """Initialize camera capture."""
        self.cap = cv2.VideoCapture(self.camera_id)
        
        # Set camera properties for better performance
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open camera {self.camera_id}")
        
        # Get actual camera properties
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        
        print(f"Camera initialized: {self.width}x{self.height} @ {self.fps}fps")
        
        # Initialize video writer if saving session
        if self.save_session:
            output_path = os.path.join(self.output_dir, f"live_session_{self.session_id}.mp4")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            self.video_writer = cv2.VideoWriter(output_path, fourcc, 30, (self.width, self.height))
            print(f"Recording session to: {output_path}")
    
    def process_frame(self, frame):
        """Process a single frame for pose detection and analysis."""
        self.frame_count += 1
        frame_start_time = time.time()
        
        # Convert BGR to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = self.pose.process(frame_rgb)
        
        # Initialize frame data
        frame_data = {
            'frame': self.frame_count,
            'timestamp': time.time() - self.start_time,
            'exercise': self.exercise_type,
            'pose_detected': False,
            'elbow_angle_left': 0,
            'elbow_angle_right': 0,
            'shoulder_hip_ankle_angle_left': 0,
            'shoulder_hip_ankle_angle_right': 0,
            'processing_time': 0,
            'form_status': 'No pose detected'
        }
        
        # Process pose landmarks if detected
        if results.pose_landmarks:
            frame_data['pose_detected'] = True
            self.pose_detection_count += 1
            landmarks = results.pose_landmarks.landmark
            
            # Calculate angles
            angles = verify_posture(landmarks, self.exercise_type)
            frame_data.update(angles)
            self.current_angles = angles
            
            # Check form correctness
            correctness = check_posture_correctness(angles, self.exercise_type)
            self.form_feedback = correctness
            
            # Get coaching feedback
            self.current_coaching_feedback = self.pose_coach.get_form_feedback(landmarks, angles)
            
            # Determine overall form status
            if correctness:
                good_form_count = sum(1 for is_correct in correctness.values() if is_correct)
                total_angles = len(correctness)
                if good_form_count == total_angles:
                    frame_data['form_status'] = '✅ Excellent form!'
                    self.current_status = "Excellent form!"
                    self.good_form_frames += 1
                elif good_form_count >= total_angles * 0.7:
                    frame_data['form_status'] = '👍 Good form'
                    self.current_status = "Good form"
                    self.good_form_frames += 1
                else:
                    frame_data['form_status'] = '⚠️ Needs improvement'
                    self.current_status = "Needs improvement"
            
            # Draw pose landmarks, angles, and coaching feedback
            self.draw_enhanced_feedback(frame, results, angles)
        else:
            self.current_status = "No pose detected"
        
        # Calculate processing time and FPS
        processing_time = time.time() - frame_start_time
        frame_data['processing_time'] = processing_time
        current_fps = 1.0 / processing_time if processing_time > 0 else 0
        self.fps_history.append(current_fps)
        
        # Keep only last 30 FPS readings for rolling average
        if len(self.fps_history) > 30:
            self.fps_history.pop(0)
        
        # Add real-time information overlay
        self.draw_live_info(frame, current_fps)
        
        # Store frame data for session
        if self.save_session:
            self.session_data.append(frame_data)
        
        return frame
    
    def draw_enhanced_feedback(self, frame, results, angles):
        """Draw pose landmarks with enhanced coaching feedback."""
        # Draw standard pose landmarks and angles
        draw_landmarks_and_angles(frame, results, angles, self.exercise_type)
        
        # Draw coaching feedback overlay
        self.draw_coaching_overlay(frame)
    
    def draw_coaching_overlay(self, frame):
        """Draw coaching feedback overlay on frame."""
        height, width = frame.shape[:2]
        
        # Main coaching feedback area (bottom of screen)
        coaching_height = 120
        coaching_y_start = height - coaching_height
        
        # Semi-transparent background for coaching area
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, coaching_y_start), (width, height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)
        
        # Primary feedback message
        font = cv2.FONT_HERSHEY_SIMPLEX
        primary_msg = self.current_coaching_feedback.get('primary', "Keep going!")
        icon = self.current_coaching_feedback.get('icon', '💪')
        priority = self.current_coaching_feedback.get('priority', 'minor')
        
        # Color based on priority
        if priority == 'critical':
            color = (0, 0, 255)  # Red
        elif priority == 'major':
            color = (0, 165, 255)  # Orange
        else:
            color = (0, 255, 0)  # Green
        
        # Main feedback text
        main_text = f"{icon} {primary_msg}"
        cv2.putText(frame, main_text, (20, coaching_y_start + 35), 
                   font, 0.8, color, 2)
        
        # Additional tips (smaller text)
        tips = self.current_coaching_feedback.get('tips', [])
        y_offset = coaching_y_start + 60
        for tip in tips[:2]:  # Show max 2 additional tips
            cv2.putText(frame, f"• {tip}", (20, y_offset), 
                       font, 0.5, (200, 200, 200), 1)
            y_offset += 20
        
        # Show encouragement message periodically
        session_time = time.time() - self.start_time
        if int(session_time) % 15 == 0 and session_time > 10:  # Every 15 seconds after 10s
            good_form_percentage = (self.good_form_frames / max(self.frame_count, 1)) * 100
            encouragement = self.pose_coach.get_encouragement_message(session_time, good_form_percentage)
            
            # Show encouragement in top-right corner
            text_size = cv2.getTextSize(encouragement, font, 0.6, 2)[0]
            cv2.rectangle(frame, (width - text_size[0] - 20, 10), 
                         (width - 10, 50), (0, 100, 0), -1)
            cv2.putText(frame, encouragement, (width - text_size[0] - 15, 35), 
                       font, 0.6, (255, 255, 255), 2)

    def draw_live_info(self, frame, current_fps):
        """Draw real-time information overlay on frame."""
        # Background for info panel (make it smaller to not overlap with coaching)
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (400, 140), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Basic info
        font = cv2.FONT_HERSHEY_SIMPLEX
        y_pos = 35
        
        # Exercise type and status
        cv2.putText(frame, f"Exercise: {self.exercise_type.title()}", (20, y_pos), 
                   font, 0.7, (255, 255, 255), 2)
        y_pos += 25
        
        cv2.putText(frame, f"Status: {self.current_status}", (20, y_pos), 
                   font, 0.6, (0, 255, 0) if "Excellent" in self.current_status else 
                   (0, 255, 255) if "Good" in self.current_status else (0, 0, 255), 2)
        y_pos += 25
        
        # Performance info
        avg_fps = np.mean(self.fps_history) if self.fps_history else 0
        detection_rate = (self.pose_detection_count / self.frame_count * 100) if self.frame_count > 0 else 0
        
        cv2.putText(frame, f"FPS: {avg_fps:.1f} | Detection: {detection_rate:.1f}%", 
                   (20, y_pos), font, 0.5, (255, 255, 255), 1)
        y_pos += 20
        
        # Current angles with color coding
        if self.current_angles:
            for angle_name, angle_value in self.current_angles.items():
                if angle_value > 0:
                    # Color based on form correctness
                    is_correct = self.form_feedback.get(angle_name, False)
                    color = (0, 255, 0) if is_correct else (0, 0, 255)
                    
                    display_name = angle_name.replace('_', ' ').replace('angle', '').title()
                    cv2.putText(frame, f"{display_name}: {angle_value:.1f}°", 
                               (20, y_pos), font, 0.5, color, 1)
                    y_pos += 18
        
        # Session info
        session_time = time.time() - self.start_time
        good_form_percentage = (self.good_form_frames / max(self.frame_count, 1)) * 100
        cv2.putText(frame, f"Time: {session_time:.0f}s | Good form: {good_form_percentage:.0f}%", 
                   (20, 125), font, 0.5, (200, 200, 200), 1)
        
        # Recording indicator
        if self.save_session:
            cv2.circle(frame, (frame.shape[1] - 30, 30), 10, (0, 0, 255), -1)
            cv2.putText(frame, "REC", (frame.shape[1] - 60, 40), font, 0.5, (255, 255, 255), 1)
    
    def save_session_data(self):
        """Save session data to CSV file."""
        if not self.session_data:
            return
        
        csv_path = os.path.join(self.output_dir, f"live_session_{self.session_id}.csv")
        
        with open(csv_path, 'w', newline='') as csvfile:
            if self.session_data:
                writer = csv.DictWriter(csvfile, fieldnames=self.session_data[0].keys())
                writer.writeheader()
                writer.writerows(self.session_data)
        
        print(f"Session data saved to: {csv_path}")
    
    def print_session_summary(self):
        """Print session summary statistics."""
        total_time = time.time() - self.start_time
        avg_fps = np.mean(self.fps_history) if self.fps_history else 0
        detection_rate = (self.pose_detection_count / self.frame_count * 100) if self.frame_count > 0 else 0
        good_form_percentage = (self.good_form_frames / max(self.frame_count, 1)) * 100
        
        print("\n" + "="*60)
        print("🏋️  WORKOUT SESSION SUMMARY")
        print("="*60)
        print(f"Exercise: {self.exercise_type.title()}")
        print(f"Duration: {total_time:.1f} seconds")
        print(f"Total frames: {self.frame_count}")
        print(f"Average FPS: {avg_fps:.1f}")
        print(f"Pose detection rate: {detection_rate:.1f}%")
        print(f"Good form percentage: {good_form_percentage:.1f}%")
        
        # Performance assessment
        if good_form_percentage >= 90:
            assessment = "🏆 EXCELLENT - Outstanding technique!"
        elif good_form_percentage >= 70:
            assessment = "💪 GOOD - Solid performance!"
        elif good_form_percentage >= 50:
            assessment = "📈 IMPROVING - Keep practicing!"
        else:
            assessment = "🎯 LEARNING - Focus on form over speed!"
        
        print(f"Overall assessment: {assessment}")
        print(f"Session ID: {self.session_id}")
        
        if self.save_session:
            print(f"Data saved to: {self.output_dir}/live_session_{self.session_id}.*")
        
        # Show a random tip for next session
        tips = self.pose_coach.get_exercise_specific_tips()
        tip_index = hash(self.session_id) % len(tips)
        print(f"\n💡 Tip for next session: {tips[tip_index]}")
    
    def run(self):
        """Main loop for live pose analysis."""
        try:
            self.initialize_camera()
            
            print(f"\n🎥 Starting live {self.exercise_type} analysis with AI coaching...")
            print("🏃 Real-time Form Coaching Features:")
            print("  • Immediate posture feedback")
            print("  • Specific improvement suggestions")
            print("  • Performance tracking")
            print("  • Motivational encouragement")
            print("\nControls:")
            print("  'q' - Quit")
            print("  's' - Take screenshot")
            print("  'r' - Reset statistics")
            print("  'SPACE' - Pause/Resume")
            print("\n📋 Setup Tips:")
            print(f"  • Position full body in frame")
            print(f"  • Ensure good lighting")
            print(f"  • Watch the coaching feedback at bottom of screen")
            print("Press any key to start...\n")
            
            paused = False
            
            while True:
                if not paused:
                    ret, frame = self.cap.read()
                    if not ret:
                        print("Failed to capture frame")
                        break
                    
                    # Process frame
                    processed_frame = self.process_frame(frame)
                    
                    # Save frame if recording
                    if self.save_session and self.video_writer:
                        self.video_writer.write(processed_frame)
                else:
                    # When paused, just display the last frame
                    processed_frame = frame.copy()
                    cv2.putText(processed_frame, "PAUSED - Press SPACE to resume", 
                               (frame.shape[1]//2 - 150, frame.shape[0]//2), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                
                # Display frame
                cv2.imshow(f'Live {self.exercise_type.title()} Analysis', processed_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    # Take screenshot
                    screenshot_path = os.path.join(self.output_dir, f"screenshot_{self.session_id}_{self.frame_count}.jpg")
                    cv2.imwrite(screenshot_path, processed_frame)
                    print(f"Screenshot saved: {screenshot_path}")
                elif key == ord('r'):
                    # Reset statistics
                    self.fps_history = []
                    self.pose_detection_count = 0
                    self.frame_count = 0
                    self.start_time = time.time()
                    print("Statistics reset!")
                elif key == ord(' '):
                    # Toggle pause
                    paused = not paused
                    print("Paused" if paused else "Resumed")
        
        except KeyboardInterrupt:
            print("\nSession interrupted by user")
        except Exception as e:
            print(f"Error during live analysis: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources."""
        if hasattr(self, 'cap') and self.cap:
            self.cap.release()
        
        if self.video_writer:
            self.video_writer.release()
        
        cv2.destroyAllWindows()
        
        if self.save_session:
            self.save_session_data()
        
        self.print_session_summary()


def main():
    """Main function for live pose analysis."""
    parser = argparse.ArgumentParser(
        description="Real-time MediaPipe pose analysis using camera",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python src/live_analysis.py --exercise pushup
  python src/live_analysis.py --exercise handstand --save
  python src/live_analysis.py --exercise pushup --camera 1 --save --output my_session
        """
    )
    
    parser.add_argument(
        '--exercise', 
        required=True, 
        choices=['handstand', 'pushup'], 
        help="Exercise type to analyze"
    )
    parser.add_argument(
        '--camera', 
        type=int, 
        default=0, 
        help="Camera ID (default: 0 for built-in camera)"
    )
    parser.add_argument(
        '--save', 
        action='store_true', 
        help="Save session video and data"
    )
    parser.add_argument(
        '--output', 
        default='output', 
        help="Output directory for saved files (default: output)"
    )
    
    args = parser.parse_args()
    
    try:
        analyzer = LivePoseAnalyzer(
            exercise_type=args.exercise,
            camera_id=args.camera,
            save_session=args.save,
            output_dir=args.output
        )
        analyzer.run()
    
    except Exception as e:
        print(f"Failed to start live analysis: {e}")
        print("\nTroubleshooting tips:")
        print("- Check that your camera is not being used by another application")
        print("- Try a different camera ID (--camera 1, --camera 2, etc.)")
        print("- Ensure you have proper lighting and are fully visible in frame")


if __name__ == "__main__":
    main() 