# Entitlements Configuration Guide

## Main App Entitlements (`CalmParentApp.entitlements`)

The main app **MUST** have the following entitlements:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.usernotifications.live-activities</key>
	<true/>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.com.harel.calmparentapp</string>
	</array>
</dict>
</plist>
```

## Widget Extension Entitlements (`CalmParentLiveActivity.entitlements`)

The Widget Extension **MUST** have the same entitlements:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.usernotifications.live-activities</key>
	<true/>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.com.harel.calmparentapp</string>
	</array>
</dict>
</plist>
```

## Important Notes

1. **Both targets must have the same App Group**: `group.com.harel.calmparentapp`
2. **Both targets must have Live Activities enabled**: `com.apple.developer.usernotifications.live-activities`
3. **Bundle IDs must match the pattern**:
   - Main App: `com.harel.calmparentapp`
   - Extension: `com.harel.calmparentapp.CalmParentLiveActivity`

## Xcode Configuration

1. Select **CalmParentApp** target → **Signing & Capabilities**
   - Add capability: **App Groups** → `group.com.harel.calmparentapp`
   - Add capability: **Live Activities** (if available in Xcode UI)

2. Select **CalmParentLiveActivity** target → **Signing & Capabilities**
   - Add capability: **App Groups** → `group.com.harel.calmparentapp`
   - Add capability: **Live Activities** (if available in Xcode UI)

3. Both targets must use the **same Development Team**

## Verification

After configuration, verify:
- ✅ Both `.entitlements` files exist and match
- ✅ Both targets have the same App Group
- ✅ Both targets have Live Activities enabled
- ✅ Bundle IDs follow the pattern above
- ✅ Same Development Team is selected for both targets

