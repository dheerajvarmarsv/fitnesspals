#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <RCTAppleHealthKit/RCTAppleHealthKit.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";
  self.initialProps = @{};

  // Create the RCTBridge
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  
  // Initialize HealthKit background observers
  [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];
  
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// ... rest of your existing AppDelegate implementation ...

@end 