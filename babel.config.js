module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 compiles worklets via this plugin. It must stay last.
    plugins: ['react-native-worklets/plugin'],
  };
};
