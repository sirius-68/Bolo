// Builds one APK per CPU type (much smaller downloads) plus a universal APK.
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAbiSplits(config) {
  return withAppBuildGradle(config, (c) => {
    if (c.modResults.contents.includes('splits {')) return c;
    c.modResults.contents = c.modResults.contents.replace(
      /android\s*\{/,
      `android {
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a", "armeabi-v7a", "x86_64"
            universalApk true
        }
    }`,
    );
    return c;
  });
};
