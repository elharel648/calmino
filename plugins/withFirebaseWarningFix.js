const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Definitive fix for RN Firebase v23 + Expo 52 New Architecture + Static Frameworks.
 *
 * ROOT CAUSE:
 * `useFrameworks: static` makes CocoaPods set DEFINES_MODULE=YES on every pod.
 * This generates a .modulemap for each pod. However, RNFB pods do
 * `#import <React/RCTBridgeModule.h>` — pulling React-Core headers into
 * the RNFB module boundary. Clang then enforces strict module import rules,
 * causing a HARD ERROR (not a warning):
 *   "declaration of 'RCTBridgeModule' must be imported from module
 *    'RNFBApp.RNFBAppModule' before it is required"
 *
 * SOLUTION:
 * Set DEFINES_MODULE=NO for all RNFB pods. This prevents module map
 * generation for these pods, so Clang never enforces modular include
 * rules on them. The pods still compile and link as static frameworks.
 * Firebase SDK pods keep their module maps and Swift bridging works fine.
 */
const withFirebaseWarningFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      if (podfileContent.includes('RNFB_MODULE_FIX')) {
        return config;
      }

      const postInstallFix = `
    # RNFB_MODULE_FIX: Disable module map generation for RNFB pods.
    # This prevents the hard Clang module import error where RCTBridgeModule
    # gets incorrectly scoped into RNFB's module boundary.
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB')
        target.build_configurations.each do |bc|
          bc.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end
    end
`;

      const reactPostInstallRegex = /react_native_post_install\(\s*installer[\s\S]*?\)\s*\n/;
      const match = podfileContent.match(reactPostInstallRegex);

      if (match) {
        const insertPos = podfileContent.indexOf(match[0]) + match[0].length;
        podfileContent =
          podfileContent.substring(0, insertPos) +
          postInstallFix +
          podfileContent.substring(insertPos);
      } else {
        // Fallback: append to post_install block
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|\n/,
          `post_install do |installer|\n${postInstallFix}`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ RNFB_MODULE_FIX: Disabled DEFINES_MODULE for RNFB pods.');
      return config;
    },
  ]);
};

module.exports = withFirebaseWarningFix;
