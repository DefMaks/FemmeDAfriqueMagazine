const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withPortraitOptional(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = [];
    }

    // Retirer toute déclaration existante de android.hardware.screen.portrait
    manifest['uses-feature'] = manifest['uses-feature'].filter(
      (item) => item.$ && item.$['android:name'] !== 'android.hardware.screen.portrait'
    );

    // Déclarer la fonctionnalité portrait comme facultative (android:required="false")
    manifest['uses-feature'].push({
      $: {
        'android:name': 'android.hardware.screen.portrait',
        'android:required': 'false',
      },
    });

    return modConfig;
  });
};
