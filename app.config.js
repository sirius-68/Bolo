// Adds over-the-air updates (EAS Update) when an Expo project is linked.
// Set the GitHub variable EAS_PROJECT_ID (and the secret EXPO_TOKEN) — see docs/UPDATES.md.
module.exports = ({ config }) => {
  const id = process.env.EAS_PROJECT_ID;
  if (!id) return { ...config, updates: { enabled: false } };
  return {
    ...config,
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      url: `https://u.expo.dev/${id}`,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      requestHeaders: { 'expo-channel-name': 'production' },
    },
    extra: { ...(config.extra || {}), eas: { ...((config.extra || {}).eas || {}), projectId: id } },
  };
};
