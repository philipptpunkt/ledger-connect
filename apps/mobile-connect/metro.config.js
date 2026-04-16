const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', '..', 'node_modules'),
  path.resolve(__dirname, '..', '..', 'node_modules', '.pnpm'),
];

const config = {
  projectRoot: __dirname,
  watchFolders: [path.resolve(__dirname, '..', '..')],
  resolver: {
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['browser', 'react-native', 'import', 'require'],
    resolverMainFields: [
      'browser',
      'react-native',
      'import',
      'require',
      'main',
    ],
    nodeModulesPaths,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
