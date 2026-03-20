module.exports = function (api) {
  const isTest = process.env.NODE_ENV === 'test';

  // Cache based on environment so switching between test/dev doesn't use stale config
  api.cache.invalidate(() => process.env.NODE_ENV);

  return {
    presets: [
      isTest
        // In test environment: standard babel-preset-expo without NativeWind JSX
        ? 'babel-preset-expo'
        // In dev/production: NativeWind JSX transform
        : ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // Only add nativewind/babel in non-test environments
      // (it's `react-native-css-interop/babel` under the hood and incompatible with jest)
      ...(!isTest ? ['nativewind/babel'] : []),
    ],
  };
};
