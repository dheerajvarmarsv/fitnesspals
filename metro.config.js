const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  ...defaultConfig,
  // Reduce memory usage
  maxWorkers: 2,
  transformer: {
    ...defaultConfig.transformer,
    // Use react-native-svg-transformer for .svg files
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    minifierConfig: {
      compress: false,
      mangle: false
    }
  },
  resolver: {
    ...defaultConfig.resolver,
    // Remove 'svg' from assetExts and add it to sourceExts along with 'mjs'
    assetExts: defaultConfig.resolver.assetExts
      .filter(ext => ext !== 'svg')
      .concat(['db']),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs', 'svg'],
    // Properly handle platform-specific extensions
    platforms: ['ios', 'android', 'web'],
    // Override resolving to give platform-specific files priority
    resolveRequest: (context, moduleName, platform) => {
      // Allow custom resolver if provided
      if (defaultConfig.resolver.resolveRequest) {
        const resolution = defaultConfig.resolver.resolveRequest(
          context,
          moduleName,
          platform
        );
        if (resolution) {
          return resolution;
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    }
  }
};

module.exports = config;