const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for React Native Firebase non-modular header error with New Architecture.
 * 
 * Error: "include of non-modular header inside framework module 'RNFBApp'"
 * 
 * Root cause: -Werror flag treats non-modular-include warnings as fatal errors.
 * Fix: Apply CLANG_ALLOW_NON_MODULAR_INCLUDES to ALL targets + strip -Werror 
 * from RNFB pods specifically.
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
      if (podfileContent.includes('FIREBASE_NON_MODULAR_FIX_APPLIED')) {
        return config;
      }

      const fixCode = `
    # FIREBASE_NON_MODULAR_FIX_APPLIED
    # Fix React Native Firebase non-modular header errors (Xcode 16+/iOS 26)
    # Apply to ALL targets at project level
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
    # Also strip -Werror from RNFB targets to prevent warning-as-error
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase') || target.name.start_with?('GoogleUtilities')
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          # Remove -Werror to prevent warning-as-error for non-modular includes
          if bc.build_settings['OTHER_CFLAGS']
            if bc.build_settings['OTHER_CFLAGS'].is_a?(Array)
              bc.build_settings['OTHER_CFLAGS'] = bc.build_settings['OTHER_CFLAGS'].reject { |f| f == '-Werror' }
            elsif bc.build_settings['OTHER_CFLAGS'].is_a?(String)
              bc.build_settings['OTHER_CFLAGS'] = bc.build_settings['OTHER_CFLAGS'].gsub('-Werror', '')
            end
          end
          # Also check GCC_TREAT_WARNINGS_AS_ERRORS
          bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          # Disable the specific warning entirely for these targets
          existing = bc.build_settings['OTHER_SWIFT_FLAGS'] || ''
          bc.build_settings['OTHER_CFLAGS'] = [
            '$(inherited)',
            '-Wno-non-modular-include-in-framework-module'
          ]
        end
      end
    end`;

      // Inject inside existing post_install block
      if (podfileContent.includes('post_install do |installer|')) {
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${fixCode}`
        );
      } else {
        // Create new post_install block before last 'end'
        podfileContent = podfileContent.replace(
          /(\nend\s*)$/,
          `\n  post_install do |installer|${fixCode}\n  end$1`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Applied Firebase non-modular header fix to Podfile (aggressive mode)');

      return config;
    },
  ]);
};

module.exports = withFirebaseFix;
