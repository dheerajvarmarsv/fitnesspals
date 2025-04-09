// plugins/ios-healthkit-config/index.js
const { withAppDelegate } = require("@expo/config-plugins");

module.exports = function withHealthKitConfig(config) {
  return withAppDelegate(config, async (config) => {
    // If HealthKit init is already there, do nothing:
    if (config.modResults.contents.includes('initializeBackgroundObservers')) {
      return config;
    }

    // Insert "#import \"RCTAppleHealthKit.h\"" if missing
    const importStatement = `#import "RCTAppleHealthKit.h"`;
    if (!config.modResults.contents.includes(importStatement)) {
      config.modResults.contents = config.modResults.contents.replace(
        '#import <React/RCTLinkingManager.h>',
        `#import <React/RCTLinkingManager.h>\n${importStatement}`
      );
    }

    // Right after the RCTBridge creation, add HealthKit background observers
    config.modResults.contents = config.modResults.contents.replace(
      'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];',
      'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];\n  // Initialize HealthKit background observers\n  [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];'
    );

    return config;
  });
};