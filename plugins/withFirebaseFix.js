const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for React Native Firebase non-modular header warnings with static frameworks.
 * 
 * Runs AFTER react_native_post_install to prevent override.
 * Sets CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES for all targets.
 */
const withFirebaseFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      if (podfileContent.includes('FIREBASE_FIX_V4')) {
        return config;
      }

      const fixCode = `
    # FIREBASE_FIX_V4 - Runs AFTER react_native_post_install
    installer.pods_project.build_configurations.each do |bc|
      bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      // Inject AFTER react_native_post_install(...)
      const reactPostInstallRegex = /react_native_post_install\(\s*installer[\s\S]*?\)\s*\n/;
      const match = podfileContent.match(reactPostInstallRegex);
      
      if (match) {
        const insertPos = podfileContent.indexOf(match[0]) + match[0].length;
        podfileContent = 
          podfileContent.substring(0, insertPos) + 
          fixCode + 
          podfileContent.substring(insertPos);
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Firebase non-modular fix applied (v4, after react_native_post_install)');
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;
