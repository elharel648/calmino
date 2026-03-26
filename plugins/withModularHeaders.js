const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for react-native-firebase v23 + useFrameworks: static + New Architecture.
 * 
 * Problem: When building with static frameworks, all pods must be compiled as 
 * modular frameworks. But RNFB Obj-C headers use #import <React/RCTBridgeModule.h> 
 * which is not a modular import, causing "must be imported from module" errors.
 *
 * Solution: Add `use_modular_headers!` globally so React headers become proper 
 * module headers accessible from other frameworks.
 * 
 * This is the approach recommended by the react-native-firebase team.
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

      if (podfileContent.includes('MODULAR_HEADERS_FIX')) {
        return config;
      }

      // Add use_modular_headers! after platform line
      // This allows React headers to be imported as module headers from RNFB frameworks
      podfileContent = podfileContent.replace(
        /(platform :ios.*\n)/,
        `$1\n# MODULAR_HEADERS_FIX - Required for react-native-firebase + static frameworks\nuse_modular_headers!\n`
      );

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Applied use_modular_headers! fix for RNFB static framework compatibility');
      return config;
    },
  ]);
};

module.exports = withModularHeaders;
