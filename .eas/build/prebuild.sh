#!/usr/bin/env bash

set -e

echo "🔧 Fixing Xcode project compatibility for CocoaPods..."

# Path to the project.pbxproj file
PBXPROJ_PATH="${EAS_BUILD_WORKINGDIR}/ios/CalmParentApp.xcodeproj/project.pbxproj"

# Check if file exists
if [ ! -f "$PBXPROJ_PATH" ]; then
  echo "❌ Error: project.pbxproj not found at $PBXPROJ_PATH"
  exit 1
fi

echo "📝 Checking objectVersion in project.pbxproj..."

# Check current objectVersion
CURRENT_VERSION=$(grep -E '^\s*objectVersion = [0-9]+;' "$PBXPROJ_PATH" | sed 's/.*objectVersion = \([0-9]*\);/\1/')
echo "   Current objectVersion: $CURRENT_VERSION"

# If objectVersion is 70, downgrade to 60 for CocoaPods compatibility
if [ "$CURRENT_VERSION" = "70" ]; then
  echo "   Downgrading objectVersion 70 → 60 for CocoaPods compatibility..."
  sed -i.bak 's/objectVersion = 70;/objectVersion = 60;/' "$PBXPROJ_PATH"
  rm -f "${PBXPROJ_PATH}.bak"
  echo "   ✅ Successfully downgraded objectVersion to 60"
else
  echo "   ℹ️  objectVersion is $CURRENT_VERSION (no change needed)"
fi


echo "✅ Build environment prepared successfully"

# Fix LiveActivity extension code signing for EAS (manual signing)
PBXPROJ_REAL="${EAS_BUILD_WORKINGDIR}/ios/Calmino.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ_REAL" ]; then
  echo "🔧 Fixing CalmParentLiveActivity code signing for EAS..."
  
  # Change Automatic → Manual for the LiveActivity target
  # EAS uses manual signing, but the plugin sets Automatic
  sed -i.bak 's/CODE_SIGN_STYLE = Automatic;/CODE_SIGN_STYLE = Manual;/g' "$PBXPROJ_REAL"
  
  # Set the correct distribution identity for App Store builds
  sed -i.bak 's/CODE_SIGN_IDENTITY = "Apple Development";/CODE_SIGN_IDENTITY = "iPhone Distribution";/g' "$PBXPROJ_REAL"
  
  rm -f "${PBXPROJ_REAL}.bak"
  echo "   ✅ Fixed code signing to Manual for EAS builds"
fi

# Ensure CFBundleIconName is in Info.plist
INFOPLIST_PATH="${EAS_BUILD_WORKINGDIR}/ios/CalmParentApp/Info.plist"

if [ -f "$INFOPLIST_PATH" ]; then
  echo "📱 Verifying CFBundleIconName in Info.plist..."
  
  if ! grep -q "CFBundleIconName" "$INFOPLIST_PATH"; then
    echo "⚠️  CFBundleIconName missing! Adding it now..."
    # Add CFBundleIconName before CFBundleIdentifier
    sed -i.bak '/<key>CFBundleIdentifier<\/key>/i\
\	<key>CFBundleIconName<\/key>\
\	<string>AppIcon<\/string>
' "$INFOPLIST_PATH"
    rm -f "${INFOPLIST_PATH}.bak"
    echo "   ✅ Added CFBundleIconName to Info.plist"
  else
    echo "   ✅ CFBundleIconName already present"
  fi
fi

