#!/usr/bin/env python3
"""
Video Compression Script for MediaPipe Pose Verification

This script compresses videos to reduce file size while maintaining quality
suitable for pose detection. Useful for processing large videos or sharing results.
"""

import cv2
import os
import argparse
import subprocess
import sys
from pathlib import Path


def get_file_size_mb(filepath):
    """Get file size in MB."""
    return os.path.getsize(filepath) / (1024 * 1024)


def get_video_info(filepath):
    """Get video information using OpenCV."""
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        return None
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = frame_count / fps if fps > 0 else 0
    
    cap.release()
    
    return {
        'fps': fps,
        'frame_count': frame_count,
        'width': width,
        'height': height,
        'duration': duration,
        'resolution': f"{width}x{height}"
    }


def compress_with_opencv(input_path, output_path, quality='medium', target_resolution=None):
    """
    Compress video using OpenCV.
    
    Args:
        input_path: Input video file path
        output_path: Output video file path
        quality: Compression quality ('low', 'medium', 'high')
        target_resolution: Target resolution as (width, height) tuple
    """
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {input_path}")
    
    # Get original video properties
    original_fps = cap.get(cv2.CAP_PROP_FPS)
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Set target resolution
    if target_resolution:
        target_width, target_height = target_resolution
    else:
        # Default resolution based on quality
        if quality == 'low':
            target_width, target_height = 640, 480
        elif quality == 'medium':
            target_width = min(1280, original_width)
            target_height = int(target_width * original_height / original_width)
        else:  # high
            target_width, target_height = original_width, original_height
    
    # Set FPS based on quality
    if quality == 'low':
        target_fps = min(24, original_fps)
    elif quality == 'medium':
        target_fps = min(30, original_fps)
    else:  # high
        target_fps = original_fps
    
    # Video codec and quality settings
    if quality == 'low':
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    else:
        fourcc = cv2.VideoWriter_fourcc(*'h264')
    
    # Create video writer
    out = cv2.VideoWriter(output_path, fourcc, target_fps, (target_width, target_height))
    
    if not out.isOpened():
        cap.release()
        raise ValueError(f"Could not create output video: {output_path}")
    
    print(f"Compressing video...")
    print(f"  Original: {original_width}x{original_height} @ {original_fps:.1f}fps")
    print(f"  Target: {target_width}x{target_height} @ {target_fps:.1f}fps")
    
    frame_count = 0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Resize frame if needed
        if (target_width, target_height) != (original_width, original_height):
            frame = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)
        
        # Skip frames to achieve target FPS
        if target_fps < original_fps:
            frame_skip_ratio = original_fps / target_fps
            if frame_count % int(frame_skip_ratio) != 0:
                continue
        
        out.write(frame)
        
        # Progress indicator
        if frame_count % 30 == 0:
            progress = (frame_count / total_frames) * 100
            print(f"  Progress: {progress:.1f}%", end='\r')
    
    cap.release()
    out.release()
    print(f"  Progress: 100.0%")


