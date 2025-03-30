const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function androidManifestPlugin(config) {
  return withAndroidManifest(config, async (config) => {
    let androidManifest = config.modResults.manifest;

    // Add intent filter for Health Connect permissions
    androidManifest.application[0].activity[0]['intent-filter'].push({
      action: [
        {
          $: {
            'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE',
          },
        },
      ],
    });

    return config;
  });
}; 