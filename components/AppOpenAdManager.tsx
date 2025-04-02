import React, { useEffect, useRef } from 'react';
import { Platform, AppState, View } from 'react-native';
import mobileAds, {
  AppOpenAd,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

// Use test IDs in development and real IDs in production
const TEST_APP_OPEN_ID = TestIds.APP_OPEN;

const PRODUCTION_APP_OPEN_ID = Platform.select({
  ios: 'ca-app-pub-6833157133488263/3762282463',
  android: 'ca-app-pub-6833157133488263/8962638250',
  default: 'ca-app-pub-6833157133488263/3762282463',
});

const adUnitId = __DEV__ ? TEST_APP_OPEN_ID : PRODUCTION_APP_OPEN_ID;

interface AppOpenAdManagerProps {
  children: React.ReactNode;
}

const AppOpenAdManager: React.FC<AppOpenAdManagerProps> = ({ children }) => {
  const appOpenAd = useRef<AppOpenAd | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastAdShowTimestamp = useRef<number>(0);
  const isLoadingAd = useRef(false);

  const loadAd = async () => {
    if (isLoadingAd.current) return;

    try {
      isLoadingAd.current = true;
      
      // Create a new app open ad instance
      const ad = AppOpenAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['fitness', 'health', 'wellness'],
      });

      // Set up event listeners
      const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        console.log('App Open Ad loaded successfully');
        appOpenAd.current = ad;
      });

      const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('App Open Ad failed to load:', error);
        appOpenAd.current = null;
      });

      // Load the ad
      await ad.load();

      // Clean up event listeners
      unsubscribeLoaded();
      unsubscribeError();

    } catch (error) {
      console.error('Error loading app open ad:', error);
      appOpenAd.current = null;
    } finally {
      isLoadingAd.current = false;
    }
  };

  const showAdIfAvailable = async () => {
    // Don't show ad if:
    // 1. No ad is available
    // 2. Less than 4 hours since last ad show (except on cold start)
    // 3. In development and it's a cold start
    const currentTime = Date.now();
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    const isColdStart = lastAdShowTimestamp.current === 0;
    
    if (isColdStart && __DEV__) {
      console.log('Skipping app open ad on cold start in development');
      loadAd(); // Load ad for next time
      return;
    }

    if (!appOpenAd.current || 
        (!isColdStart && currentTime - lastAdShowTimestamp.current < fourHoursInMs)) {
      if (!appOpenAd.current) {
        loadAd();
      }
      return;
    }

    try {
      await appOpenAd.current.show();
      lastAdShowTimestamp.current = currentTime;
      appOpenAd.current = null; // Clear the reference after showing
      loadAd(); // Load the next ad
    } catch (error) {
      console.error('Error showing app open ad:', error);
      loadAd(); // Try to load a new ad if showing failed
    }
  };

  useEffect(() => {
    // Initialize mobile ads SDK
    mobileAds()
      .initialize()
      .then(() => {
        console.log('Mobile ads SDK initialized');
        loadAd();
      })
      .catch((error) => {
        console.error('Mobile ads SDK initialization failed:', error);
      });

    // Set up app state change handler
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        showAdIfAvailable();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (appOpenAd.current) {
        appOpenAd.current = null;
      }
    };
  }, []);

  return <View style={{ flex: 1 }}>{children}</View>;
};

export default AppOpenAdManager;