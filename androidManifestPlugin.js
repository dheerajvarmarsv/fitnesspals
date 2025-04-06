const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCustomAndroidManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Add any custom manifest modifications here
    // For example, adding permissions or modifying application attributes

    return config;
  });
}; 