def compress_with_ffmpeg(input_path, output_path, quality='medium', target_resolution=None):
    """
    Compress video using ffmpeg (more efficient and better quality).
    
    Args:
        input_path: Input video file path
        output_path: Output video file path
        quality: Compression quality ('low', 'medium', 'high')
        target_resolution: Target resolution as (width, height) tuple
    """
    # Check if ffmpeg is available
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError("ffmpeg not found. Install with: brew install ffmpeg (macOS) or apt install ffmpeg (Ubuntu)")
    
    # Build ffmpeg command
    cmd = ['ffmpeg', '-i', input_path, '-y']  # -y to overwrite output
    
    # Video codec and quality settings
    if quality == 'low':
        cmd.extend(['-c:v', 'libx264', '-crf', '28', '-preset', 'fast'])
    elif quality == 'medium':
        cmd.extend(['-c:v', 'libx264', '-crf', '23', '-preset', 'medium'])
    else:  # high
        cmd.extend(['-c:v', 'libx264', '-crf', '18', '-preset', 'slow'])
    
    # Resolution settings
    if target_resolution:
        width, height = target_resolution
        cmd.extend(['-vf', f'scale={width}:{height}'])
    else:
        if quality == 'low':
            cmd.extend(['-vf', 'scale=640:480'])
        elif quality == 'medium':
            cmd.extend(['-vf', 'scale=1280:-2'])  # -2 maintains aspect ratio
    
    # Audio settings (copy audio without re-encoding for speed)
    cmd.extend(['-c:a', 'aac', '-b:a', '128k'])
    
    # Output file
    cmd.append(output_path)
    
    print(f"Compressing video with ffmpeg...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("Compression completed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error during compression: {e}")
        print(f"FFmpeg output: {e.stderr}")
        raise


def batch_compress(input_dir, output_dir, quality='medium', method='ffmpeg', target_resolution=None):
    """
    Compress all videos in a directory.
    
    Args:
        input_dir: Input directory containing videos
        output_dir: Output directory for compressed videos
        quality: Compression quality
        method: Compression method ('opencv' or 'ffmpeg')
        target_resolution: Target resolution as (width, height) tuple
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Supported video extensions
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}
    
    video_files = [f for f in input_path.iterdir() 
                   if f.is_file() and f.suffix.lower() in video_extensions]
    
    if not video_files:
        print(f"No video files found in {input_dir}")
        return
    
    print(f"Found {len(video_files)} video files to compress")
    
    total_original_size = 0
    total_compressed_size = 0
    
    for i, video_file in enumerate(video_files, 1):
        print(f"\n[{i}/{len(video_files)}] Processing: {video_file.name}")
        
        # Generate output filename
        output_file = output_path / f"{video_file.stem}_compressed{video_file.suffix}"
        
        try:
            # Get original file size
            original_size = get_file_size_mb(video_file)
            total_original_size += original_size
            
            # Compress video
            if method == 'ffmpeg':
                compress_with_ffmpeg(str(video_file), str(output_file), quality, target_resolution)
            else:
                compress_with_opencv(str(video_file), str(output_file), quality, target_resolution)
            
            # Get compressed file size
            compressed_size = get_file_size_mb(output_file)
            total_compressed_size += compressed_size
            
            reduction = ((original_size - compressed_size) / original_size) * 100
            print(f"  Original: {original_size:.1f} MB")
            print(f"  Compressed: {compressed_size:.1f} MB")
            print(f"  Reduction: {reduction:.1f}%")
            
        except Exception as e:
            print(f"  Error processing {video_file.name}: {e}")
            continue
    
    # Print summary
    if total_original_size > 0:
        total_reduction = ((total_original_size - total_compressed_size) / total_original_size) * 100
        print(f"\n{'='*50}")
        print("BATCH COMPRESSION SUMMARY")
        print(f"{'='*50}")
        print(f"Total original size: {total_original_size:.1f} MB")
        print(f"Total compressed size: {total_compressed_size:.1f} MB")
        print(f"Total space saved: {total_original_size - total_compressed_size:.1f} MB")
        print(f"Overall reduction: {total_reduction:.1f}%")


def main():
    """Main function for video compression."""
    parser = argparse.ArgumentParser(
        description="Compress videos for MediaPipe pose analysis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Quality Settings:
  low    - Small file size, good for testing (640x480, lower bitrate)
  medium - Balanced size/quality, good for analysis (1280px width max)
  high   - Best quality, larger files (original resolution)

Examples:
  python scripts/compress_video.py -i data/handstand.mp4 -o data/handstand_small.mp4 -q low
  python scripts/compress_video.py -i data/ -o data/compressed/ -q medium --batch
  python scripts/compress_video.py -i video.mp4 -o video_720p.mp4 -r 1280 720
        """
    )
    
    parser.add_argument('-i', '--input', required=True, 
                       help="Input video file or directory")
    parser.add_argument('-o', '--output', required=True,
                       help="Output video file or directory")
    parser.add_argument('-q', '--quality', choices=['low', 'medium', 'high'], 
                       default='medium', help="Compression quality (default: medium)")
    parser.add_argument('-m', '--method', choices=['opencv', 'ffmpeg'], 
                       default='ffmpeg', help="Compression method (default: ffmpeg)")
    parser.add_argument('-r', '--resolution', nargs=2, type=int, metavar=('WIDTH', 'HEIGHT'),
                       help="Target resolution (e.g., -r 1280 720)")
    parser.add_argument('--batch', action='store_true',
                       help="Batch process all videos in input directory")
    parser.add_argument('--info', action='store_true',
                       help="Show video information only (no compression)")
    
    args = parser.parse_args()
    
    # Convert resolution to tuple if provided
    target_resolution = tuple(args.resolution) if args.resolution else None
    
    try:
        if args.info:
            # Show video information only
            if os.path.isfile(args.input):
                info = get_video_info(args.input)
                size_mb = get_file_size_mb(args.input)
                
                print(f"Video Information for: {args.input}")
                print(f"{'='*50}")
                print(f"File size: {size_mb:.1f} MB")
                print(f"Resolution: {info['resolution']}")
                print(f"Duration: {info['duration']:.1f} seconds")
                print(f"FPS: {info['fps']:.1f}")
                print(f"Frame count: {info['frame_count']}")
            else:
                print("Info mode only works with individual files")
        
        elif args.batch or os.path.isdir(args.input):
            # Batch compression
            batch_compress(args.input, args.output, args.quality, args.method, target_resolution)
        
        else:
            # Single file compression
            if not os.path.isfile(args.input):
                print(f"Error: Input file '{args.input}' not found")
                return
            
            print(f"Input: {args.input}")
            print(f"Output: {args.output}")
            print(f"Quality: {args.quality}")
            print(f"Method: {args.method}")
            
            # Show original file info
            original_size = get_file_size_mb(args.input)
            original_info = get_video_info(args.input)
            print(f"\nOriginal file:")
            print(f"  Size: {original_size:.1f} MB")
            print(f"  Resolution: {original_info['resolution']}")
            print(f"  Duration: {original_info['duration']:.1f} seconds")
            
            # Create output directory if needed
            os.makedirs(os.path.dirname(args.output), exist_ok=True)
            
            # Compress video
            if args.method == 'ffmpeg':
                compress_with_ffmpeg(args.input, args.output, args.quality, target_resolution)
            else:
                compress_with_opencv(args.input, args.output, args.quality, target_resolution)
            
            # Show compressed file info
            compressed_size = get_file_size_mb(args.output)
            reduction = ((original_size - compressed_size) / original_size) * 100
            
            print(f"\nCompression complete!")
            print(f"  Original size: {original_size:.1f} MB")
            print(f"  Compressed size: {compressed_size:.1f} MB")
            print(f"  Size reduction: {reduction:.1f}%")
            print(f"  Space saved: {original_size - compressed_size:.1f} MB")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 