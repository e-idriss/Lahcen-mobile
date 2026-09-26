const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The prebuilt Quran database ships as a bundled asset; Metro does not treat
// `.db` as an asset by default.
config.resolver.assetExts.push('db');

module.exports = config;
