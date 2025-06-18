#!/usr/bin/env python3
"""
Sample analysis script for MediaPipe Pose Verification results.

This script demonstrates how to analyze the CSV metrics generated
by the pose verification system.
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
import argparse
from pathlib import Path


def load_metrics(csv_path):
    """Load metrics from CSV file."""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Metrics file not found: {csv_path}")
    
    return pd.read_csv(csv_path)


def analyze_pose_detection(df):
    """Analyze pose detection statistics."""
    total_frames = len(df)
    detected_frames = df['pose_detected'].sum()
    detection_rate = (detected_frames / total_frames) * 100
    
    print("=== Pose Detection Analysis ===")
    print(f"Total frames: {total_frames}")
    print(f"Frames with pose detected: {detected_frames}")
    print(f"Detection rate: {detection_rate:.1f}%")
    
    if detection_rate < 80:
        print("⚠️  Low detection rate. Consider improving lighting or camera angle.")
    elif detection_rate > 95:
        print("✅ Excellent detection rate!")
    else:
        print("✅ Good detection rate.")
    
    return detection_rate


def analyze_performance(df):
    """Analyze processing performance."""
    avg_fps = df['processing_fps'].mean()
    min_fps = df['processing_fps'].min()
    max_fps = df['processing_fps'].max()
    
    print("\n=== Performance Analysis ===")
    print(f"Average processing FPS: {avg_fps:.1f}")
    print(f"Min FPS: {min_fps:.1f}")
    print(f"Max FPS: {max_fps:.1f}")
    
    if avg_fps > 30:
        print("✅ Excellent performance for real-time analysis!")
    elif avg_fps > 15:
        print("✅ Good performance for offline analysis.")
    else:
        print("⚠️  Low performance. Consider optimizing settings.")


def analyze_angles(df, exercise_type):
    """Analyze angle measurements for the exercise."""
    pose_frames = df[df['pose_detected'] == True]
    
    if len(pose_frames) == 0:
        print("❌ No frames with detected poses found.")
        return
    
    print(f"\n=== {exercise_type.title()} Angle Analysis ===")
    
    # Reference ranges
    reference_ranges = {
        'pushup': {
            'elbow_angle': (90, 120)
        },
        'handstand': {
            'elbow_angle': (160, 180),
            'shoulder_hip_ankle_angle': (170, 180)
        }
    }
    
    if exercise_type in reference_ranges:
        ref = reference_ranges[exercise_type]
        
        # Analyze elbow angles
        if 'elbow_angle' in ref:
            min_ref, max_ref = ref['elbow_angle']
            
            left_elbow = pose_frames['elbow_angle_left']
            right_elbow = pose_frames['elbow_angle_right']
            
            print(f"\nElbow Angles (Reference: {min_ref}-{max_ref}°):")
            print(f"Left elbow - Mean: {left_elbow.mean():.1f}°, Std: {left_elbow.std():.1f}°")
            print(f"Right elbow - Mean: {right_elbow.mean():.1f}°, Std: {right_elbow.std():.1f}°")
            
            # Check compliance
            left_compliance = ((left_elbow >= min_ref) & (left_elbow <= max_ref)).mean() * 100
            right_compliance = ((right_elbow >= min_ref) & (right_elbow <= max_ref)).mean() * 100
            
            print(f"Left elbow compliance: {left_compliance:.1f}%")
            print(f"Right elbow compliance: {right_compliance:.1f}%")
        
        # Analyze body alignment for handstands
        if exercise_type == 'handstand' and 'shoulder_hip_ankle_angle' in ref:
            min_ref, max_ref = ref['shoulder_hip_ankle_angle']
            
            left_alignment = pose_frames['shoulder_hip_ankle_angle_left']
            right_alignment = pose_frames['shoulder_hip_ankle_angle_right']
            
            print(f"\nBody Alignment (Reference: {min_ref}-{max_ref}°):")
            print(f"Left side - Mean: {left_alignment.mean():.1f}°, Std: {left_alignment.std():.1f}°")
            print(f"Right side - Mean: {right_alignment.mean():.1f}°, Std: {right_alignment.std():.1f}°")
            
            # Check compliance
            left_compliance = ((left_alignment >= min_ref) & (left_alignment <= max_ref)).mean() * 100
            right_compliance = ((right_alignment >= min_ref) & (right_alignment <= max_ref)).mean() * 100
            
            print(f"Left alignment compliance: {left_compliance:.1f}%")
            print(f"Right alignment compliance: {right_compliance:.1f}%")


def plot_angle_progression(df, exercise_type, output_dir=None):
    """Plot angle progression over time."""
    pose_frames = df[df['pose_detected'] == True]
    
    if len(pose_frames) == 0:
        print("No pose data to plot.")
        return
    
    fig, axes = plt.subplots(2, 1, figsize=(12, 10))
    
    # Plot elbow angles
    axes[0].plot(pose_frames['timestamp'], pose_frames['elbow_angle_left'], 
                label='Left Elbow', color='blue', alpha=0.7)
    axes[0].plot(pose_frames['timestamp'], pose_frames['elbow_angle_right'], 
                label='Right Elbow', color='red', alpha=0.7)
    
    # Add reference lines for elbow angles
    if exercise_type == 'pushup':
        axes[0].axhline(y=90, color='gray', linestyle='--', alpha=0.5, label='Min Range')
        axes[0].axhline(y=120, color='gray', linestyle='--', alpha=0.5, label='Max Range')
    elif exercise_type == 'handstand':
        axes[0].axhline(y=160, color='gray', linestyle='--', alpha=0.5, label='Min Range')
        axes[0].axhline(y=180, color='gray', linestyle='--', alpha=0.5, label='Max Range')
    
    axes[0].set_xlabel('Time (seconds)')
    axes[0].set_ylabel('Elbow Angle (degrees)')
    axes[0].set_title(f'{exercise_type.title()} - Elbow Angles Over Time')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # Plot body alignment for handstands
    if exercise_type == 'handstand':
        axes[1].plot(pose_frames['timestamp'], pose_frames['shoulder_hip_ankle_angle_left'], 
                    label='Left Side', color='green', alpha=0.7)
        axes[1].plot(pose_frames['timestamp'], pose_frames['shoulder_hip_ankle_angle_right'], 
                    label='Right Side', color='orange', alpha=0.7)
        
        axes[1].axhline(y=170, color='gray', linestyle='--', alpha=0.5, label='Min Range')
        axes[1].axhline(y=180, color='gray', linestyle='--', alpha=0.5, label='Max Range')
        
        axes[1].set_xlabel('Time (seconds)')
        axes[1].set_ylabel('Body Alignment (degrees)')
        axes[1].set_title('Handstand - Body Alignment Over Time')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
    else:
        # For push-ups, plot processing FPS
        axes[1].plot(pose_frames['timestamp'], pose_frames['processing_fps'], 
                    color='purple', alpha=0.7)
        axes[1].axhline(y=30, color='gray', linestyle='--', alpha=0.5, label='Real-time Threshold')
        
        axes[1].set_xlabel('Time (seconds)')
        axes[1].set_ylabel('Processing FPS')
        axes[1].set_title('Processing Performance Over Time')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    # Save plot if output directory specified
    if output_dir:
        plot_path = os.path.join(output_dir, f'{exercise_type}_analysis.png')
        plt.savefig(plot_path, dpi=300, bbox_inches='tight')
        print(f"Plot saved to: {plot_path}")
    
    plt.show()


def generate_summary_report(df, exercise_type, output_dir=None):
    """Generate a summary report."""
    pose_frames = df[df['pose_detected'] == True]
    
    report = f"""
