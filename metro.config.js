const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

config.resolver.blockList = [
  /\.local\/.*/,
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'semver/functions/satisfies') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/semver/functions/satisfies.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'semver/functions/prerelease') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/semver/functions/prerelease.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
