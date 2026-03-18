---
description: Deploy new version to TestFlight/App Store
---

# Deploy New Version

This workflow guides you through deploying a new version of the CalmParent app to TestFlight and the App Store.

## Prerequisites
- Ensure all changes are committed to git
- All tests are passing
- No critical bugs or issues

## Steps

### 1. Update Version Numbers
Update the version in `app.json`:
- Increment `expo.version` (e.g., from "1.0.1" to "1.0.2" for patch, "1.1.0" for minor, "2.0.0" for major)
- The `buildNumber` will be auto-incremented by EAS

### 2. Build for iOS (Production)
// turbo
```bash
eas build --platform ios --profile production
```

Wait for the build to complete. This typically takes 15-20 minutes.

### 3. Submit to TestFlight
Once the build is successful, submit to TestFlight:
// turbo
```bash
eas submit --platform ios --latest
```

### 4. Verify on TestFlight
- Open TestFlight on your device
- Wait for the new build to appear (usually 5-10 minutes)
- Test the app thoroughly
- Check all critical features

### 5. Release to App Store (Optional)
If ready for production release:
- Go to App Store Connect (https://appstoreconnect.apple.com)
- Select your app
- Go to the version you want to release
- Fill in release notes
- Submit for review

## Notes
- EAS automatically increments the build number with `autoIncrement: true`
- The version number in `app.json` must be manually updated
- Always test on TestFlight before releasing to production
- Keep track of what changed in each version for release notes
