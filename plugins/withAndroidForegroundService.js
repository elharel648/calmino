const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo Config Plugin: Injects Android Foreground Service declaration
 * into AndroidManifest.xml for persistent timer notifications.
 */
const withAndroidForegroundService = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    // Ensure services array exists
    if (!application.service) {
      application.service = [];
    }

    // Check if Notifee's ForegroundService is already declared
    const alreadyDeclared = application.service.some(
      (s) => s.$?.['android:name'] === 'app.notifee.core.ForegroundService'
    );

    if (!alreadyDeclared) {
      application.service.push({
        $: {
          'android:name': 'app.notifee.core.ForegroundService',
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
        },
      });
    }

    return config;
  });
};

module.exports = withAndroidForegroundService;
