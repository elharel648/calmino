#!/bin/bash
echo "Temporarily holding ios directory in a hidden folder..."
mv ios .ios_backup

echo "Triggering EAS Build bypassing local PBX dependency parse... (this will use app.json and remote credentials)"
npx eas-cli build --platform ios --profile production --clear-cache --auto-submit --non-interactive --no-wait

echo "Restoring local ios directory..."
mv .ios_backup ios
echo "Done! The cloud build is now running with all credentials."
