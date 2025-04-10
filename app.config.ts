import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CTP",
  slug: "ctp",
  version: "1.6",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "light",
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
    buildNumber: "2",
    // Merged into iOS Info.plist
    infoPlist: {
      UIBackgroundModes: [
        "remote-notification",
        "processing",
        "fetch"
      ],
      BGTaskSchedulerPermittedIdentifiers: [
        "com.dheshadev.ctp.healthkitprocessing",
        "com.dheshadev.ctp.healthkitfetch"
      ],
      NSHealthShareUsageDescription:
        "Allow CTPs to read your health data to track your activities including steps, calories, workouts, and more",
      NSHealthUpdateUsageDescription:
        "Allow CTPs to write your health data to track your activities",
      GADApplicationIdentifier: "ca-app-pub-6833157133488263~6430444881",
      UIRequiredDeviceCapabilities: [
        "arm64",
        "healthkit"
      ]
    },
    // Merged into the entitlements file
    entitlements: {
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.background-delivery": true,
      // If you need 'com.apple.developer.healthkit.access', uncomment below:
      "com.apple.developer.healthkit.access": []
    },
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
  plugins: [
    "expo-router",
    "react-native-google-mobile-ads",
    [
      "react-native-health",
      {
        isClinicalDataEnabled: false,
        healthSharePermission: "Allow CTPs to read your health data",
        healthUpdatePermission: "Allow CTPs to update your health data",
      },
    ],
    "./plugins/ios-healthkit-config",
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
          useFrameworks: "static",
          deploymentTarget: "15.1"
        }
      }
    ],
    "./androidManifestPlugin.js",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-6833157133488263~9820424352",
        iosAppId: "ca-app-pub-6833157133488263~6430444881",
        user_tracking_description: "This identifier will be used to deliver personalized ads to you.",
        delay_app_measurement_init: true,
        sk_ad_network_items: ["cstr6suwn9.skadnetwork"]
      }
    ],
    "expo-notifications"
  ],
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
  }
});