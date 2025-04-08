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
      NSHealthShareUsageDescription: "Allow CTPs to read your health and fitness data for accurate activity tracking and insights.",
      NSHealthUpdateUsageDescription: "Allow CTPs to save your workouts and activities to Apple Health for a complete health profile.",
      GADApplicationIdentifier: "ca-app-pub-6833157133488263~6430444881",
      UIRequiredDeviceCapabilities: [
        "arm64",
        "healthkit"
      ]
    },
    entitlements: {
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.background-delivery": true,
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
   "./plugins/ios-healthkit-config/plugin",
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
        sk_ad_network_items: [
          "cstr6suwn9.skadnetwork"
        ]
      }
    ],
    [
      "react-native-health",
      {
        isClinicalDataEnabled: false,
        healthSharePermission: "Allow CTPs to read your health data",
        healthUpdatePermission: "Allow CTPs to update your health data",
      },
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