/**
 * Session persistence for the mobile app.
 *
 * - The auth TOKEN is sensitive, so it lives in expo-secure-store
 *   (iOS Keychain / Android Keystore), never plain storage.
 * - The cached USER object is larger and non-secret, so it lives in
 *   AsyncStorage (SecureStore has a small size limit).
 *
 * This is the mobile equivalent of the web app's localStorage usage in
 * frontend/src/lib/api.js + AuthContext.jsx.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'nc_token';
const USER_KEY = 'nc_user';

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token) {
  if (!token) return;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    /* ignore write failures */
  }
}

export async function deleteToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function getCachedUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedUser(user) {
  try {
    if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

/** Wipe everything on logout or a 401. */
export async function clearSession() {
  await Promise.all([deleteToken(), saveCachedUser(null)]);
}
