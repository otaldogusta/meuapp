const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Allow package exports while keeping legacy deep imports mapped.
config.resolver.unstable_enablePackageExports = true;
config.resolver.extraNodeModules = {
  "lodash/isEmpty": require.resolve("lodash/isEmpty"),
  "yoga-layout/load": require.resolve("yoga-layout/load"),
};
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), "cjs"])
);

module.exports = config;
