import { LogBox } from 'react-native';

// Expo Go (SDK 53+) logs console.error on import — suppress so dev UI is not blocked.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '[expo-av]: Expo AV has been deprecated',
]);
