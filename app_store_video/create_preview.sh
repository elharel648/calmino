#!/bin/bash
# Calmino App Store Preview Video - Simple & Reliable
DIR="/Users/harel/APP/app_store_video"
OUT="$DIR/calmino_preview.mp4"
TEMP="$DIR/temp_work"
W=1290
H=2796

mkdir -p "$TEMP"

echo "🎨 Step 1: Preparing slides..."

# Images in display order
IMAGES=(
  "hero_home.png"
  "hero_stats.png"
  "Simulator Screenshot - iPhone 17 Pro Max - 2026-04-05 at 22.47.41.png"
  "hero_account.png"
  "sitter_list.png"
)

# Resize each image to exact dimensions with lilac background fill
for i in "${!IMAGES[@]}"; do
  echo "  Slide $((i+1)): ${IMAGES[$i]}"
  ffmpeg -y -f lavfi -i "color=c=#E0D4E8:s=${W}x${H}:d=1" \
    -i "$DIR/${IMAGES[$i]}" \
    -filter_complex "[1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[0:v][fg]overlay=(W-w)/2:(H-h)/2[out]" \
    -map "[out]" -frames:v 1 "$TEMP/slide_$i.png" 2>/dev/null
  
  if [ ! -f "$TEMP/slide_$i.png" ]; then
    echo "  ❌ Failed to create slide $i"
    exit 1
  fi
done

echo "✅ Slides ready"
echo ""
echo "🎬 Step 2: Creating video with crossfades..."

# Duration per slide = 4 seconds, crossfade = 0.8 seconds
# Total ≈ 5 slides × 4s - 4 × 0.8s = 16.8s
D=4
F="0.8"

# Build the full video in one ffmpeg command with xfade chain
ffmpeg -y \
  -loop 1 -t $D -i "$TEMP/slide_0.png" \
  -loop 1 -t $D -i "$TEMP/slide_1.png" \
  -loop 1 -t $D -i "$TEMP/slide_2.png" \
  -loop 1 -t $D -i "$TEMP/slide_3.png" \
  -loop 1 -t $D -i "$TEMP/slide_4.png" \
  -filter_complex "\
[0:v][1:v]xfade=transition=fade:duration=${F}:offset=3.2[v01];\
[v01][2:v]xfade=transition=fade:duration=${F}:offset=6.4[v012];\
[v012][3:v]xfade=transition=fade:duration=${F}:offset=9.6[v0123];\
[v0123][4:v]xfade=transition=fade:duration=${F}:offset=12.8,format=yuv420p[vout]" \
  -map "[vout]" -c:v libx264 -pix_fmt yuv420p -r 30 \
  -movflags +faststart \
  "$OUT" 2>&1 | tail -5

if [ -f "$OUT" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎬 VIDEO CREATED SUCCESSFULLY!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  ffprobe -v quiet -show_entries format=duration,size -show_entries stream=width,height,codec_name -of default=noprint_wrappers=1 "$OUT"
  echo ""
  FILE_SIZE=$(du -h "$OUT" | cut -f1)
  echo "📁 File: $OUT"
  echo "📦 Size: $FILE_SIZE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "❌ Video creation failed"
fi

# Cleanup
rm -rf "$TEMP"
echo "🧹 Cleaned up temp files"
