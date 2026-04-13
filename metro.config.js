const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure Metro treats .cjs files as source code, not static assets!
config.resolver.sourceExts.push("cjs");
config.resolver.sourceExts.push("mjs");

// Fix Firebase Auth 'Component auth has not been registered yet' issue
config.resolver.unstable_enablePackageExports = false;

module.exports = config;