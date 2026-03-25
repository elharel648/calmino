#!/bin/bash
set -e
echo "Running custom EAS post-install hook for $EAS_BUILD_PLATFORM..."
if [ -z "$EAS_BUILD_PLATFORM" ]; then
    echo "EAS_BUILD_PLATFORM is not set. Assuming local run."
    npx expo prebuild --no-install
    bash .eas/build/prebuild-icons.sh
    bash .eas/build/prebuild.sh
else
    npx expo prebuild --platform $EAS_BUILD_PLATFORM --no-install
    if [ "$EAS_BUILD_PLATFORM" = "ios" ]; then
        bash .eas/build/prebuild-icons.sh
        bash .eas/build/prebuild.sh
    fi
fi
