import { Platform } from 'react-native';

// Initialize Google Mobile Ads SDK
export const mobileAdsInit = async () => {
  try {
    // Skip initialization on web platform or in development
    if (Platform.OS === 'web' || __DEV__) {
      console.log('Mobile ads not initialized in development or web platform');
      return;
    }

    // In production, dynamically import the module to avoid errors in development
    const { MobileAds, MaxAdContentRating } = await import('react-native-google-mobile-ads');

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
      testDeviceIdentifiers: [],
    });

    console.log('Mobile Ads SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mobile Ads SDK:', error);
  }
};