import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { UserProvider, useUser } from '../components/UserContext';
import { ThemeProvider } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';

function RootLayoutNav() {
  const { hasLoadedInitialSettings } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hasLoadedInitialSettings) return;

    // Check if the user is logged in and has a nickname
    const checkAuthAndNickname = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

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
    checkAuthAndNickname().then(({ isLoggedIn, hasNickname }) => {
      const isAuthScreen = ['welcomescreen', 'login', 'signup', 'forgot-password', 'setup-nickname'].includes(segments[0] || '');

      if (isLoggedIn) {
        if (!hasNickname && segments[0] !== 'setup-nickname') {
          // If logged in but no nickname, go to nickname setup
          router.replace('/setup-nickname');
        } else if (hasNickname && isAuthScreen) {
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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    window.frameworkReady?.();
  }, []);

  return (
    <ThemeProvider>
      <UserProvider>
        <RootLayoutNav />
      </UserProvider>
    </ThemeProvider>
  );
}