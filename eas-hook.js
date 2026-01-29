const fs = require('fs');
const path = require('path');

module.exports = async function transformAsync(config) {
    const pbxprojPath = path.join(config.projectRoot, 'ios', 'CalmParentApp.xcodeproj', 'project.pbxproj');

    if (fs.existsSync(pbxprojPath)) {
        let content = fs.readFileSync(pbxprojPath, 'utf8');

        // Change objectVersion from 70 to 56
        content = content.replace(/objectVersion = 70;/, 'objectVersion = 56;');

        fs.writeFileSync(pbxprojPath, content, 'utf8');
        console.log('✅ Downgraded objectVersion to 56 for CocoaPods compatibility');
    }

    return config;
};
