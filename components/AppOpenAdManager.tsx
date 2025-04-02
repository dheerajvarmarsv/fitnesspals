import React, { useEffect, useRef, useState } from 'react';
import { Platform, AppState, View, ActivityIndicator } from 'react-native';
import mobileAds, {
  AppOpenAd,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

// Use test IDs in development and real IDs in production
const APP_OPEN_AD_ID = Platform.select({
  ios: __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-6833157133488263/3762282463',
  android: __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-6833157133488263/8962638250',
});

// Minimum time between ads (in milliseconds)
const MIN_INTERVAL_BETWEEN_ADS = 4 * 60 * 60 * 1000; // 4 hours

interface AppOpenAdManagerProps {
  children: React.ReactNode;
}

const AppOpenAdManager: React.FC<AppOpenAdManagerProps> = ({ children }) => {
  const appOpenAd = useRef<AppOpenAd | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastAdShowTimestamp = useRef<number>(0);
  const isLoadingAd = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadAd = async () => {
    if (isLoadingAd.current || !APP_OPEN_AD_ID) return;

    try {
      isLoadingAd.current = true;
      
      // Create a new app open ad instance
      const ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_ID, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['fitness', 'health', 'wellness'],
      });

      // Set up event listeners
      const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        console.log('App Open Ad loaded successfully');
        appOpenAd.current = ad;
        isLoadingAd.current = false;
      });

      const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('App Open Ad failed to load:', error);
        appOpenAd.current = null;
        isLoadingAd.current = false;
      });

      const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('App Open Ad closed');
        appOpenAd.current = null;
        loadAd(); // Load the next ad
      });

      // Load the ad
      await ad.load();

      // Clean up event listeners
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeClosed();

    } catch (error) {
      console.error('Error loading app open ad:', error);
      appOpenAd.current = null;
      isLoadingAd.current = false;
      // Retry loading after a delay
      setTimeout(loadAd, 5000);
    }
  };

  const showAdIfAvailable = async () => {
    // Don't show ad if:
    // 1. No ad is available
    // 2. Less than minimum interval since last ad show (except on cold start)
    // 3. In development and it's a cold start
    const currentTime = Date.now();
    const isColdStart = lastAdShowTimestamp.current === 0;
    
    if (isColdStart && __DEV__) {
      console.log('Skipping app open ad on cold start in development');
      loadAd(); // Load ad for next time
      return;
    }

    if (!appOpenAd.current || 
        (!isColdStart && currentTime - lastAdShowTimestamp.current < MIN_INTERVAL_BETWEEN_ADS)) {
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
    } catch (error: any) {
      console.error('Error showing app open ad:', error?.message || error);
      loadAd(); // Try to load a new ad if showing failed
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAds = async () => {
      try {
        await mobileAds().initialize();
        if (isMounted) {
          setIsInitialized(true);
          console.log('Mobile ads SDK initialized');
          loadAd();
        }
      } catch (error) {
        console.error('Mobile ads SDK initialization failed:', error);
        if (isMounted) {
          setIsInitialized(true); // Still set to true to prevent infinite loading
        }
      }
    };

    initializeAds();

    // Set up app state change handler
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        showAdIfAvailable();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      isMounted = false;
      subscription.remove();
      if (appOpenAd.current) {
        appOpenAd.current = null;
      }
    };
  }, []);

  // Show loading indicator while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <View style={{ flex: 1 }}>{children}</View>;
};

export default AppOpenAdManager;