#!/usr/bin/env bash

set -e

echo "🔧 Updating gems to support Xcode 16.2+ (objectVersion 70)..."

# Update xcodeproj gem to version that supports objectVersion 70
echo "📦 Installing xcodeproj 1.28.0..."
gem install xcodeproj -v 1.28.0 --no-document

# Update CocoaPods to latest version for better compatibility
echo "📦 Updating CocoaPods..."
gem install cocoapods -v 1.16.2 --no-document

# Verify installations
echo "✅ Gem versions installed:"
gem list xcodeproj
gem list cocoapods

echo "✅ Build environment updated successfully"
