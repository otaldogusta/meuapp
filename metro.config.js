const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow legacy deep imports like lodash/isEmpty used by some dependencies.
config.resolver.unstable_enablePackageExports = false;
config.resolver.extraNodeModules = {
  "lodash/isEmpty": require.resolve("lodash/isEmpty"),
};

module.exports = config;