=== MEDIAPIPE POSE VERIFICATION REPORT ===
Exercise: {exercise_type.title()}
Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}

OVERALL STATISTICS:
- Total frames: {len(df)}
- Frames with pose detected: {len(pose_frames)}
- Pose detection rate: {(len(pose_frames)/len(df)*100):.1f}%
- Average processing FPS: {df['processing_fps'].mean():.1f}
- Video duration: {df['timestamp'].max():.1f} seconds

"""
    
    if len(pose_frames) > 0:
        if exercise_type == 'pushup':
            left_elbow_mean = pose_frames['elbow_angle_left'].mean()
            right_elbow_mean = pose_frames['elbow_angle_right'].mean()
            
            report += f"""
PUSH-UP ANALYSIS:
- Average left elbow angle: {left_elbow_mean:.1f}°
- Average right elbow angle: {right_elbow_mean:.1f}°
- Target range: 90-120°
- Left elbow in range: {((pose_frames['elbow_angle_left'] >= 90) & (pose_frames['elbow_angle_left'] <= 120)).mean()*100:.1f}%
- Right elbow in range: {((pose_frames['elbow_angle_right'] >= 90) & (pose_frames['elbow_angle_right'] <= 120)).mean()*100:.1f}%
"""
        
        elif exercise_type == 'handstand':
            left_alignment_mean = pose_frames['shoulder_hip_ankle_angle_left'].mean()
            right_alignment_mean = pose_frames['shoulder_hip_ankle_angle_right'].mean()
            left_elbow_mean = pose_frames['elbow_angle_left'].mean()
            right_elbow_mean = pose_frames['elbow_angle_right'].mean()
            
            report += f"""
HANDSTAND ANALYSIS:
Body Alignment:
- Average left side alignment: {left_alignment_mean:.1f}°
- Average right side alignment: {right_alignment_mean:.1f}°
- Target range: 170-180°
- Left alignment in range: {((pose_frames['shoulder_hip_ankle_angle_left'] >= 170) & (pose_frames['shoulder_hip_ankle_angle_left'] <= 180)).mean()*100:.1f}%
- Right alignment in range: {((pose_frames['shoulder_hip_ankle_angle_right'] >= 170) & (pose_frames['shoulder_hip_ankle_angle_right'] <= 180)).mean()*100:.1f}%

Arm Stability:
- Average left elbow angle: {left_elbow_mean:.1f}°
- Average right elbow angle: {right_elbow_mean:.1f}°
- Target range: 160-180°
"""
    
    print(report)
    
    # Save report if output directory specified
    if output_dir:
        report_path = os.path.join(output_dir, f'{exercise_type}_report.txt')
        with open(report_path, 'w') as f:
            f.write(report)
        print(f"Report saved to: {report_path}")


def main():
    """Main analysis function."""
    parser = argparse.ArgumentParser(description="Analyze MediaPipe pose verification results")
    parser.add_argument('--csv', required=True, help="Path to metrics CSV file")
    parser.add_argument('--exercise', required=True, choices=['pushup', 'handstand'], 
                       help="Exercise type")
    parser.add_argument('--output', help="Output directory for plots and reports")
    parser.add_argument('--plot', action='store_true', help="Generate plots")
    parser.add_argument('--report', action='store_true', help="Generate summary report")
    
    args = parser.parse_args()
    
    try:
        # Load data
        df = load_metrics(args.csv)
        
        # Basic analysis
        analyze_pose_detection(df)
        analyze_performance(df)
        analyze_angles(df, args.exercise)
        
        # Generate plots
        if args.plot:
            plot_angle_progression(df, args.exercise, args.output)
        
        # Generate report
        if args.report:
            generate_summary_report(df, args.exercise, args.output)
    
    except Exception as e:
        print(f"Error analyzing results: {e}")


if __name__ == '__main__':
    main() 