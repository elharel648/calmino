const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
            if (!fs.existsSync(file)) {
                return config;
            }

            let contents = fs.readFileSync(file, 'utf8');

            if (!contents.includes('use_modular_headers!')) {
                contents = contents.replace(
                    /use_expo_modules!/,
                    `use_expo_modules!\n  use_modular_headers!`
                );
                fs.writeFileSync(file, contents);
            }

            return config;
        },
    ]);
};
