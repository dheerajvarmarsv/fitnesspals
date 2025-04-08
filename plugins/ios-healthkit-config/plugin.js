const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ios-healthkit-config',
  ios: {
    modifyAppDelegate(appDelegateContent) {
      // Look for the didFinishLaunchingWithOptions method
      if (!appDelegateContent.includes('initializeBackgroundObservers')) {
        // Add the RCTAppleHealthKit import if it doesn't exist
        if (!appDelegateContent.includes('#import <RCTAppleHealthKit/RCTAppleHealthKit.h>')) {
          appDelegateContent = appDelegateContent.replace(
            '#import <React/RCTLinkingManager.h>',
            '#import <React/RCTLinkingManager.h>\n#import <RCTAppleHealthKit/RCTAppleHealthKit.h>'
          );
        }
        
        // Add the HealthKit initialization code
        appDelegateContent = appDelegateContent.replace(
          'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];',
          'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];\n  // Initialize HealthKit background observers\n  [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];'
        );
      }
      
      return appDelegateContent;
    },
  },
};