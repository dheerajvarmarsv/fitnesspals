import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, clearAuthStorage } from '../lib/supabase';
import { Platform } from 'react-native';
import { router } from 'expo-router';

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
  // No password field here, since your password flow already works
}

interface UserContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  clearSettings: () => Promise<void>;
  isOnline: boolean;
  hasLoadedInitialSettings: boolean;
  handleLogout: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  email: '',
  nickname: '',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
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

  useEffect(() => {
    // For web: track offline/online status
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
    // On mount, try to load user settings if we are online
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

  useEffect(() => {
    // Listen for auth state changes
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

  /**
   * Loads the user’s data from BOTH `profiles` and `profile_settings`.
   * Merges them into our local state so they persist on reload.
   */
  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1) Fetch basic profile info from the `profiles` table (email, nickname, avatar_url)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          email,
          nickname,
          avatar_url
        `)
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      // 2) Fetch additional settings from the `profile_settings` table
      const { data: settingsRow, error: settingsError } = await supabase
        .from('profile_settings')
        .select(`
          privacy_mode,
          use_kilometers,
          timezone,
          notification_settings
        `)
        .eq('id', user.id)
        .single();
      if (settingsError) throw settingsError;

      // 3) Parse the JSON column for notifications
      const defaultNotif = defaultSettings.notificationSettings;
      const loadedNotifs = settingsRow?.notification_settings || {};

      // 4) Merge everything into a single UserSettings object
      const updatedSettings: UserSettings = {
        email: profile?.email || defaultSettings.email,
        nickname: profile?.nickname || defaultSettings.nickname,
        avatarUrl: profile?.avatar_url || defaultSettings.avatarUrl,
        useKilometers: settingsRow?.use_kilometers ?? defaultSettings.useKilometers,
        timezone: settingsRow?.timezone || defaultSettings.timezone,
        privacyMode: (settingsRow?.privacy_mode as UserSettings['privacyMode'])
          ?? defaultSettings.privacyMode,
        notificationSettings: {
          challenges: loadedNotifs.challenges ?? defaultNotif.challenges,
          chat: loadedNotifs.chat ?? defaultNotif.chat,
          sync: loadedNotifs.sync ?? defaultNotif.sync,
          friends: loadedNotifs.friends ?? defaultNotif.friends,
          badges: loadedNotifs.badges ?? defaultNotif.badges,
        },
      };

      setSettings(updatedSettings);
      setHasLoadedInitialSettings(true);
    } catch (e) {
      console.error('Error loading settings:', e);
      setSettings(defaultSettings);
      setHasLoadedInitialSettings(true);
    }
  };

  /**
   * Clears settings in memory (used on sign-out).
   */
  const clearSettings = async () => {
    setSettings(defaultSettings);
    setHasLoadedInitialSettings(false);
  };

  /**
   * Handle logout: clear local settings, sign out from Supabase, then go to welcomescreen.
   */
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

  /**
   * Update user settings in state + in Supabase.
   *  - `email`, `nickname`, `avatarUrl` update the `profiles` table
   *  - `privacyMode`, `useKilometers`, `timezone`, `notificationSettings` update the `profile_settings` table
   */
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      if (!isOnline) {
        throw new Error('Cannot update settings while offline');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Merge new settings into the old
      const mergedSettings = { ...settings, ...newSettings };

      // Prepare two separate objects for updates
      const profileUpdates: Record<string, any> = {};
      const settingsUpdates: Record<string, any> = {};

      // Update profiles table fields
      if (newSettings.email !== undefined) {
        profileUpdates.email = newSettings.email;
      }
      if (newSettings.nickname !== undefined) {
        profileUpdates.nickname = newSettings.nickname.toLowerCase();
      }
      if (newSettings.avatarUrl !== undefined) {
        profileUpdates.avatar_url = newSettings.avatarUrl;
      }

      // Update profile_settings table fields
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

      // (A) Update `profiles` if needed
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);
        if (profileError) throw profileError;
      }

      // (B) Update `profile_settings` if needed
      if (Object.keys(settingsUpdates).length > 0) {
        const { error: settingsError } = await supabase
          .from('profile_settings')
          .update(settingsUpdates)
          .eq('id', user.id);
        if (settingsError) throw settingsError;
      }

      // Finally, update local state
      setSettings(mergedSettings);
    } catch (e) {
      console.error('Error updating settings:', e);
      throw e;
    }
  };

  return (
    <UserContext.Provider
      value={{
        settings,
        updateSettings,
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