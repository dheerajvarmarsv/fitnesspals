import mobileAds from 'react-native-google-mobile-ads';

export const mobileAdsInit = async () => {
  try {
    if (!mobileAds().isInitialized) {
      console.log('Initializing Mobile Ads SDK...');
      const result = await mobileAds().initialize();
      console.log('Mobile Ads SDK initialized successfully');
      return result;
    } else {
      console.log('Mobile Ads SDK already initialized');
      return true;
    }
  } catch (error) {
    console.error('Failed to initialize Mobile Ads SDK:', error);
    throw error;
  }
};