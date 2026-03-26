const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Minimal fix for react-native-firebase v23 on New Architecture (Expo 52).
 * 
 * We do NOT use `use_frameworks!` at all, which allows CocoaPods to build
 * standard static libraries. This cleanly bypasses the strict Clang module
 * constraints that broke RCTBridgeModule imports on static frameworks.
 * 
 * However, Firebase's Swift pods (like FirebaseSessions) require their Obj-C
 * dependencies (GoogleUtilities, nanopb) to define module maps.
 * Therefore, we must inject `use_modular_headers!` globally.
 */
const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      if (podfileContent.includes('use_modular_headers!')) {
        return config;
      }

      // Add use_modular_headers! after platform line
      podfileContent = podfileContent.replace(
        /(platform :ios.*\n)/,
        `$1\nuse_modular_headers!\n`
      );

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Injected use_modular_headers! for Firebase Swift compatibility');
      return config;
    },
  ]);
};

module.exports = withModularHeaders;
