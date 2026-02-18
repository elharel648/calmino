const { withInfoPlist, withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withLiveActivity = (config) => {
  // 1. עדכון Info.plist של האפליקציה הראשית
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    config.modResults.NSAppleEventsUsageDescription = 'האפליקציה צריכה גישה ל-Live Activities';
    return config;
  });

  // 2. העתקת קבצי Swift ו-Info.plist + יצירת Entitlements
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const widgetName = 'CalmParentLiveActivity';
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;

      const sourceDir = path.join(projectRoot, widgetName);
      const targetDir = path.join(iosRoot, widgetName);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // רשימה מעודכנת של קבצים להעתקה
      const filesToCopy = [
        'ActivityAttributes.swift',
        'BabysitterShiftLiveActivity.swift',
        'SleepLiveActivity.swift',
        'CalmParentLiveActivityBundle.swift',
        'Info.plist',
        'CalmParentLiveActivity.entitlements',
        'GlassComponents.swift',
      ];

      let copiedCount = 0;
      filesToCopy.forEach((fileName) => {
        const sourcePath = path.join(sourceDir, fileName);
        const targetPath = path.join(targetDir, fileName);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Copied ${fileName} to ${targetDir}`);
          copiedCount++;
        } else {
          console.warn(`⚠️ Source file not found: ${sourcePath}`);
        }
      });

      // יצירת Entitlements (אם לא הועתק)
      const entitlementsPath = path.join(targetDir, `${widgetName}.entitlements`);
      if (!fs.existsSync(entitlementsPath)) {
        const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
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
</plist>`;
        fs.writeFileSync(entitlementsPath, entitlementsContent);
      }

      return config;
    }
  ]);

  // 3. הגדרות Xcode Target
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const widgetName = 'CalmParentLiveActivity';

    if (xcodeProject.pbxTargetByName(widgetName)) {
      return config;
    }

    if (!config.ios || !config.ios.bundleIdentifier) {
      return config;
    }

    const bundleId = `${config.ios.bundleIdentifier}.LiveActivity`;
    const pbxProjectSection = xcodeProject.pbxProjectSection();
    const projectUuid = Object.keys(pbxProjectSection).find(key => key !== 'undefined' && !key.endsWith('_comment'));

    if (!projectUuid) return config;

    const mainGroupKey = pbxProjectSection[projectUuid].mainGroup;
    const target = xcodeProject.addTarget(widgetName, 'app_extension', widgetName);

    // הוספת קבצי ה-Widget ל-Target של ה-Widget
    const widgetFiles = [
      'BabysitterShiftLiveActivity.swift',
      'SleepLiveActivity.swift',
      'CalmParentLiveActivityBundle.swift',
      'ActivityAttributes.swift', // הכרחי שיהיה בשניהם!
    ];

    widgetFiles.forEach(file => {
      const filePath = path.join(widgetName, file);
      xcodeProject.addSourceFile(filePath, { target: target.uuid }, mainGroupKey);
    });

    // הוספת Frameworks ל-Widget
    ['ActivityKit.framework', 'WidgetKit.framework', 'SwiftUI.framework'].forEach(f => {
      xcodeProject.addFramework(f, { target: target.uuid, weak: true });
    });

    // הוספת קבצים משותפים ל-Main Target
    const mainTargetKey = xcodeProject.findTargetKey(config.name);
    if (mainTargetKey) {
      const glassPath = path.join(widgetName, 'GlassComponents.swift');
      xcodeProject.addSourceFile(glassPath, { target: mainTargetKey }, mainGroupKey);

      const attributesPath = path.join(widgetName, 'ActivityAttributes.swift');
      xcodeProject.addSourceFile(attributesPath, { target: mainTargetKey }, mainGroupKey);
    }

    // הגדרות Build
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    Object.keys(configurations).forEach(key => {
      const configObj = configurations[key];
      if (typeof configObj === 'object' && configObj.buildSettings) {
        const settings = configObj.buildSettings;
        if (settings.PRODUCT_NAME === `"${widgetName}"` || settings.PRODUCT_NAME === widgetName) {
          settings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
          settings.IPHONEOS_DEPLOYMENT_TARGET = '16.1';
          settings.SWIFT_VERSION = '5.0';
          settings.CODE_SIGN_ENTITLEMENTS = `"${widgetName}/${widgetName}.entitlements"`;
          settings.INFOPLIST_FILE = `"${widgetName}/Info.plist"`;
          settings.SKIP_INSTALL = 'YES';
          settings.CODE_SIGN_STYLE = 'Automatic';
          settings.DEVELOPMENT_TEAM = 'Q5555SW7GS';
        }
      }
    });

    return config;
  });

  return config;
};

module.exports = withLiveActivity;