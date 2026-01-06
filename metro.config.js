const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Allow legacy deep imports like lodash/isEmpty used by some dependencies.
config.resolver.unstable_enablePackageExports = false;
config.resolver.extraNodeModules = {
  "lodash/isEmpty": require.resolve("lodash/isEmpty"),
  "yoga-layout/load": require.resolve("yoga-layout/dist/src/load.js"),
};

module.exports = config;
