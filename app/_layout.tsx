import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { UserProvider, useUser } from '../components/UserContext';
import { ThemeProvider } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { mobileAdsInit } from '../lib/adInit';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import AppOpenAdManager from '../components/AppOpenAdManager';

// Add type declaration for window.frameworkReady
declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

interface AuthState {
  isLoggedIn: boolean;
  hasNickname: boolean;
}

function RootLayoutNav() {
  const { hasLoadedInitialSettings } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hasLoadedInitialSettings) return;

    // Check if the user is logged in and has a nickname
    const checkAuthAndNickname = async (): Promise<AuthState> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return {
            isLoggedIn: false,
            hasNickname: false
          };
        }

        // Check if user has a nickname
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', session.user.id)
          .single();

        return {
          isLoggedIn: true,
          hasNickname: !!profile?.nickname
        };
      } catch (e) {
        return {
          isLoggedIn: false,
          hasNickname: false
        };
      }
    };

    // Handle routing based on auth state
    checkAuthAndNickname().then((authState) => {
      const isAuthScreen = ['welcomescreen', 'login', 'signup', 'forgot-password', 'setup-nickname'].includes(segments[0] || '');

      if (authState.isLoggedIn) {
        if (!authState.hasNickname && segments[0] !== 'setup-nickname') {
          // If logged in but no nickname, go to nickname setup
          router.replace('/setup-nickname');
        } else if (authState.hasNickname && isAuthScreen) {
          // If logged in and has nickname but on auth screen, go to home
          router.replace('/(tabs)');
        }
      } else {
        // If not logged in and not on auth screen, go to welcome
        if (!isAuthScreen) {
          router.replace('/welcomescreen');
        }
      }
    });
  }, [hasLoadedInitialSettings, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcomescreen" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="setup-nickname" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {__DEV__ && <Stack.Screen name="debug" options={{ headerShown: false }} />}
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  
  // Initialize Google Mobile Ads
  useEffect(() => {
    if (Platform.OS !== 'web') {
      mobileAdsInit().catch(error => 
        console.error('Failed to initialize mobile ads:', error)
      );
    }
  }, []);

  useEffect(() => {
    // Initialize framework
    if (typeof window !== 'undefined' && window.frameworkReady) {
      window.frameworkReady();
    }
  }, []);

  return (
    <ThemeProvider>
      <UserProvider>
        <AppOpenAdManager>
          <RootLayoutNav />
        </AppOpenAdManager>
      </UserProvider>
    </ThemeProvider>
  );
}