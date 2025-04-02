import React, { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, View } from 'react-native';
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

// Constants for ad management
const MIN_INTERVAL_BETWEEN_ADS = 4 * 60 * 60 * 1000; // 4 hours
const AD_LOAD_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;

interface AppOpenAdManagerProps {
  children: React.ReactNode;
}

const AppOpenAdManager: React.FC<AppOpenAdManagerProps> = ({ children }) => {
  const appOpenAd = useRef<AppOpenAd | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastAdShowTimestamp = useRef<number>(0);
  const isLoadingAd = useRef(false);
  const retryCount = useRef(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isShowingAd = useRef(false);

  // Create ad request with optimized settings
  const createAdRequest = useCallback(() => {
    return {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['fitness', 'health', 'wellness', 'sports', 'exercise'],
      networkExtras: {
        // Add any additional network extras if needed
      },
    };
  }, []);

  const cleanupAd = useCallback(() => {
    if (appOpenAd.current) {
      appOpenAd.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    isLoadingAd.current = false;
    isShowingAd.current = false;
  }, []);

  const loadAd = useCallback(async () => {
    if (isLoadingAd.current || !APP_OPEN_AD_ID || isShowingAd.current) return;

    try {
      isLoadingAd.current = true;
      cleanupAd();

      // Create a new app open ad instance
      const ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_ID, createAdRequest());

      // Set up event listeners
      const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AppOpenAd] Ad loaded successfully');
        appOpenAd.current = ad;
        isLoadingAd.current = false;
        retryCount.current = 0;
      });

      const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('[AppOpenAd] Failed to load:', error);
        handleAdError();
      });

      const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AppOpenAd] Ad closed');
        isShowingAd.current = false;
        loadAd(); // Load next ad
      });

      // Set up timeout for ad loading
      loadTimeoutRef.current = setTimeout(() => {
        console.log('[AppOpenAd] Load timeout');
        handleAdError();
      }, AD_LOAD_TIMEOUT);

      // Load the ad
      await ad.load();

      // Clean up event listeners
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeClosed();

    } catch (error) {
      console.error('[AppOpenAd] Error loading ad:', error);
      handleAdError();
    }
  }, [createAdRequest, cleanupAd]);

  const handleAdError = useCallback(() => {
    cleanupAd();
    if (retryCount.current < MAX_RETRY_ATTEMPTS) {
      retryCount.current++;
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
      console.log(`[AppOpenAd] Retrying in ${retryDelay}ms (attempt ${retryCount.current}/${MAX_RETRY_ATTEMPTS})`);
      setTimeout(loadAd, retryDelay);
    } else {
      console.log('[AppOpenAd] Max retry attempts reached');
      retryCount.current = 0;
    }
  }, [loadAd, cleanupAd]);

  const showAdIfAvailable = useCallback(async () => {
    if (isShowingAd.current) return;

    const currentTime = Date.now();
    const isColdStart = lastAdShowTimestamp.current === 0;
    const timeSinceLastAd = currentTime - lastAdShowTimestamp.current;

    // Skip conditions
    if (isColdStart && __DEV__) {
      console.log('[AppOpenAd] Skipping on cold start in development');
      loadAd();
      return;
    }

    if (!appOpenAd.current || (!isColdStart && timeSinceLastAd < MIN_INTERVAL_BETWEEN_ADS)) {
      if (!appOpenAd.current) {
        loadAd();
      }
      return;
    }

    try {
      isShowingAd.current = true;
      await appOpenAd.current.show();
      lastAdShowTimestamp.current = currentTime;
      cleanupAd();
      loadAd(); // Preload next ad
    } catch (error) {
      console.error('[AppOpenAd] Error showing ad:', error);
      isShowingAd.current = false;
      loadAd();
    }
  }, [loadAd, cleanupAd]);

  useEffect(() => {
    let isMounted = true;

    // Initialize mobile ads SDK
    mobileAds()
      .initialize()
      .then(() => {
        if (isMounted) {
          console.log('[AppOpenAd] SDK initialized');
          loadAd();
        }
      })
      .catch((error) => {
        console.error('[AppOpenAd] SDK initialization failed:', error);
      });

    // Set up app state change handler
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (isMounted) {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
          showAdIfAvailable();
        }
        appStateRef.current = nextAppState;
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
      cleanupAd();
    };
  }, [loadAd, showAdIfAvailable, cleanupAd]);

  return <View style={{ flex: 1 }}>{children}</View>;
};

export default AppOpenAdManager;