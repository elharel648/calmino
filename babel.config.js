module.exports = function (api) {
  api.cache(true);

  const plugins = ['react-native-reanimated/plugin'];

  // Strip console logs in production builds
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: plugins,
  };
};