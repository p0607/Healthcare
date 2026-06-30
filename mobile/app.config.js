const appJson = require('./app.json');

const buildProfile = process.env.EAS_BUILD_PROFILE || process.env.APP_VARIANT || '';
const isProductionBuild =
  buildProfile === 'production' ||
  (process.env.NODE_ENV === 'production' && !buildProfile);

/** Expo loads EXPO_PUBLIC_* into process.env when Metro starts. */
module.exports = {
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    usesCleartextTraffic: isProductionBuild ? false : appJson.expo.android?.usesCleartextTraffic,
  },
  extra: {
    ...(appJson.expo.extra || {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL,
    buildProfile,
    eas: {
      projectId: process.env.EAS_PROJECT_ID || appJson.expo.extra?.eas?.projectId,
    },
  },
};
