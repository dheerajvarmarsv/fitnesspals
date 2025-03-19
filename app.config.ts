import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CTP",
  slug: "ctp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
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
    bundleIdentifier: "com.yourcompany.ctp",
    deploymentTarget: "13.0"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#000000"
    },
    package: "com.yourcompany.ctp",
    minSdkVersion: 26,
    targetSdkVersion: 33,
    compileSdkVersion: 33,
    permissions: [
      "android.permission.HEALTH_READ",
      "android.permission.HEALTH_WRITE"
    ]
  },
  web: {
    bundler: "metro",
    favicon: "./assets/images/favicon.png",
    output: "single"
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "your-project-id"
    }
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 26,
          targetSdkVersion: 33,
          compileSdkVersion: 33
        },
        ios: {
          deploymentTarget: "13.0"
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
});