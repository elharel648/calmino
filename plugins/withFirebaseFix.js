const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for React Native Firebase non-modular header error.
 * 
 * CRITICAL: The fix MUST run AFTER react_native_post_install() because
 * that function resets build settings. We inject right after it.
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

      // Skip if already applied
      if (podfileContent.includes('FIREBASE_FIX_V3')) {
        return config;
      }

      // Remove any previous fix attempts
      podfileContent = podfileContent.replace(
        /\s*# FIREBASE_NON_MODULAR_FIX_APPLIED[\s\S]*?# Also strip -Werror[\s\S]*?end\n\s*end\n\s*end\n/g,
        '\n'
      );

      const fixCode = `
    # FIREBASE_FIX_V3 - Must run AFTER react_native_post_install
    installer.pods_project.build_configurations.each do |bc|
      bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        if target.name.start_with?('RNFB') || target.name.start_with?('Firebase') || target.name.start_with?('GoogleUtilities')
          bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          bc.build_settings['OTHER_CFLAGS'] = ['$(inherited)', '-Wno-non-modular-include-in-framework-module']
        end
      end
    end
`;

      // Strategy: inject AFTER react_native_post_install(...) call
      // Find the closing paren of react_native_post_install and inject after it
      const reactPostInstallRegex = /react_native_post_install\(\s*installer[\s\S]*?\)\s*\n/;
      const match = podfileContent.match(reactPostInstallRegex);
      
      if (match) {
        const insertPos = podfileContent.indexOf(match[0]) + match[0].length;
        podfileContent = 
          podfileContent.substring(0, insertPos) + 
          fixCode + 
          podfileContent.substring(insertPos);
        console.log('✅ Firebase fix injected AFTER react_native_post_install');
      } else {
        // Fallback: inject before the last 'end' in post_install
        podfileContent = podfileContent.replace(
          /(post_install do \|installer\|[\s\S]*?)(  end\s*\n*end)/,
          `$1${fixCode}$2`
        );
        console.log('✅ Firebase fix injected (fallback position)');
      }

      fs.writeFileSync(podfilePath, podfileContent);
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;
