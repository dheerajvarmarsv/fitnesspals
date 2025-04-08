const { withAppDelegate } = require("@expo/config-plugins");

module.exports = function withHealthKitConfig(config) {
  return withAppDelegate(config, async (config) => {
    if (config.modResults.contents.includes('initializeBackgroundObservers')) {
      return config;
    }

    // Add import statement if it doesn't exist
    const importStatement = `#import <RCTAppleHealthKit/RCTAppleHealthKit.h>`;
    if (!config.modResults.contents.includes(importStatement)) {
      config.modResults.contents = config.modResults.contents.replace(
        '#import <React/RCTLinkingManager.h>',
        `#import <React/RCTLinkingManager.h>\n${importStatement}`
      );
    }

    // Add HealthKit initialization
    config.modResults.contents = config.modResults.contents.replace(
      'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];',
      'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];\n  // Initialize HealthKit background observers\n  [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];'
    );

    return config;
  });
};