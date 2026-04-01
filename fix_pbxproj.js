const xcode = require('xcode');
const fs = require('fs');

const projectPath = 'ios/Calmino.xcodeproj/project.pbxproj';
const myProj = xcode.project(projectPath);

myProj.parse(function (err) {
    if (err) {
        console.error('Error parsing project:', err);
        return;
    }

    const firstTargetUuid = myProj.getFirstTarget().uuid;

    // Find our extension target
    let extensionUuid;
    const targets = myProj.pbxNativeTargetSection();
    for (const uuid in targets) {
        if (!uuid.endsWith('_comment') && targets[uuid].name === 'CalmParentLiveActivity') {
            extensionUuid = uuid;
            break;
        }
    }

    if (!extensionUuid) {
        console.error('Extension target not found');
        return;
    }

    // Add target dependency
    myProj.addTargetDependency(firstTargetUuid, [extensionUuid]);

    fs.writeFileSync(projectPath, myProj.writeSync());
    console.log('Target dependency successfully added to project.pbxproj!');
});
