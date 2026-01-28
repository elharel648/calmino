#!/usr/bin/env bash

echo "🔧 Installing updated xcodeproj gem to support Xcode 16 (objectVersion 70)..."

# Update xcodeproj gem to version that supports objectVersion 70
gem install xcodeproj -v 1.28.0 --no-document

echo "✅ xcodeproj gem updated successfully"
