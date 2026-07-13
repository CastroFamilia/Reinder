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
      // nativewind/babel returns { plugins: [...] } — it's a Babel preset, not a plugin.
      // Must be in presets[] (not plugins[]) to pass Babel's strict validation.
      ...(!isTest ? ['nativewind/babel'] : []),
    ],
    plugins: [
      // Reanimated plugin MUST be last — transforms worklets for UI thread execution (NFR2: 60fps)
      'react-native-reanimated/plugin',
    ],
  };
};
