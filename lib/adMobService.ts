import { Platform } from 'react-native';
import {
  AppOpenAd,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

// Use test IDs in development
const isTestMode = __DEV__;

// App Open Ad unit IDs
const APP_OPEN_AD_UNIT_ID = Platform.select({
  ios: isTestMode ? TestIds.APP_OPEN : 'ca-app-pub-6833157133488263/6430444881',
  android: isTestMode ? TestIds.APP_OPEN : 'ca-app-pub-6833157133488263/9820424352',
  default: TestIds.APP_OPEN,
});

// App Open Ad
let appOpenAd: AppOpenAd | null = null;
let appOpenAdLoadTime = 0;

// Check if the ad has expired (4 hours)
const isAppOpenAdExpired = () => {
  const now = Date.now();
  const fourHoursInMs = 4 * 60 * 60 * 1000;
  return now - appOpenAdLoadTime >= fourHoursInMs;
};

// Load App Open Ad
export const loadAppOpenAd = async (): Promise<void> => {
  // Skip for web platform
  if (Platform.OS === 'web') return;

  // If an ad is already loaded and not expired, don't load another one
  if (appOpenAd && !isAppOpenAdExpired()) {
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      // Create a new App Open Ad instance
      appOpenAd = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      // Set up event listeners
      const unsubscribeLoaded = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('App Open Ad loaded successfully');
        appOpenAdLoadTime = Date.now();
        unsubscribeLoaded();
        resolve();
      });

      const unsubscribeError = appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('App Open Ad failed to load:', error);
        appOpenAd = null;
        unsubscribeError();
        reject(error);
      });

      const unsubscribeClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('App Open Ad closed');
        appOpenAd = null;
        unsubscribeClosed();
        // Preload the next ad
        loadAppOpenAd().catch(err => console.error('Failed to preload next App Open Ad:', err));
      });

      // Load the ad
      appOpenAd.load();
    } catch (error) {
      console.error('Error creating App Open Ad:', error);
      appOpenAd = null;
      reject(error);
    }
  });
};

// Show App Open Ad
export const showAppOpenAd = async (): Promise<boolean> => {
  // Skip for web platform
  if (Platform.OS === 'web') return false;

  try {
    // If no ad is loaded or it's expired, load a new one
    if (!appOpenAd || isAppOpenAdExpired()) {
      await loadAppOpenAd();
    }

    // Check if ad is loaded
    if (!appOpenAd) {
      return false;
    }

    // Show the ad
    await appOpenAd.show();
    return true;
  } catch (error) {
    console.error('Error showing App Open Ad:', error);
    return false;
  }
};