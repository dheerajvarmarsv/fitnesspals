import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, clearAuthStorage } from '../lib/supabase';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

export interface UserSettings {
  email: string;
  nickname: string;
  avatarUrl: string;
  useKilometers: boolean;
  timezone: string;
  privacyMode: 'public' | 'friends' | 'private';
  notificationSettings: {
    challenges: boolean;
    chat: boolean;
    sync: boolean;
    friends: boolean;
    badges: boolean;
  };
}

interface UserContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearSettings: () => Promise<void>;
  isOnline: boolean;
  hasLoadedInitialSettings: boolean;
  handleLogout: () => Promise<void>;
}

const generateAvatarUrl = (nickname: string): string => {
  const nameToUse = nickname || 'User';
  const nicknameHash = nameToUse.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
  const colorHash = Math.abs(nicknameHash).toString(16).padStart(6, '0').substring(0, 6);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=${colorHash}&color=ffffff&bold=true`;
};

const defaultSettings: UserSettings = {
  email: '',
  nickname: '',
  avatarUrl: generateAvatarUrl(''),
  useKilometers: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  privacyMode: 'public',
  notificationSettings: {
    challenges: true,
    chat: true,
    sync: true,
    friends: true,
    badges: true,
  },
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isOnline, setIsOnline] = useState(true);
  const [hasLoadedInitialSettings, setHasLoadedInitialSettings] = useState(false);
  
  // Set up notification handling
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Dynamically import to prevent issues on web
      const importNotificationService = async () => {
        try {
          const { setupNotificationListeners } = await import('../lib/notificationService');
        
          // Handle received notifications in foreground
          const handleNotification = (notification: Notifications.Notification) => {
            console.log('Notification received in foreground:', notification.request.content);
          };
        
          // Handle notification responses (when tapped)
          const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
            const data = response.notification.request.content.data;
            console.log('Notification tapped:', data);
            
            // Navigate to the appropriate screen
            if (data?.screen) {
              try {
                router.push({
                  pathname: data.screen as string,
                  params: data.params || {}
                });
              } catch (error) {
                console.error('Error navigating from notification:', error);
              }
            }
          };
        
          // Set up notification listeners with our handler functions
          return setupNotificationListeners(
            handleNotification,
            handleNotificationResponse
          );
        } catch (error) {
          console.error('Error setting up notification listeners:', error);
          return () => {};
        }
      };
      
      // Initialize the listeners
      const cleanupPromise = importNotificationService();
      
      // Return cleanup function
      return () => {
        cleanupPromise.then(cleanup => cleanup());
      };
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const updateOnlineStatus = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, []);

  useEffect(() => {
    const initializeSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadUserSettings();
      } else {
        setHasLoadedInitialSettings(true);
      }
    };
    if (isOnline) {
      initializeSettings();
    }
  }, [isOnline]);
  
  // Add realtime subscription to profile changes
  useEffect(() => {
    const setupRealtimeListener = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isOnline) return () => {};
        
        // Subscribe to profile changes
        const channel = supabase.channel('profile-changes')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, (payload) => {
            console.log('Profile update detected:', payload);
            // Refresh user data when profile changes
            refreshUserProfile();
          })
          .subscribe();
        
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up realtime listener:', error);
        return () => {};
      }
    };
    
    // Only set up the listener when online and after initial settings loaded
    if (isOnline && hasLoadedInitialSettings) {
      const cleanup = setupRealtimeListener();
      return () => {
        cleanup.then(fn => fn && fn());
      };
    }
  }, [isOnline, hasLoadedInitialSettings]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSettings(defaultSettings);
          setHasLoadedInitialSettings(false);
          router.replace('/welcomescreen');
        } else if (event === 'SIGNED_IN' && session) {
          await loadUserSettings();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`email, nickname, avatar_url`)
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      const { data: settingsRow, error: settingsError } = await supabase
        .from('profile_settings')
        .select(`
          privacy_mode,
          use_kilometers,
          timezone,
          notification_settings,
          notifications_enabled,
          push_token
        `)
        .eq('id', user.id)
        .single();
      if (settingsError) throw settingsError;

      const defaultNotif = defaultSettings.notificationSettings;
      const loadedNotifs = settingsRow?.notification_settings || {};

      const userNickname = profile?.nickname || defaultSettings.nickname;

      const updatedSettings: UserSettings = {
        email: profile?.email || defaultSettings.email,
        nickname: userNickname,
        avatarUrl: generateAvatarUrl(userNickname),
        useKilometers: settingsRow?.use_kilometers ?? defaultSettings.useKilometers,
        timezone: settingsRow?.timezone || defaultSettings.timezone,
        privacyMode: (settingsRow?.privacy_mode as UserSettings['privacyMode']) || defaultSettings.privacyMode,
        notificationSettings: {
          challenges: settingsRow?.notifications_enabled && (loadedNotifs.challenges ?? defaultNotif.challenges),
          chat: settingsRow?.notifications_enabled && (loadedNotifs.chat ?? defaultNotif.chat),
          sync: settingsRow?.notifications_enabled && (loadedNotifs.sync ?? defaultNotif.sync),
          friends: settingsRow?.notifications_enabled && (loadedNotifs.friends ?? defaultNotif.friends),
          badges: settingsRow?.notifications_enabled && (loadedNotifs.badges ?? defaultNotif.badges),
        },
      };

      // Always attempt to register for push notifications on login/startup if we're on a device
      // This ensures we have the latest token even if the app is reinstalled
      if (Platform.OS !== 'web') {
        try {
          const { registerForPushNotifications } = await import('../lib/notificationService');
          // If notifications are enabled or we don't have a token yet, register
          if (settingsRow?.notifications_enabled || !settingsRow?.push_token) {
            console.log('Attempting to register for push notifications on app startup');
            registerForPushNotifications().catch(err => 
              console.error('Failed to register for push notifications:', err)
            );
          }
        } catch (err) {
          console.error('Error importing notification service:', err);
        }
      }

      setSettings(updatedSettings);
      setHasLoadedInitialSettings(true);
    } catch (e) {
      console.error('Error loading settings:', e);
      setSettings(defaultSettings);
      setHasLoadedInitialSettings(true);
    }
  };

  const clearSettings = async () => {
    if (settings.notificationSettings.challenges || settings.notificationSettings.friends) {
      try {
        const { unregisterFromPushNotifications } = await import('../lib/notificationService');
        await unregisterFromPushNotifications();
      } catch (error) {
        console.error('Error unregistering from push notifications during logout:', error);
      }
    }
    
    setSettings(defaultSettings);
    setHasLoadedInitialSettings(false);
  };

  const handleLogout = async () => {
    try {
      await clearAuthStorage();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await clearSettings();
      router.replace('/welcomescreen');
    } catch (error) {
      console.error('Error during logout:', error);
      await clearSettings();
      router.replace('/welcomescreen');
    }
  };

  const refreshUserProfile = async () => {
    try {
      await loadUserSettings();
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      if (!isOnline) {
        throw new Error('Cannot update settings while offline');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update local state IMMEDIATELY for better UX
      const mergedSettings = { ...settings, ...newSettings };
      setSettings(mergedSettings);

      const profileUpdates: Record<string, any> = {};
      const settingsUpdates: Record<string, any> = {};

      if (newSettings.email !== undefined) {
        profileUpdates.email = newSettings.email;
      }
      if (newSettings.nickname !== undefined) {
        const nickname = newSettings.nickname.toLowerCase();
        profileUpdates.nickname = nickname;
        const avatarUrl = generateAvatarUrl(nickname);
        profileUpdates.avatar_url = avatarUrl;
        newSettings.avatarUrl = avatarUrl;
      }

      if (newSettings.privacyMode !== undefined) {
        settingsUpdates.privacy_mode = newSettings.privacyMode;
      }
      if (newSettings.useKilometers !== undefined) {
        settingsUpdates.use_kilometers = newSettings.useKilometers;
      }
      if (newSettings.timezone !== undefined) {
        settingsUpdates.timezone = newSettings.timezone;
      }
      if (newSettings.notificationSettings !== undefined) {
        settingsUpdates.notification_settings = {
          ...settings.notificationSettings,
          ...newSettings.notificationSettings,
        };
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);
        if (profileError) throw profileError;
      }

      if (Object.keys(settingsUpdates).length > 0) {
        const { error: settingsError } = await supabase
          .from('profile_settings')
          .update(settingsUpdates)
          .eq('id', user.id);
        if (settingsError) throw settingsError;
      }
    } catch (e) {
      console.error('Error updating settings:', e);
      // Revert back to database values if the API update failed
      await refreshUserProfile();
      throw e;
    }
  };

  return (
    <UserContext.Provider
      value={{
        settings,
        updateSettings,
        refreshUserProfile,
        clearSettings,
        isOnline,
        hasLoadedInitialSettings,
        handleLogout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export { generateAvatarUrl };