import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CTP",
  slug: "ctp",
  version: "1.4",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "light",
  // Enable React Native's New Architecture (Fabric)
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF"
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.dheshadev.ctp",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
      NSHealthShareUsageDescription: "CTP needs access to your health data to track your activities like steps, distance, and workouts. This data is used to monitor your progress in challenges and help you achieve your fitness goals. Your data is stored securely and is only used within the app.",
      NSHealthUpdateUsageDescription: "CTP needs permission to update your health data to accurately track your activities and ensure your challenge progress is up to date. This allows us to sync your fitness achievements and provide accurate statistics. Your data privacy and security are our top priority.",
      GADApplicationIdentifier: "ca-app-pub-6833157133488263~3762282463"
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#FFFFFF"
    },
    package: "com.dheshadev.ctp",
    permissions: [
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.VIBRATE",
      "android.permission.SCHEDULE_EXACT_ALARM"
    ],
    config: {
      googleMobileAdsAppId: "ca-app-pub-6833157133488263~9820424352"
    }
  },
  web: {
    bundler: "metro",
    favicon: "./assets/images/icon.png"
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "ace5179f-9d07-4a93-86cb-af3735bf01ef"
    },
    "react-native-google-mobile-ads": {
      androidAppId: "ca-app-pub-6833157133488263~9820424352",
      iosAppId: "ca-app-pub-6833157133488263~3762282463" 
    }
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 26,
          compileSdkVersion: 33,
          targetSdkVersion: 33,
          buildToolsVersion: "33.0.0"
        },
        ios: {
          useFrameworks: "static"
        }
      }
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-6833157133488263~9820424352",
        iosAppId: "ca-app-pub-6833157133488263~3762282463",
        user_tracking_description: "This identifier will be used to deliver personalized ads to you.",
        delay_app_measurement_init: true,
        sk_ad_network_items: [
          "cstr6suwn9.skadnetwork"
        ]
      }
    ],
    "expo-notifications"
  ]
});