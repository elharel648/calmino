# CalmParent Live Activity - Complete Setup

## 📁 File Structure

All files should be in `/CalmParentLiveActivity/` at the project root:

```
CalmParentLiveActivity/
├── ActivityAttributes.swift          # Activity attributes definition
├── CalmParentLiveActivity.swift      # Widget implementation
├── CalmParentLiveActivityBundle.swift # Widget bundle entry point
├── ActivityKitManager.swift          # Native module for React Native
├── ActivityKitManagerBridge.m        # Objective-C bridge
├── Info.plist                        # Widget extension Info.plist
├── CalmParentLiveActivity.entitlements # Widget extension entitlements
└── README.md                         # This file
```

## 🔑 Key Identifiers

- **Main App Bundle ID**: `com.harel.calmparentapp`
- **Widget Extension Bundle ID**: `com.harel.calmparentapp.CalmParentLiveActivity`
- **App Group**: `group.com.harel.calmparentapp`

## ✅ Entitlements Checklist

### Main App (`CalmParentApp.entitlements`)
- ✅ `com.apple.developer.usernotifications.live-activities` = `true`
- ✅ `com.apple.security.application-groups` = `["group.com.harel.calmparentapp"]`

### Widget Extension (`CalmParentLiveActivity.entitlements`)
- ✅ `com.apple.developer.usernotifications.live-activities` = `true`
- ✅ `com.apple.security.application-groups` = `["group.com.harel.calmparentapp"]`

## ✅ Info.plist Checklist

### Main App (`CalmParentApp/Info.plist`)
- ✅ `NSSupportsLiveActivities` = `true`
- ✅ `NSAppleEventsUsageDescription` = (Hebrew description)

### Widget Extension (`CalmParentLiveActivity/Info.plist`)
- ✅ `NSExtensionPointIdentifier` = `com.apple.widgetkit-extension`

## 🚀 Usage from React Native

```typescript
import { liveActivityService } from './services/liveActivityService';

// Start Live Activity
await liveActivityService.startPumpingTimer('הורה', 'תינוק');

// Update every second
await liveActivityService.updatePumpingTimer(elapsedSeconds);

// Stop
await liveActivityService.stopPumpingTimer();
```

## 🔧 Xcode Configuration

1. **Main App Target**:
   - Signing & Capabilities → Add "App Groups" → `group.com.harel.calmparentapp`
   - Signing & Capabilities → Add "Live Activities" (if available in UI)

2. **Widget Extension Target**:
   - Signing & Capabilities → Add "App Groups" → `group.com.harel.calmparentapp`
   - Signing & Capabilities → Add "Live Activities" (if available in UI)
   - Both targets must use the **same Development Team**

## 🐛 Troubleshooting

### "Entitlement not found" Error
- ✅ Verify both `.entitlements` files exist and match
- ✅ Check that both targets have the same App Group
- ✅ Ensure both targets use the same Development Team
- ✅ Clean build folder (Cmd+Shift+K) and rebuild

### Files Missing (Red in Xcode)
- ✅ Run `npx expo prebuild --clean` to copy files
- ✅ Verify files exist in `CalmParentLiveActivity/` folder
- ✅ Check that files are added to the Widget Extension target

### Live Activity Not Appearing
- ✅ Check device supports Live Activities (iOS 16.1+)
- ✅ Verify `ActivityAuthorizationInfo().areActivitiesEnabled` returns `true`
- ✅ Check device settings: Settings → Face ID & Passcode → Allow Access When Locked

## 📝 Notes

- All identifiers must match exactly between main app and extension
- App Group must be configured in Apple Developer Portal
- Live Activities require iOS 16.1+ and a physical device (not simulator for full testing)

