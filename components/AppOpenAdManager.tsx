import React, { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, View } from 'react-native';
import mobileAds, {
  AppOpenAd,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { mobileAdsInit } from '../lib/adInit';

// App Open Ad IDs - Update these with your ad unit IDs
const APP_OPEN_AD_UNIT_ID = Platform.select({
  ios: __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-6833157133488263/6430444881',
  android: __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-6833157133488263/9820424352',
  default: TestIds.APP_OPEN,
});

// Set a very short interval to ensure ads show on virtually every foreground/background transition
// 0 means show every time (no time restriction)
const MIN_INTERVAL_BETWEEN_ADS = 0; 

const AD_LOAD_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;

interface AppOpenAdManagerProps {
  children: React.ReactNode;
}

const AppOpenAdManager: React.FC<AppOpenAdManagerProps> = ({ children }) => {
  const appOpenAd = useRef<AppOpenAd | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const isLoadingAd = useRef(false);
  const retryCount = useRef(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isShowingAd = useRef(false);
  const isInitialized = useRef(false);
  const hasLoadedInitialAd = useRef(false);

  // Create ad request with optimized settings
  const createAdRequest = useCallback(() => {
    return {
      requestNonPersonalizedAdsOnly: __DEV__ ? false : true,
      keywords: ['fitness', 'health', 'wellness', 'sports', 'exercise'],
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
  }, []);

  const loadAd = useCallback(async () => {
    if (isLoadingAd.current || !APP_OPEN_AD_UNIT_ID || isShowingAd.current) {
      console.log('[AppOpenAd] Skip loading: already loading, showing, or no ad ID');
      return;
    }

    try {
      isLoadingAd.current = true;
      console.log('[AppOpenAd] Starting to load ad');
      
      // Create a new app open ad instance
      const ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID, createAdRequest());

      // Set up event listeners
      const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AppOpenAd] Ad loaded successfully');
        appOpenAd.current = ad;
        isLoadingAd.current = false;
        retryCount.current = 0;
        hasLoadedInitialAd.current = true;
        
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
      });

      const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('[AppOpenAd] Failed to load:', error);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        handleAdError();
      });

      const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AppOpenAd] Ad closed');
        isShowingAd.current = false;
        appOpenAd.current = null;
        // Immediately load next ad after showing
        loadAd();
      });

      // Set up timeout for ad loading
      loadTimeoutRef.current = setTimeout(() => {
        console.log('[AppOpenAd] Load timeout');
        handleAdError();
      }, AD_LOAD_TIMEOUT);

      // Load the ad
      console.log('[AppOpenAd] Calling ad.load()');
      await ad.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeError();
        unsubscribeClosed();
      };
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
    if (isShowingAd.current) {
      console.log('[AppOpenAd] Already showing an ad, skipping');
      return;
    }

    if (!appOpenAd.current) {
      console.log('[AppOpenAd] No ad available to show, loading a new one');
      loadAd();
      return;
    }

    try {
      console.log('[AppOpenAd] Attempting to show ad');
      isShowingAd.current = true;
      await appOpenAd.current.show();
      console.log('[AppOpenAd] Ad shown successfully');
    } catch (error) {
      console.error('[AppOpenAd] Error showing ad:', error);
      isShowingAd.current = false;
      appOpenAd.current = null;
      loadAd();
    }
  }, [loadAd]);

  // Initialize once on component mount
  useEffect(() => {
    if (isInitialized.current) return;
    
    const initialize = async () => {
      try {
        isInitialized.current = true;
        await mobileAdsInit();
        
        // Load the first ad immediately during startup
        loadAd();
      } catch (err) {
        console.error('[AppOpenAd] Initialization error:', err);
      }
    };
    
    if (Platform.OS !== 'web') {
      initialize();
    }
  }, [loadAd]);

  // Setup app state change handler
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Only try to show an ad when returning to the foreground
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active' &&
        Platform.OS !== 'web'
      ) {
        console.log('[AppOpenAd] App came to foreground, showing ad');
        showAdIfAvailable();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
      cleanupAd();
    };
  }, [showAdIfAvailable, cleanupAd]);

  return <View style={{ flex: 1 }}>{children}</View>;
};

export default AppOpenAdManager;