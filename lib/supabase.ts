import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your app.config.ts file.');
}

// Custom storage for persistSession
const ExpoSecureStorage = {
  getItem: (key: string) => {
    return Platform.OS !== 'web'
      ? SecureStore.getItemAsync(key)
      : AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return Platform.OS !== 'web'
      ? SecureStore.setItemAsync(key, value)
      : AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return Platform.OS !== 'web'
      ? SecureStore.deleteItemAsync(key)
      : AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** 
 * Clear any locally persisted Supabase session. 
 * Useful when manually logging out or resetting state. 
 */
export async function clearAuthStorage() {
  try {
    await ExpoSecureStorage.removeItem('supabase-session');
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
}

// Keep session in sync on sign-in/out
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    console.log('User signed in:', session.user?.email);
    await ExpoSecureStorage.setItem('supabase-session', JSON.stringify(session));
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    await ExpoSecureStorage.removeItem('supabase-session');
  }
});