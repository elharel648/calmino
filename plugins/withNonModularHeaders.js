const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(file)) {
        return config;
      }

      let contents = fs.readFileSync(file, 'utf8');

      // Apple Clang specific options applied globally across ALL framework modules 
      // to resolve include of non-modular headers, preventing React umbrella errors.
      const injection = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`;

      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${injection}`
        );
        fs.writeFileSync(file, contents);
      }

      return config;
    },
  ]);
};
