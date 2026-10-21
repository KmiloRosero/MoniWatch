const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const WATCH_FEATURE = 'android.hardware.type.watch';
const STANDALONE_META_DATA = 'com.google.android.wearable.standalone';

/**
 * Marks the APK as a Wear OS app:
 * - uses-feature android.hardware.type.watch: Play Store only offers it to watches.
 * - standalone=true: works without the phone app installed (it talks to the backend over Wi-Fi/LTE).
 */
module.exports = function withWearOs(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const features = (manifest['uses-feature'] ?? []).filter(
      (feature) => feature.$['android:name'] !== WATCH_FEATURE,
    );
    manifest['uses-feature'] = [...features, { $: { 'android:name': WATCH_FEATURE } }];

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, STANDALONE_META_DATA, 'true');

    return modConfig;
  });
};
