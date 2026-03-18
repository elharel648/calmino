const fs = require('fs');

// 1. Fix firestore.rules
const rulesPath = '/Users/harel/APP/firestore.rules';
const rulesLines = fs.readFileSync(rulesPath, 'utf8').split('\n');
if (rulesLines.length > 314) {
    // Truncate everything after line 313
    const fixedRules = rulesLines.slice(0, 313).join('\n') + '\n';
    fs.writeFileSync(rulesPath, fixedRules, 'utf8');
    console.log('Fixed firestore.rules duplication.');
}

// 2. Fix app.json permissions
const appJsonPath = '/Users/harel/APP/app.json';
let appJsonStr = fs.readFileSync(appJsonPath, 'utf8');
const oldLength = appJsonStr.length;
// Remove calendar usage
appJsonStr = appJsonStr.replace(/"NSCalendarsUsageDescription":\s*"[^"]*",?\s*/g, '');
// Remove reminders usage
appJsonStr = appJsonStr.replace(/"NSRemindersUsageDescription":\s*"[^"]*",?\s*/g, '');

if (appJsonStr.length !== oldLength) {
    fs.writeFileSync(appJsonPath, appJsonStr, 'utf8');
    console.log('Cleaned up app.json permissions.');
}
