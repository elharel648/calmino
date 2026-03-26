const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Combined fix for react-native-firebase v23 + useFrameworks: static.
 * 
 * TWO separate issues require TWO fixes applied together:
 * 
 * 1. use_modular_headers! — Makes React headers available as proper module 
 *    headers. Without this: "RCTBridgeModule must be imported from module" error.
 * 
 * 2. CLANG_ALLOW_NON_MODULAR_INCLUDES — Allows the remaining non-modular 
 *    includes that React-Core still has. Without this: "include of non-modular 
 *    header inside framework module" treated as error by -Werror.
 *    MUST run AFTER react_native_post_install to avoid being overridden.
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

      if (podfileContent.includes('RNFB_COMBINED_FIX')) {
        return config;
      }

      // FIX 1: Add use_modular_headers! after platform line
      podfileContent = podfileContent.replace(
        /(platform :ios.*\n)/,
        `$1\n# RNFB_COMBINED_FIX Part 1 - Enable modular headers globally\nuse_modular_headers!\n`
      );

      // FIX 2: Add CLANG_ALLOW AFTER react_native_post_install
      const postInstallFix = `
    # RNFB_COMBINED_FIX Part 2 - Allow non-modular includes (runs AFTER react_native_post_install)
    installer.pods_project.build_configurations.each do |bc|
      bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
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
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Applied RNFB combined fix (modular_headers + CLANG_ALLOW)');
      return config;
    },
  ]);
};

module.exports = withModularHeaders;
