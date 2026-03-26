const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for React Native Firebase non-modular header error with New Architecture.
 * 
 * Error: "include of non-modular header inside framework module 'RNFBApp'"
 * This adds CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
 * to all RNFB pod targets via Podfile post_install.
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

      // Check if fix is already applied
      if (podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        return config;
      }

      // Add post_install hook to allow non-modular includes for Firebase pods
      const postInstallFix = `
  # Fix React Native Firebase non-modular header errors
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase') || target.name.start_with?('GoogleUtilities')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
  end`;

      // Check if there's already a post_install block
      if (podfileContent.includes('post_install do |installer|')) {
        // Inject inside the existing post_install block
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
    # Fix React Native Firebase non-modular header errors
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase') || target.name.start_with?('GoogleUtilities')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end`
        );
      } else {
        // Append before the last 'end' (closing the target block)
        podfileContent = podfileContent.replace(
          /end\s*$/,
          `${postInstallFix}\nend\n`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Applied Firebase non-modular header fix to Podfile');

      return config;
    },
  ]);
};

module.exports = withFirebaseFix;
