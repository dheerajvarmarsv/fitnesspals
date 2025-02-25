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
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs', 'svg']
  }
};

module.exports = config;