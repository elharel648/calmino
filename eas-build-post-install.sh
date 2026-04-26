#!/usr/bin/env bash
set -euo pipefail

if [ -n "${EAS_LIVE_ACTIVITY_PROFILE:-}" ]; then
  PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
  mkdir -p "$PROFILES_DIR"
  echo "$EAS_LIVE_ACTIVITY_PROFILE" | base64 -d > "$PROFILES_DIR/LiveActivity_AppStore.mobileprovision"
  echo "LiveActivity provisioning profile installed successfully"
fi
