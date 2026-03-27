#!/bin/bash
if [ "$EAS_BUILD_PLATFORM" = "ios" ]; then
  echo "Setting up manual provisioning profiles for EAS Build..."
  mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
  
  if [ -f "live_activity.mobileprovision" ]; then
    cp "live_activity.mobileprovision" "$HOME/Library/MobileDevice/Provisioning Profiles/"
    echo "Successfully injected live_activity.mobileprovision into Xcode system folder."
  else
    echo "Warning: live_activity.mobileprovision not found!"
  fi
fi
