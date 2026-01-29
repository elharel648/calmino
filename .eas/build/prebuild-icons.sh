#!/bin/bash

# EAS Prebuild Hook - Ensure All App Icons Exist
# This script runs before every EAS build to guarantee all required iOS icons are present

set -e

echo "🎨 Checking App Icons..."

ICON_DIR="ios/CalmParentApp/Images.xcassets/AppIcon.appiconset"
SOURCE_ICON="assets/icon.png"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Error: Source icon not found at $SOURCE_ICON"
    exit 1
fi

# Function to generate icon if missing
generate_icon_if_needed() {
    local size=$1
    local filename="App-Icon-${size}x${size}@1x.png"
    local filepath="$ICON_DIR/$filename"
    
    if [ ! -f "$filepath" ]; then
        echo "⚠️  Missing $filename - generating..."
        sips -z $size $size "$SOURCE_ICON" --out "$filepath" > /dev/null 2>&1
        echo "✅ Generated $filename"
    else
        echo "✓ $filename exists"
    fi
}

# Generate required special sizes that Apple demands
generate_icon_if_needed 120  # iPhone (iOS 10.0+)
generate_icon_if_needed 152  # iPad (76x76@2x)
generate_icon_if_needed 167  # iPad Pro

echo "✅ All required app icons verified!"
