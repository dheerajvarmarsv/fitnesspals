import { Platform } from 'react-native';
import { MobileAds, MaxAdContentRating } from 'react-native-google-mobile-ads';

// Initialize Google Mobile Ads SDK
export const mobileAdsInit = async () => {
  try {
    // Skip initialization on web platform
    if (Platform.OS === 'web') {
      console.log('Mobile ads not supported on web platform');
      return;
    }

    // Initialize the Google Mobile Ads SDK
    await MobileAds().initialize();

    // Configure ad content rating
    await MobileAds().setRequestConfiguration({
      // Set max ad content rating
      maxAdContentRating: MaxAdContentRating.PG,
      // Specify if ads should be for children
      tagForChildDirectedTreatment: false,
      // Specify if ads should be for users under the age of consent
      tagForUnderAgeOfConsent: false,
      // Request non-personalized ads only
      testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
    });

    console.log('Mobile Ads SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mobile Ads SDK:', error);
  }
};