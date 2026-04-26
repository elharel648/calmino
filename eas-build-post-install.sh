#!/usr/bin/env bash
set -euo pipefail

PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$PROFILES_DIR"

PROFILE_SRC="ios/LiveActivity_AppStore.mobileprovision"
if [ -f "$PROFILE_SRC" ]; then
  cp "$PROFILE_SRC" "$PROFILES_DIR/LiveActivity_AppStore.mobileprovision"
  echo "LiveActivity provisioning profile installed successfully"
else
  echo "WARNING: LiveActivity profile not found at $PROFILE_SRC"
fi
