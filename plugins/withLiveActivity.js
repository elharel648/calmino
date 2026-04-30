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
        'SleepLiveActivity.swift',
        'FeedingLiveActivity.swift',
        'BreastfeedingLiveActivity.swift',
        'WhiteNoiseLiveActivity.swift',
        'CalmParentLiveActivityBundle.swift',
        'TimerIntents.swift',
        'Info.plist',
        'GlassComponents.swift',
        'CalmParentLiveActivity.entitlements',
        'SharedActivityAttributes.swift',
      ];

      let copiedCount = 0;
      filesToCopy.forEach((fileName) => {
        const sourcePath = path.join(sourceDir, fileName);
        const targetPath = path.join(targetDir, fileName);

        if (!fs.existsSync(targetPath)) {
          // If copying SharedActivityAttributes, pull it from local-modules/shared-attributes
          if (fileName === 'SharedActivityAttributes.swift') {
            const localModulePath = path.join(projectRoot, 'local-modules', 'activity-kit-module-v2', 'ios', 'SharedActivityAttributes.swift');
            if (fs.existsSync(localModulePath)) {
              fs.copyFileSync(localModulePath, targetPath);
              console.log(`✅ Copied ${fileName} from local-modules to ${targetDir}`);
              copiedCount++;
            } else {
              console.warn(`⚠️ SharedActivityAttributes.swift not found in local-modules`);
            }
          } else {
            // standard copy
            if (fs.existsSync(sourcePath)) {
              fs.copyFileSync(sourcePath, targetPath);
              console.log(`✅ Copied ${fileName} to ${targetDir}`);
              copiedCount++;
            } else {
              console.warn(`⚠️ Source file not found: ${sourcePath}`);
            }
          }
        }
      });




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

    // FIX node-xcode BUG: Build phases must be explicitly added to a new target
    xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);

    // הוספת קבצי ה-Widget ל-Target של ה-Widget
    const widgetFiles = [
      'SleepLiveActivity.swift',
      'FeedingLiveActivity.swift',
      'BreastfeedingLiveActivity.swift',
      'WhiteNoiseLiveActivity.swift',
      'CalmParentLiveActivityBundle.swift',
      'TimerIntents.swift',
      'GlassComponents.swift',
      'SharedActivityAttributes.swift', 
    ];

    const sourcesPhase = target.pbxNativeTarget.buildPhases.find(p => p && p.comment && p.comment.includes('Sources'));
    const widgetSourcesPhaseUuid = sourcesPhase ? sourcesPhase.value : null;
    const widgetSourcesPhase = widgetSourcesPhaseUuid ? xcodeProject.hash.project.objects.PBXSourcesBuildPhase[widgetSourcesPhaseUuid] : null;

    widgetFiles.forEach(file => {
      const filePath = path.join(widgetName, file);
      // node-xcode returns the file object which contains the uuid in the PBXBuildFile section
      const addedFile = xcodeProject.addSourceFile(filePath, { target: target.uuid }, mainGroupKey);

      // FIX node-xcode BUG: Manually push the file to the Widget's Sources phase!
      if (addedFile && addedFile.uuid && widgetSourcesPhase) {
        if (!widgetSourcesPhase.files) widgetSourcesPhase.files = [];

        // Only push if not already present
        const isPresent = widgetSourcesPhase.files.some(f => f.value === addedFile.uuid);
        if (!isPresent) {
          widgetSourcesPhase.files.push({
            value: addedFile.uuid,
            comment: `${file} in Sources`
          });
        }
      }
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

      // ADD TimerIntents to main target so iOS can resolve the App Intent from the lock screen!
      const intentsPath = path.join(widgetName, 'TimerIntents.swift');
      xcodeProject.addSourceFile(intentsPath, { target: mainTargetKey }, mainGroupKey);


      // FIX node-xcode BUG: Remove widget-only files leaked into the main target!
      const mainSourcesPhase = xcodeProject.pbxSourcesBuildPhaseObj(mainTargetKey);
      if (mainSourcesPhase && mainSourcesPhase.files) {
        mainSourcesPhase.files = mainSourcesPhase.files.filter(f => {
          const comment = f.comment || '';
          if (
            comment.includes('SleepLiveActivity.swift') ||
            comment.includes('FeedingLiveActivity.swift') ||
            comment.includes('BreastfeedingLiveActivity.swift') ||
            comment.includes('WhiteNoiseLiveActivity.swift') ||
            comment.includes('CalmParentLiveActivityBundle.swift')
          ) {
            // Note: TimerIntents.swift MUST remain in the main target for iOS 17+ interactive buttons to work.
            return false; // strip them from Calmino target
          }
          return true;
        });
      }
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
          settings.INFOPLIST_FILE = `"${widgetName}/Info.plist"`;
          settings.SKIP_INSTALL = 'YES';
          
          // REMOVED manual CODE_SIGN_IDENTITY hardcoding
          // EAS requires CODE_SIGN_STYLE = Automatic to be paired with either no identity
          // or explicitly 'Apple Development'. Fastlane dynamically signs Release builds!

          settings.CODE_SIGN_ENTITLEMENTS = '"CalmParentLiveActivity/CalmParentLiveActivity.entitlements"';
          settings.DEVELOPMENT_TEAM = 'Q5555SW7GS';
          // Sync version + build number with the main app so the extension CFBundleVersion matches
          settings.CURRENT_PROJECT_VERSION = config.ios?.buildNumber || config.android?.versionCode?.toString() || '1';
          settings.MARKETING_VERSION = config.version || '1.0.0';

          // Forcefully delete manual provisioning overrides if they exist in the raw Xcode project
          delete settings.PROVISIONING_PROFILE;
          delete settings['"PROVISIONING_PROFILE"'];
          delete settings.PROVISIONING_PROFILE_SPECIFIER;
          delete settings['"PROVISIONING_PROFILE_SPECIFIER"'];
        }
      }
    });

    return config;
  });

  return config;
};

module.exports = withLiveActivity;