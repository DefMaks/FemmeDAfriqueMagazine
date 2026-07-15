const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

config.resolver.blockList = [
  /\.local\/.*/,
];

// Résolution des imports ESM de semver (semver/functions/*)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'semver/functions/satisfies') {
    return { filePath: require.resolve('semver/functions/satisfies'), type: 'sourceFile' };
  }
  if (moduleName === 'semver/functions/prerelease') {
    return { filePath: require.resolve('semver/functions/prerelease'), type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
