const { AndroidConfig, createRunOncePlugin, withAndroidManifest } = require('expo/config-plugins');

const pkg = {
  name: 'with-android-cleartext',
  version: '1.0.0',
};

const withAndroidCleartext = (config) =>
  withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    mainApplication.$['android:usesCleartextTraffic'] = 'true';

    return config;
  });

module.exports = createRunOncePlugin(withAndroidCleartext, pkg.name, pkg.version);
