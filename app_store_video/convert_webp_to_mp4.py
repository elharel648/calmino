#!/usr/bin/env python3
"""
Convert animated WebP recording to App Store Preview MP4
Output: 1290x2796 @ 30fps H.264
"""

import os
import subprocess
from PIL import Image

WEBP_PATH = "/Users/harel/.gemini/antigravity/brain/b67f7a22-86ef-426d-bf05-c2701535c4f4/app_store_preview_1775516310693.webp"
FRAMES_DIR = "/Users/harel/APP/app_store_video/frames"
OUTPUT_MP4 = "/Users/harel/APP/app_store_video/calmino_preview_final.mp4"

TARGET_W = 1290
TARGET_H = 2796

def main():
    # Create frames directory
    os.makedirs(FRAMES_DIR, exist_ok=True)
    
    # Open animated WebP
    print("📂 Opening animated WebP...")
    img = Image.open(WEBP_PATH)
    
    n_frames = getattr(img, 'n_frames', 1)
    print(f"🎞️  Found {n_frames} frames")
    print(f"📐 Original size: {img.size}")
    
    if n_frames <= 1:
        print("❌ Not an animated WebP - only 1 frame found")
        return
    
    # Extract all frames
    print("🎬 Extracting frames...")
    durations = []
    
    for i in range(n_frames):
        img.seek(i)
        frame = img.copy()
        
        # Get frame duration (in ms)
        duration = img.info.get('duration', 100)
        durations.append(duration)
        
        # Resize to target resolution with high quality
        frame_resized = frame.resize((TARGET_W, TARGET_H), Image.LANCZOS)
        
        # Save as PNG
        frame_path = os.path.join(FRAMES_DIR, f"frame_{i:05d}.png")
        frame_resized.save(frame_path, "PNG")
        
        if i % 20 == 0:
            print(f"  Frame {i}/{n_frames} (duration: {duration}ms)")
    
    print(f"✅ Extracted {n_frames} frames")
    
    # Calculate average FPS from durations
    avg_duration_ms = sum(durations) / len(durations)
    source_fps = 1000.0 / avg_duration_ms if avg_duration_ms > 0 else 10
    print(f"⏱️  Average frame duration: {avg_duration_ms:.1f}ms → {source_fps:.1f} fps")
    
    # Use ffmpeg to create MP4 at 30fps from the extracted frames
    print("🎬 Creating MP4 with ffmpeg...")
    
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(source_fps),
        "-i", os.path.join(FRAMES_DIR, "frame_%05d.png"),
        "-vf", f"fps=30,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        OUTPUT_MP4
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ FFmpeg error: {result.stderr[-500:]}")
        return
    
    # Verify output
    probe_cmd = [
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration,size",
        "-show_entries", "stream=width,height,codec_name,r_frame_rate",
        "-of", "default=noprint_wrappers=1",
        OUTPUT_MP4
    ]
    probe = subprocess.run(probe_cmd, capture_output=True, text=True)
    
    file_size = os.path.getsize(OUTPUT_MP4)
    size_mb = file_size / (1024 * 1024)
    
    print()
    print("━" * 45)
    print("🎬 APP STORE PREVIEW VIDEO READY!")
    print("━" * 45)
    print(probe.stdout)
    print(f"📁 File: {OUTPUT_MP4}")
    print(f"📦 Size: {size_mb:.1f} MB")
    print("━" * 45)
    
    # Cleanup frames
    print("🧹 Cleaning up frames...")
    for f in os.listdir(FRAMES_DIR):
        os.remove(os.path.join(FRAMES_DIR, f))
    os.rmdir(FRAMES_DIR)
    print("✅ Done!")

if __name__ == "__main__":
    main()
