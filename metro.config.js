const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend (wa-sqlite) loads its WASM binary as an asset.
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './global.css' });
