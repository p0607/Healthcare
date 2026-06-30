import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import {
  SOS_NOTIFICATION_CHANNEL_ID,
  SOS_SOCKET_EVENT,
  SOS_LEGACY_GUARDIAN_EVENT,
  sosAlertTitle,
  sosAlertBody,
} from '@nursecare/shared/sosAlert';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

let alarmSound = null;
let alarmPlaying = false;

export const SOS_SOCKET_EVENTS = [SOS_SOCKET_EVENT, SOS_LEGACY_GUARDIAN_EVENT];

/** Remote Expo push is unavailable in Expo Go on Android (SDK 53+). */
export function supportsExpoRemotePush() {
  return Constants.appOwnership !== 'expo';
}

/** Register Expo push token (dev/production builds only — not Expo Go). */
export async function registerExpoPushToken(apiClient) {
  if (!apiClient || !supportsExpoRemotePush()) return null;

  try {
    const granted = await requestEmergencyNotificationPermissions();
    if (!granted) return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.projectId;

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const pushToken = tokenResult?.data;
    if (pushToken) {
      await apiClient.post('/auth/me/push-token', { token: pushToken });
    }
    return pushToken || null;
  } catch {
    return null;
  }
}

export async function configureEmergencyNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SOS_NOTIFICATION_CHANNEL_ID, {
    name: 'Emergency SOS',
    description: 'High-priority alerts when a patient triggers SOS',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 600, 200, 600, 200, 600],
    lightColor: '#FF0000',
    sound: 'default',
    enableVibrate: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function requestEmergencyNotificationPermissions() {
  await configureEmergencyNotificationChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: true,
    },
  });
  return status === 'granted';
}

export async function stopEmergencyAlarm() {
  alarmPlaying = false;
  if (alarmSound) {
    try {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
    } catch {
      /* ignore */
    }
    alarmSound = null;
  }
}

/** Loud repeating tone while the app is open (notification sound also fires). */
export async function playEmergencyAlarm(durationMs = 12000) {
  if (alarmPlaying) return;
  alarmPlaying = true;
  Vibration.vibrate([0, 800, 400, 800, 400, 800, 400, 800], true);

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    /* ignore */
  }

  const started = Date.now();
  while (alarmPlaying && Date.now() - started < durationMs) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        {
          uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
        },
        { shouldPlay: true, volume: 1.0, isLooping: false }
      );
      alarmSound = sound;
      await new Promise((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status?.didJustFinish) resolve();
        });
        setTimeout(resolve, 1800);
      });
      await sound.unloadAsync();
      alarmSound = null;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  Vibration.cancel();
  alarmPlaying = false;
}

export async function presentEmergencyNotification(payload) {
  const title = sosAlertTitle(payload?.patientName);
  const body = sosAlertBody(payload);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      sticky: true,
      data: {
        type: 'patient_emergency',
        patientId: payload?.patientId,
        action: 'book_emergency',
      },
    },
    trigger: null,
    ...(Platform.OS === 'android' ? { channelId: SOS_NOTIFICATION_CHANNEL_ID } : {}),
  });
}

export async function handleIncomingSosPayload(payload, { playAlarm = true } = {}) {
  if (!payload?.patientId) return;
  await presentEmergencyNotification(payload);
  if (playAlarm) {
    playEmergencyAlarm().catch(() => {});
  }
}

export function extractEmergencyRouteParams(data) {
  if (!data || data.action !== 'book_emergency' || !data.patientId) return null;
  return { patientId: String(data.patientId) };
}
