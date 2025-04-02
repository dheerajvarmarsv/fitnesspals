import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CTP",
  slug: "ctp",
  version: "1.3",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "light",
  // Enable React Native's New Architecture (Fabric)
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#000000"
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.dheshadev.ctp",
    buildNumber: "1",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
      NSHealthShareUsageDescription: "This app requires access to your health data to track your fitness activities and provide personalized insights.",
      NSHealthUpdateUsageDescription: "This app requires access to your health data to track your fitness activities and provide personalized insights.",
      GADApplicationIdentifier: "ca-app-pub-6833157133488263~6430444881",
      SKAdNetworkItems: [
        {
          SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork"
        }
      ]
    },
    entitlements: {
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.access": []
    },
    googleServicesFile: "./GoogleService-Info.plist"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#000000"
    },
    package: "com.dheshadev.ctp",
    versionCode: 1,
    permissions: [
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.VIBRATE",
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_DISTANCE",
      "android.permission.health.READ_HEART_RATE",
      "android.permission.health.READ_EXERCISE",
      "android.permission.health.READ_SLEEP",
      "android.permission.health.READ_FLOORS_CLIMBED",
      "android.permission.health.READ_ACTIVE_CALORIES_BURNED"
    ],
    googleServicesFile: "./google-services.json"
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
      iosAppId: "ca-app-pub-6833157133488263~6430444881"
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
      "react-native-health",
      {
        isClinicalDataEnabled: false,
        healthSharePermission: "This app requires access to your health data to track your fitness activities and provide personalized insights.",
        healthUpdatePermission: "This app requires access to your health data to track your fitness activities and provide personalized insights."
      }
    ],
    "expo-notifications",
    "./androidManifestPlugin.js",
    [
      "react-native-google-mobile-ads",
      {
        android: {
          appId: "ca-app-pub-6833157133488263~9820424352"
        },
        ios: {
          appId: "ca-app-pub-6833157133488263~6430444881"
        }
      }
    ]
  ]
});