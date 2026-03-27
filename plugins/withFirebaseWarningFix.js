const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Surgical fix for RN Firebase v23 + Expo 52 New Architecture + Static Frameworks.
 * 
 * Problem:
 * When using `useFrameworks: static` (required for Firebase Swift bridging like 
 * FirebaseCrashlytics-Swift.h), the RN Firebase targets encounter a warning about 
 * non-modular includes in framework modules. Because the project treats warnings 
 * as errors (-Werror), the build fails.
 * 
 * Previous attempts used `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES`, 
 * but that aggressively broke the module maps, causing `RCTBridgeModule` macros 
 * to fail parsing (type specifier missing, etc.).
 * 
 * Solution:
 * Instead of breaking the module map, we simply tell CocoaPods to NOT treat 
 * warnings as compilation errors (`GCC_TREAT_WARNINGS_AS_ERRORS = 'NO'`) 
 * specifically for the RN Firebase pods. This allows the non-modular include 
 * warning to cleanly pass through without breaking macro parsing.
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

      if (podfileContent.includes('RNFB_WARNING_FIX')) {
        return config;
      }

      // Inject the compiler warning bypass into the post_install block,
      // specifically AFTER react_native_post_install has run.
      const postInstallFix = `
    # RNFB_WARNING_FIX: Disable -Werror for RNFB pods to bypass non-modular include failures
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB')
        target.build_configurations.each do |bc|
          bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          bc.build_settings['WARNING_CFLAGS'] = '-Wno-error=non-modular-include-in-framework-module'
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
        // Fallback if react_native_post_install isn't found
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|\n/,
          `post_install do |installer|\n${postInstallFix}`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Injected targeted -Werror bypass for RN Firebase pods.');
      return config;
    },
  ]);
};

module.exports = withFirebaseWarningFix;
